import sqlite3
import re
import os # 🚀 新增
import shutil # 🚀 新增，用于递归删除整个账号文件夹
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
# 🚀 新增导入 COVERS_DIR
from database import get_db_connection, COVERS_DIR
from models import (
    AccountCreate, AccountMetaUpdate, BatchMetaUpdateRequest, 
    BatchDeleteRequest, BatchGroupRequest, RefreshRequest, 
    AddVideoRequest, fill_zero_dates
)
from services import (
    executor, PROGRESS_STORE, update_account_data_initial, 
    refresh_existing_videos, process_video_urls
)

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

class PinUpdate(BaseModel):
    is_pinned: int

@router.get("")
def get_accounts(type: Optional[str] = None, status: Optional[str] = 'active'):
    conn = get_db_connection()
    # 🚀 在此提取出真正的 yesterday_video_count 代替平均数
    query = """
        SELECT a.*, 
           (SELECT follower_count FROM snapshots s WHERE s.account_id = a.id ORDER BY timestamp DESC LIMIT 1) as follower_count,
           (SELECT video_count FROM snapshots s WHERE s.account_id = a.id ORDER BY timestamp DESC LIMIT 1) as video_count,
           (SELECT COUNT(*) FROM videos v WHERE v.account_id = a.id AND (is_deleted=0 OR is_deleted IS NULL)) as real_video_count,
           (SELECT COUNT(*) FROM videos v WHERE v.account_id = a.id AND (is_deleted=0 OR is_deleted IS NULL) AND is_ai LIKE '%是%') as ai_video_count,
           (SELECT COUNT(*) FROM videos v WHERE v.account_id = a.id AND (is_deleted=0 OR is_deleted IS NULL) AND date(create_time, 'unixepoch', 'localtime') = date('now', '-1 day', 'localtime')) as yesterday_video_count,
           (SELECT COUNT(*) FROM videos v WHERE v.account_id = a.id AND (is_deleted=0 OR is_deleted IS NULL) AND sync_status = 0) as failed_video_count,
           (SELECT MIN(create_time) FROM videos v WHERE v.account_id = a.id AND create_time > 1420070400 AND (is_deleted=0 OR is_deleted IS NULL)) as first_video_time,
           (SELECT MAX(create_time) FROM videos v WHERE v.account_id = a.id AND create_time > 1420070400 AND (is_deleted=0 OR is_deleted IS NULL)) as last_video_time
        FROM accounts a WHERE a.status = ?
    """
    params = [status]
    if type and status != 'deleted':
        query += " AND a.type = ?"
        params.append(type)
    accounts = conn.cursor().execute(query + " ORDER BY a.last_updated DESC", params).fetchall()
    conn.close()
    res = []
    for row in accounts:
        d = dict(row)
        d['ai_video_count'] = d.get('ai_video_count') or 0
        d['failed_video_count'] = d.get('failed_video_count') or 0
        d['yesterday_video_count'] = d.get('yesterday_video_count') or 0
        res.append(d)
    return res

@router.post("")
def add_account(payload: AccountCreate):
    username = payload.username.strip()
    match = re.search(r"tiktok\.com/@([^/?]+)", username)
    if match: username = match.group(1)
    elif username.startswith('@'): username = username[1:]
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("INSERT INTO accounts (username, type, created_at) VALUES (?, ?, ?)", (username, payload.type, current_time))
        acc_id = cursor.lastrowid
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Account already exists")
    conn.close()
    PROGRESS_STORE[acc_id] = {"total": 0, "current": 0, "status": "后台任务指令派发中...", "done": False}
    executor.submit(update_account_data_initial, acc_id, username)
    return {"id": acc_id}

@router.put("/{id}/pin")
def update_account_pin(id: int, req: PinUpdate):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE accounts SET is_pinned = ? WHERE id = ?", (req.is_pinned, id))
    conn.commit()
    conn.close()
    return {"success": True}

@router.post("/batch/delete")
def batch_delete_accounts(req: BatchDeleteRequest):
    if not req.ids: return {"success": True}
    conn = get_db_connection()
    placeholders = ",".join("?" * len(req.ids))
    conn.cursor().execute(f"UPDATE accounts SET status = 'deleted', deleted_at = datetime('now', 'localtime') WHERE id IN ({placeholders})", req.ids)
    conn.commit()
    conn.close()
    return {"success": True}

