import os # 🚀 新增导入 os
from typing import Optional
from fastapi import APIRouter, Query
# 🚀 新增导入 COVERS_DIR
from database import get_db_connection, COVERS_DIR
from models import BatchDeleteRequest, SingleRefreshRequest
from services import executor, process_video_urls

router = APIRouter(prefix="/api/videos", tags=["Videos"])

@router.get("/filter")
def get_filtered_videos(type: Optional[str] = None, filter_type: str = Query(...), filter_val: str = Query(...)):
    conn = get_db_connection()
    c = conn.cursor()
    query_acc = "SELECT id, username FROM accounts WHERE status = 'active'"
    params = []
    if type: query_acc += " AND type = ?"; params.append(type)
    acc_rows = c.execute(query_acc, params).fetchall()
    acc_ids = [row['id'] for row in acc_rows]
    username_map = {row['id']: row['username'] for row in acc_rows}
    
    if not acc_ids: return []
    placeholders = ",".join("?" * len(acc_ids))
    
    # 🚀 修复点3：在此处的 SQL 查询语句中增加了 sync_status 字段，使得前端能准确接收到失败状态并在列表里标红
    sql = f'''SELECT id, account_id, video_id, desc, create_time, duration, category, play_count, digg_count, comment_count, share_count, cover_url, platform_category, sub_label, vq_score, is_ai, video_type, music_name, collect_count, sync_status, GROUP_CONCAT(pid, ', ') as pid, GROUP_CONCAT(product_category, ', ') as product_category FROM videos WHERE account_id IN ({placeholders}) AND (is_deleted = 0 OR is_deleted IS NULL)'''
    if filter_type == 'date': sql += " AND date(create_time, 'unixepoch', 'localtime') = ?"
    elif filter_type == 'pid': sql += " AND pid = ?"
    elif filter_type == 'category': sql += " AND product_category = ?"
        
    params = acc_ids + [filter_val]
    videos = c.execute(sql + " GROUP BY video_id ORDER BY create_time DESC", params).fetchall()
    conn.close()
    
    result = []
    for v in videos:
        vd = dict(v)
        vd['username'] = username_map.get(vd['account_id'], '')
        result.append(vd)
    return result

@router.post("/batch/delete")
def batch_delete_videos(req: BatchDeleteRequest):
    if not req.ids: return {"success": True}
    conn = get_db_connection()
    placeholders = ",".join("?" * len(req.ids))
    conn.cursor().execute(f"UPDATE videos SET is_deleted = 1 WHERE id IN ({placeholders})", req.ids)
    conn.commit()
    conn.close()
    return {"success": True}

@router.post("/{video_id}/delete")
def soft_delete_video(video_id: str):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE videos SET is_deleted = 1 WHERE video_id = ?", (video_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@router.get("/deleted")
def get_deleted_videos():
    conn = get_db_connection()
    videos = conn.cursor().execute('''SELECT v.*, a.username as account_username FROM videos v LEFT JOIN accounts a ON v.account_id = a.id WHERE v.is_deleted = 1 GROUP BY v.video_id ORDER BY v.create_time DESC''').fetchall()
    conn.close()
    return [dict(v) for v in videos]

@router.get("/{video_id}/trend")
def get_video_trend(video_id: str, days: int = Query(30)):
    conn = get_db_connection()
    date_cond = f"date(timestamp) >= date('now', 'localtime', '-{days} days')" if days > 0 else "1=1"
    rows = conn.cursor().execute(f'''SELECT date(timestamp) as date, MAX(play_count) as plays, MAX(digg_count) as likes FROM video_snapshots WHERE video_id = ? AND {date_cond} GROUP BY date(timestamp) ORDER BY date ASC''', (video_id,)).fetchall()
    conn.close()
    if not rows: return []
    result = []
    if len(rows) == 1: return [{"date": rows[0]['date'], "plays": 0, "likes": 0}]
    for i in range(1, len(rows)):
        prev = rows[i-1]
        curr = rows[i]
        result.append({"date": curr['date'], "plays": curr['plays'] - prev['plays'], "likes": curr['likes'] - prev['likes']})
    if days == 0 and len(rows) > 1: result.insert(0, {"date": rows[0]['date'], "plays": 0, "likes": 0})
    return result

@router.post("/{video_id}/restore")
def restore_video(video_id: str):
    conn = get_db_connection()
    conn.cursor().execute("UPDATE videos SET is_deleted = 0 WHERE video_id = ?", (video_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@router.delete("/{video_id}")
def hard_delete_video(video_id: str):
    conn = get_db_connection()
    c = conn.cursor()
    # 先查出account_id，以便找到图片存放的文件夹
    video = c.execute("SELECT account_id FROM videos WHERE video_id = ?", (video_id,)).fetchone()
    c.execute("DELETE FROM videos WHERE video_id = ?", (video_id,))
    conn.commit()
    conn.close()
    
    # 🚀 新增：在彻底删除时（不是回收站软删），同步删除本地实体封面图片
    if video:
        cover_path = os.path.join(COVERS_DIR, str(video['account_id']), f"{video_id}.jpg")
        if os.path.exists(cover_path):
            try:
                os.remove(cover_path)
            except Exception:
                pass
                
    return {"success": True}

@router.post("/{video_id}/refresh_single")
def refresh_single_video(video_id: str, req: SingleRefreshRequest):
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT username FROM accounts WHERE id = ?", (req.account_id,)).fetchone()
    conn.cursor().execute("UPDATE videos SET is_deleted = 0 WHERE video_id = ?", (video_id,))
    conn.commit()
    conn.close()
    if acc:
        url = f"https://www.tiktok.com/@{acc['username']}/video/{video_id}"
        # 🚀 修复点1 & 2：取消后台异步执行（不再使用 executor.submit），改为同步阻塞调用。
        # 这样程序在请求期间会一直等待，前端也会保持“深度抓取中...”的加载动画，直到有了最新结果并落库才返回 success 给前端刷新数据。
        success = process_video_urls(req.account_id, acc['username'], [url], True)
        if not success:
             return {"success": False, "message": "单独刷新失败，未获取到视频播放量数据"}
    return {"success": True}

# 🚀 新增：一键清理发布超30天且播放量低于1000的视频
@router.post("/cleanup_low_play")
def cleanup_low_play_videos():
    conn = get_db_connection()
    cursor = conn.cursor()
    # 当前时间减去发布时间大于 2592000秒 (30天) 且 播放量 < 1000
    cursor.execute('''
        UPDATE videos 
        SET is_deleted = 1 
        WHERE (CAST(strftime('%s', 'now') AS INTEGER) - create_time) > 2592000 
          AND play_count < 1000 
          AND (is_deleted = 0 OR is_deleted IS NULL)
    ''')
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return {"success": True, "deleted_count": deleted_count}