@router.delete("/batch/hard_delete")
def batch_hard_delete_accounts(req: BatchDeleteRequest):
    if not req.ids: return {"success": True}
    conn = get_db_connection()
    placeholders = ",".join("?" * len(req.ids))
    conn.cursor().execute(f"DELETE FROM accounts WHERE id IN ({placeholders})", req.ids)
    conn.commit()
    conn.close()
    
    # 🚀 新增：当彻底清空账号数据时，一并把本地图片文件夹直接连锅端掉
    for acc_id in req.ids:
        dir_path = os.path.join(COVERS_DIR, str(acc_id))
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path, ignore_errors=True)
            
    return {"success": True}

@router.put("/batch/group")
def batch_update_group(req: BatchGroupRequest):
    if not req.ids: return {"success": True}
    conn = get_db_connection()
    placeholders = ",".join("?" * len(req.ids))
    params = [req.group_name] + req.ids
    conn.cursor().execute(f"UPDATE accounts SET group_name = ? WHERE id IN ({placeholders})", params)
    conn.commit()
    conn.close()
    return {"success": True}

@router.put("/batch/meta")
def batch_update_meta(req: BatchMetaUpdateRequest):
    if not req.ids: return {"success": True}
    conn = get_db_connection()
    placeholders = ",".join("?" * len(req.ids))
    
    updates = []
    params = []
    if req.group_name is not None:
        updates.append("group_name = ?")
        params.append(req.group_name)
    if req.country is not None:
        updates.append("country = ?")
        params.append(req.country)
    if req.mcn is not None:
        updates.append("mcn = ?")
        params.append(req.mcn)
    if req.created_at is not None:
        updates.append("created_at = ?")
        params.append(req.created_at)

    if not updates: return {"success": True}

    params.extend(req.ids)
    sql = f"UPDATE accounts SET {', '.join(updates)} WHERE id IN ({placeholders})"
    
    conn.cursor().execute(sql, params)
    conn.commit()
    conn.close()
    return {"success": True}

@router.put("/{id}/meta")
def update_account_meta(id: int, req: AccountMetaUpdate):
    conn = get_db_connection()
    # 🚀 将 device 和 auto_update 更新一并存库
    conn.cursor().execute("UPDATE accounts SET custom_name = ?, group_name = ?, country = ?, mcn = ?, created_at = ?, device = ?, auto_update = ? WHERE id = ?", (req.custom_name, req.group_name, req.country, req.mcn, req.created_at, req.device, req.auto_update, id))
    conn.commit()
    conn.close()
    return {"success": True}

@router.post("/{id}/delete")
def delete_account(id: int):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE accounts SET status = 'deleted', deleted_at = datetime('now', 'localtime') WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"success": True}

@router.post("/{id}/restore")
def restore_account(id: int):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE accounts SET status = 'active', deleted_at = NULL WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"success": True}

@router.delete("/{id}")
def permanent_delete_account(id: int):
    conn = get_db_connection()
    conn.cursor().execute("DELETE FROM accounts WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    
    # 🚀 新增：当彻底删除单个账号时，删除该账号对应的整包图片文件夹
    dir_path = os.path.join(COVERS_DIR, str(id))
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path, ignore_errors=True)
        
    return {"success": True}

@router.get("/{id}")
def get_account_details(id: int, days: int = Query(30)):
    conn = get_db_connection()
    acc = conn.cursor().execute("""
        SELECT *, 
        (SELECT COUNT(*) FROM videos v WHERE v.account_id = accounts.id AND (is_deleted=0 OR is_deleted IS NULL) AND sync_status = 0) as failed_video_count
        FROM accounts WHERE id = ?
    """, (id,)).fetchone()
    
    if not acc: raise HTTPException(status_code=404)
    snapshots = conn.cursor().execute("SELECT * FROM snapshots WHERE account_id = ? ORDER BY timestamp ASC", (id,)).fetchall()
    
    videos = conn.cursor().execute('''
        SELECT id, account_id, video_id, desc, create_time, duration, category, play_count, 
               digg_count, comment_count, share_count, cover_url, platform_category, 
               sub_label, vq_score, is_ai, video_type, music_name, collect_count, sync_status, GROUP_CONCAT(pid, ', ') as pid, 
               GROUP_CONCAT(product_category, ', ') as product_category 
        FROM videos 
        WHERE account_id = ? 
          AND (is_deleted = 0 OR is_deleted IS NULL) 
          AND (
              video_id IN (
                  SELECT video_id FROM videos 
                  WHERE account_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) 
                  ORDER BY create_time DESC LIMIT 100
              ) 
              OR sync_status = 0
          )
        GROUP BY video_id 
        ORDER BY sync_status ASC, create_time DESC
    ''', (id, id)).fetchall()
    
    date_cond = f"create_time > 1420070400 AND date(create_time, 'unixepoch', 'localtime') >= date('now', 'localtime', '-{days-1} days')" if days > 0 else "create_time > 1420070400"
    date_cond_ft = f"date(timestamp) >= date('now', 'localtime', '-{days} days')" if days > 0 else "1=1"
        
    play_trend_rows = conn.cursor().execute(f'''SELECT date(create_time, 'unixepoch', 'localtime') as date, SUM(play_count) as plays FROM videos WHERE account_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) AND {date_cond} GROUP BY date(create_time, 'unixepoch', 'localtime') ORDER BY date ASC''', (id,)).fetchall()
    play_trend = fill_zero_dates(play_trend_rows, days, "plays")

    ft_rows = conn.cursor().execute(f'''SELECT date(timestamp) as date, MAX(follower_count) as followers FROM snapshots WHERE account_id = ? AND {date_cond_ft} GROUP BY date(timestamp) ORDER BY date ASC''', (id,)).fetchall()
    follower_trend = []
    if len(ft_rows) == 1: follower_trend.append({"date": ft_rows[0]['date'], "followers_inc": 0, "followers": ft_rows[0]['followers']})
    elif len(ft_rows) > 1:
        for i in range(1, len(ft_rows)):
            prev = ft_rows[i-1]
            curr = ft_rows[i]
            follower_trend.append({"date": curr['date'], "followers_inc": curr['followers'] - prev['followers'], "followers": curr['followers']})
        if days == 0: follower_trend.insert(0, {"date": ft_rows[0]['date'], "followers_inc": 0, "followers": ft_rows[0]['followers']})
    
    conn.close()
    return {"account": dict(acc), "snapshots": [dict(s) for s in snapshots], "videos": [dict(v) for v in videos], "play_trend": play_trend, "follower_trend": follower_trend}

@router.post("/{id}/refresh")
def refresh_account(id: int, req: RefreshRequest):
    executor.submit(refresh_existing_videos, id, req.limit)
    return {"success": True}

@router.post("/{id}/add_video")
def add_manual_video(id: int, req: AddVideoRequest):
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT username FROM accounts WHERE id = ?", (id,)).fetchone()
    conn.close()
    if not acc: raise HTTPException(status_code=404, detail="Account not found")
    executor.submit(process_video_urls, id, acc['username'], [req.url.strip()], True)
    return {"success": True}

@router.post("/{id}/retry_failed")
def retry_account_failed_videos(id: int):
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT username FROM accounts WHERE id = ?", (id,)).fetchone()
    failed_vids = conn.cursor().execute("SELECT video_id FROM videos WHERE account_id = ? AND sync_status = 0 AND (is_deleted = 0 OR is_deleted IS NULL)", (id,)).fetchall()
    conn.close()
    
    if not acc or not failed_vids:
        return {"success": True, "count": 0}
        
    urls = [f"https://www.tiktok.com/@{acc['username']}/video/{v['video_id']}" for v in failed_vids]
    
    # 🚀 核心修复点：将这里的异步执行取消，改成同步阻塞调用！
    # 这样点击按钮后，前端的转圈圈会切实等待重试结束，完了之后会立刻重新拉取正确的数据
    process_video_urls(id, acc['username'], urls, is_single=True)
    
    return {"success": True, "count": len(urls)}

@router.get("/{id}/export")
def export_single_account(id: int):
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT * FROM accounts WHERE id=?", (id,)).fetchone()
    if not acc: raise HTTPException(status_code=404)
    videos = conn.cursor().execute('''SELECT v.*, a.username as account_username, a.custom_name, a.group_name, a.country FROM videos v JOIN accounts a ON v.account_id = a.id WHERE v.account_id = ? AND v.pid != '' AND (v.is_deleted = 0 OR v.is_deleted IS NULL)''', (id,)).fetchall()
    conn.close()
    return {"account": dict(acc), "videos": [dict(v) for v in videos]}

@router.get("/{id}/progress")
def get_account_progress(id: int): 
    return PROGRESS_STORE.get(id, {"total": 0, "current": 0, "status": "idle", "done": True})