import time
import random
import threading
import sqlite3
import re
import os # 🚀 新增：处理本地文件系统
import requests # 🚀 新增：用于下载图片
from datetime import datetime
from typing import List
from concurrent.futures import ThreadPoolExecutor, as_completed
from apscheduler.schedulers.background import BackgroundScheduler

# 🚀 新增引入 COVERS_DIR
from database import get_db_connection, COVERS_DIR
from scraper import get_request_headers, fetch_page_source, merge_analysis_results, fetch_profile_video_urls, scrape_homepage_dynamic_stats
from models import VIDEO_ID_REGEX, translate_to_zh

executor = ThreadPoolExecutor(max_workers=3) 
global_batch_executor = ThreadPoolExecutor(max_workers=1)

PROGRESS_STORE = {}
scheduler = BackgroundScheduler()

def process_video_urls(account_id: int, username: str, urls: List[str], is_single: bool = False, scraped_video_count: int = 0, progress_total: int = 0, progress_offset: int = 0, progress_prefix: str = "") -> bool:
    total = len(urls)
    if total == 0: return True
        
    act_total = progress_total if progress_total > 0 else total

    if not is_single: PROGRESS_STORE[account_id] = {"total": act_total, "current": progress_offset, "status": progress_prefix or "正在全速并发抓取中...", "done": False}
        
    try:
        req_hdrs = get_request_headers()
        processed_videos = []
        failed_vids = []
        c_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        progress_lock = threading.Lock()
        completed_count = 0
        
        def fetch_and_parse(target_url):
            try:
                time.sleep(random.uniform(0.1, 0.8))
                html = fetch_page_source(target_url, req_headers=req_hdrs)
                parsed = merge_analysis_results(target_url, html, c_timestamp, username)
                
                # 🚀 核心新增：利用多线程并发下载封面图片到本地
                if parsed and parsed[0].get("has_play_data"):
                    for row in parsed:
                        remote_cover = row.get("cover_url", "")
                        # 只有当抓取到了远程URL，且该地址不是我们生成的本地地址时，才进行下载
                        if remote_cover and not remote_cover.startswith("/api/covers/"):
                            # 创建每个账号专属的独立文件夹
                            acc_dir = os.path.join(COVERS_DIR, str(account_id))
                            os.makedirs(acc_dir, exist_ok=True)
                            
                            vid = row.get("video_id", "")
                            file_path = os.path.join(acc_dir, f"{vid}.jpg")
                            local_url = f"/api/covers/{account_id}/{vid}.jpg"
                            
                            # 如果本地不存在该封面，则发起下载请求
                            if not os.path.exists(file_path):
                                try:
                                    img_resp = requests.get(remote_cover, headers=req_hdrs, timeout=10)
                                    if img_resp.status_code == 200:
                                        with open(file_path, "wb") as f:
                                            f.write(img_resp.content)
                                        row["cover_url"] = local_url
                                except Exception as e:
                                    print(f"Cover download failed for {vid}: {e}")
                            else:
                                # 如果本地已经存在（比如曾经抓过），直接使用本地路径
                                row["cover_url"] = local_url

                return True, parsed, target_url, None
            except Exception as e:
                return False, [], target_url, str(e)
                
        with ThreadPoolExecutor(max_workers=5) as pool:
            futures = {pool.submit(fetch_and_parse, u): u for u in urls}
            for future in as_completed(futures):
                success, parsed_rows, url_val, error_msg = future.result()
                
                is_valid = success and parsed_rows and parsed_rows[0].get("has_play_data") is True
                
                with progress_lock:
                    completed_count += 1
                    if is_valid:
                        for row in parsed_rows:
                            raw_cat = row.get("商品类目名称", "")
                            if raw_cat:
                                parts = str(raw_cat).split('>')
                                last_part = parts[-1].strip()
                                clean_name = re.sub(r'\(\d+\)$', '', last_part).strip()
                                try:
                                    row["display_category"] = translate_to_zh(clean_name)
                                except Exception:
                                    row["display_category"] = clean_name
                            else:
                                row["display_category"] = "未知类目"
                        processed_videos.extend(parsed_rows)
                    else:
                        match = VIDEO_ID_REGEX.search(url_val)
                        if match:
                            failed_vids.append(match.group(1))

                    if not is_single:
                        status_str = f"{progress_prefix} ({progress_offset + completed_count}/{act_total})..." if progress_prefix else f"并发解析中 ({progress_offset + completed_count}/{act_total})..."
                        PROGRESS_STORE[account_id] = {"total": act_total, "current": progress_offset + completed_count, "status": status_str, "done": False}

        if not processed_videos:
            if not is_single and (progress_offset + total >= act_total):
                PROGRESS_STORE[account_id] = {"total": act_total, "current": act_total, "status": "遭遇风控拦截 (无有效数据)", "done": True}
            
            if failed_vids:
                conn = get_db_connection()
                cursor = conn.cursor()
                for f_vid in failed_vids:
                    create_ts = (int(f_vid) >> 32) if f_vid.isdigit() and len(f_vid) > 15 else int(time.time())
                    cursor.execute("UPDATE videos SET sync_status = 0 WHERE video_id = ?", (f_vid,))
                    if cursor.rowcount == 0:
                        try: 
                            cursor.execute("INSERT INTO videos (account_id, video_id, create_time, sync_status, pid, is_deleted) VALUES (?, ?, ?, 0, '', 0)", (account_id, f_vid, create_ts))
                        except Exception: 
                            pass
                conn.commit()
                conn.close()
            return False

        best_row = processed_videos[0]
        for r in processed_videos:
            if r.get("作者ID"): best_row = r; break
                
        account_stats_merged = {
            "nickname": best_row.get("作者名", username),
            "avatar_url": best_row.get("avatar_url", ""),
            "reg_time": best_row.get("注册时间", "未知") if best_row.get("注册时间") else "未知",
            "uid": best_row.get("作者ID", ""), 
            "follower_count": best_row.get("作者粉丝数", 0),
            "following_count": best_row.get("following_count", 0),
            "heart_count": best_row.get("heart_count", 0),
            "video_count": scraped_video_count if scraped_video_count > 0 else best_row.get("video_count", 0)
        }
        
        unique_videos = {v["video_id"]: v.get("播放量", 0) for v in processed_videos}
        total_plays = sum(unique_videos.values())
        total_pids = sum(1 for v in processed_videos if v.get("PID"))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        acc_info = cursor.execute("SELECT reg_time, created_at, uid FROM accounts WHERE id=?", (account_id,)).fetchone()
        existing_reg_time = acc_info['reg_time'] if acc_info and acc_info['reg_time'] else "未知"
        existing_created_at = acc_info['created_at'] if acc_info and acc_info['created_at'] else ""
        existing_uid = acc_info['uid'] if acc_info and acc_info['uid'] else ""
        
        final_reg_time = account_stats_merged["reg_time"]
        if not final_reg_time or final_reg_time == "未知":
            final_reg_time = existing_reg_time

        final_created_at = existing_created_at
        if not final_created_at:
            final_created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
        final_uid = account_stats_merged["uid"]
        if not final_uid:
            final_uid = existing_uid

        cursor.execute('''UPDATE accounts SET nickname=?, avatar_url=?, reg_time=?, created_at=?, uid=?, last_updated=datetime('now', 'localtime') WHERE id=?''', 
                       (account_stats_merged["nickname"], account_stats_merged["avatar_url"], final_reg_time, final_created_at, final_uid, account_id))
        
        cursor.execute('''INSERT INTO snapshots (account_id, follower_count, following_count, heart_count, video_count, play_count, pid_count, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))''', 
                       (account_id, account_stats_merged["follower_count"], account_stats_merged["following_count"], account_stats_merged["heart_count"], account_stats_merged["video_count"], total_plays, total_pids))

        sql_new = '''INSERT INTO videos (account_id, video_id, desc, create_time, duration, category, play_count, digg_count, comment_count, share_count, cover_url, platform_category, sub_label, vq_score, is_ai, video_type, pid, product_category, display_category, is_deleted, music_name, collect_count, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1) 
                ON CONFLICT(video_id, pid) DO UPDATE SET 
                play_count = excluded.play_count, 
                digg_count = excluded.digg_count, 
                comment_count = excluded.comment_count, 
                share_count = excluded.share_count, 
                collect_count = excluded.collect_count,
                cover_url = excluded.cover_url,
                pid = CASE WHEN excluded.pid != '' THEN excluded.pid ELSE videos.pid END,
                product_category = CASE WHEN excluded.product_category != '' THEN excluded.product_category ELSE videos.product_category END,
                display_category = CASE WHEN excluded.display_category != '' THEN excluded.display_category ELSE videos.display_category END,
                is_deleted = 0,
                sync_status = 1
        '''
        sql_old = '''INSERT INTO videos (account_id, video_id, desc, create_time, duration, category, play_count, digg_count, comment_count, share_count, cover_url, platform_category, sub_label, vq_score, is_ai, video_type, pid, product_category, display_category, is_deleted, music_name, collect_count, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1) 
                ON CONFLICT(video_id) DO UPDATE SET 
                play_count = excluded.play_count, 
                digg_count = excluded.digg_count, 
                comment_count = excluded.comment_count, 
                share_count = excluded.share_count, 
                collect_count = excluded.collect_count,
                cover_url = excluded.cover_url,
                pid = CASE WHEN excluded.pid != '' THEN excluded.pid ELSE videos.pid END,
                product_category = CASE WHEN excluded.product_category != '' THEN excluded.product_category ELSE videos.product_category END,
                display_category = CASE WHEN excluded.display_category != '' THEN excluded.display_category ELSE videos.display_category END,
                is_deleted = 0,
                sync_status = 1
        '''
        
        for v in processed_videos:
            # 🚀 核心修复：在插入成功数据之前，直接把数据库里该视频历史遗留的、sync_status=0 的报错空壳删掉，斩草除根！
            cursor.execute("DELETE FROM videos WHERE account_id = ? AND video_id = ? AND sync_status = 0", (account_id, v["video_id"]))
            
            params = (
                account_id, v["video_id"], v.get("desc", ""), v.get("create_ts", 0), v.get("视频时长(秒)", 0), "", 
                v.get("播放量", 0), v.get("点赞量", 0), v.get("评论数", 0), v.get("分享数", 0), v.get("cover_url", ""), 
                v.get("类目名称", ""), v.get("细分标签名称", ""), str(v.get("视频画质得分", "")), v.get("AI视频", "否"), 
                v.get("视频类型", "普通流量"), v.get("PID", ""), v.get("商品类目名称", ""), v.get("display_category", ""),
                v.get("音乐名称", ""), v.get("收藏数", 0)
            )
            try: cursor.execute(sql_new, params)
            except sqlite3.OperationalError: cursor.execute(sql_old, params)
                
            cursor.execute('''INSERT INTO video_snapshots (video_id, play_count, digg_count, comment_count, share_count, timestamp) 
                              VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))''', 
                           (v["video_id"], v.get("播放量", 0), v.get("点赞量", 0), v.get("评论数", 0), v.get("分享数", 0)))
        
        for f_vid in failed_vids:
            create_ts = (int(f_vid) >> 32) if f_vid.isdigit() and len(f_vid) > 15 else int(time.time())
            cursor.execute("UPDATE videos SET sync_status = 0 WHERE video_id = ?", (f_vid,))
            if cursor.rowcount == 0:
                try: 
                    cursor.execute("INSERT INTO videos (account_id, video_id, create_time, sync_status, pid, is_deleted) VALUES (?, ?, ?, 0, '', 0)", (account_id, f_vid, create_ts))
                except Exception: 
                    pass
              
        conn.commit()
        conn.close()
        
        if not is_single and (progress_offset + total >= act_total):
            PROGRESS_STORE[account_id] = {"total": act_total, "current": act_total, "status": "数据聚合入库完成！", "done": True}
        
        return True
    except Exception as e:
        if not is_single: PROGRESS_STORE[account_id] = {"total": act_total, "current": 0, "status": "并发解析系统发生故障", "done": True}
        return False

def update_account_data_initial(account_id: int, username: str):
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT type FROM accounts WHERE id = ?", (account_id,)).fetchone()
    settings = dict(conn.cursor().execute("SELECT key, value FROM settings").fetchall())
    conn.close()
    limit_key = 'internal_scrape_video_limit' if acc and acc['type'] == 'internal' else 'external_scrape_video_limit'
    scrape_limit = int(settings.get(limit_key) or 30)

    PROGRESS_STORE[account_id] = {"total": scrape_limit, "current": 0, "status": "重型初始化：正在深度抓取账号全量数据...", "done": False}
    urls, playlist_count = fetch_profile_video_urls(username, limit=scrape_limit)
    if urls: process_video_urls(account_id, username, urls, scraped_video_count=playlist_count)
    else: PROGRESS_STORE[account_id] = {"total": scrape_limit, "current": scrape_limit, "status": "账号暂无有效视频", "done": True}

def refresh_existing_videos(account_id: int, limit: int = 30):
    PROGRESS_STORE[account_id] = {"total": limit, "current": 0, "status": "准备连接作者主页...", "done": False}
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT username FROM accounts WHERE id = ?", (account_id,)).fetchone()
    if not acc: 
        conn.close(); return
    username = acc['username']
    deleted_rows = conn.cursor().execute("SELECT video_id FROM videos WHERE account_id = ? AND is_deleted = 1", (account_id,)).fetchall()
    deleted_vids = {row['video_id'] for row in deleted_rows}
    conn.close()

    PROGRESS_STORE[account_id] = {"total": limit, "current": 0, "status": "手工触发更新：正在深度抓取主页视频列表...", "done": False}
    vids_data_urls, playlist_count = fetch_profile_video_urls(username, limit=limit + len(deleted_vids)) 
    
    valid_urls = []
    for url in vids_data_urls:
        match = VIDEO_ID_REGEX.search(url)
        if match:
            vid = match.group(1)
            if vid not in deleted_vids: valid_urls.append(url)
            if limit > 0 and len(valid_urls) >= limit: break
            
    if valid_urls: process_video_urls(account_id, username, valid_urls, scraped_video_count=playlist_count)
    else: PROGRESS_STORE[account_id] = {"total": limit, "current": limit, "status": "暂无需要更新的新鲜数据", "done": True}

def daily_scheduled_account_update(account_id: int) -> bool:
    conn = get_db_connection()
    acc = conn.cursor().execute("SELECT username, type FROM accounts WHERE id = ?", (account_id,)).fetchone()
    if not acc:
        conn.close()
        return True
    username = acc['username']

    settings = dict(conn.cursor().execute("SELECT key, value FROM settings").fetchall())
    limit_key = 'internal_scrape_video_limit' if acc['type'] == 'internal' else 'external_scrape_video_limit'
    scrape_limit = int(settings.get(limit_key) or 30)

    deleted_rows = conn.cursor().execute("SELECT video_id FROM videos WHERE account_id = ? AND is_deleted = 1", (account_id,)).fetchall()
    deleted_vids = {row['video_id'] for row in deleted_rows}

    existing_rows = conn.cursor().execute("SELECT video_id FROM videos WHERE account_id = ? AND is_deleted = 0", (account_id,)).fetchall()
    active_old_vids = {row['video_id'] for row in existing_rows}
    conn.close()

    target_url = f"https://www.tiktok.com/@{username}"
    req_hdrs = get_request_headers()

    try:
        html = fetch_page_source(target_url, req_headers=req_hdrs)
        home_videos = scrape_homepage_dynamic_stats(html)
    except Exception as e:
        return False 
    
    if not home_videos:
        return False

    home_videos = home_videos[:scrape_limit]

    new_urls = []
    old_videos_to_update = []
    
    for v in home_videos:
        vid = v["video_id"]
        if vid in deleted_vids:
            continue
            
        if vid in active_old_vids:
            old_videos_to_update.append(v)
        else:
            new_urls.append(f"https://www.tiktok.com/@{username}/video/{vid}")

    success_all = True
    current_offset = 0
    total_tasks = len(new_urls) + len(old_videos_to_update)

    if total_tasks == 0:
        PROGRESS_STORE[account_id] = {"total": 100, "current": 100, "status": "主页数据均已是最新的，轻量级扫街完成", "done": True}
        return True

    if old_videos_to_update:
        current_status = PROGRESS_STORE.get(account_id, {}).get("status", "")
        prefix = "轻量级快刷进行中" if "极速抓取" in current_status else "风控重试快刷中"
        
        PROGRESS_STORE[account_id] = {"total": total_tasks, "current": 0, "status": f"轻扫街: 正在安全更新 {len(old_videos_to_update)} 个老视频数据...", "done": False}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            for v in old_videos_to_update:
                cursor.execute('''
                    UPDATE videos 
                    SET play_count = MAX(play_count, ?),
                        digg_count = MAX(digg_count, ?),
                        comment_count = MAX(comment_count, ?),
                        share_count = MAX(share_count, ?),
                        collect_count = MAX(collect_count, ?),
                        sync_status = 1
                    WHERE video_id = ?
                ''', (v["play_count"], v["digg_count"], v["comment_count"], v["share_count"], v["collect_count"], v["video_id"]))
                
                cursor.execute('''
                    INSERT INTO video_snapshots (video_id, play_count, digg_count, comment_count, share_count, timestamp) 
                    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
                ''', (v["video_id"], v["play_count"], v["digg_count"], v["comment_count"], v["share_count"]))
            conn.commit()
        except Exception as e:
            conn.rollback()
            success_all = False
        finally:
            conn.close()
        current_offset += len(old_videos_to_update)

    if new_urls:
        PROGRESS_STORE[account_id] = {"total": total_tasks, "current": current_offset, "status": f"发现 {len(new_urls)} 个新作品，移交重型分析池...", "done": False}
        res = process_video_urls(account_id, username, new_urls, is_single=False, scraped_video_count=0, progress_total=total_tasks, progress_offset=current_offset, progress_prefix="新作品深挖")
        if not res: success_all = False

    if success_all:
        PROGRESS_STORE[account_id] = {"total": total_tasks, "current": total_tasks, "status": "日常轻量级扫街任务圆满完成！", "done": True}
        
    return success_all

def _run_global_update_multi_round(accounts):
    max_rounds = 5
    current_round = 1
    pending_accounts = accounts

    while current_round <= max_rounds and pending_accounts:
        failed_accounts = []
        for acc in pending_accounts:
            acc_id = acc["id"]
            if current_round == 1:
                PROGRESS_STORE[acc_id] = {"total": 100, "current": 0, "status": "第1轮轻量级极速扫街中...", "done": False}
            else:
                PROGRESS_STORE[acc_id] = {"total": 100, "current": 0, "status": f"第{current_round}轮风控重试排队中...", "done": False}

        with ThreadPoolExecutor(max_workers=5) as pool:
            future_to_acc = {pool.submit(daily_scheduled_account_update, acc["id"]): acc for acc in pending_accounts}
            for future in as_completed(future_to_acc):
                acc = future_to_acc[future]
                try:
                    is_success = future.result()
                    if not is_success:
                        failed_accounts.append(acc)
                except Exception as e:
                    failed_accounts.append(acc)

        if not failed_accounts:
            break
            
        pending_accounts = failed_accounts
        current_round += 1
        
        if current_round <= max_rounds:
            for acc in pending_accounts:
                 PROGRESS_STORE[acc["id"]] = {"total": 100, "current": 0, "status": f"遭遇风控，冷却IP准备第{current_round}轮重试...", "done": False}
            time.sleep(random.uniform(20.0, 30.0))

    for acc in pending_accounts:
        PROGRESS_STORE[acc["id"]] = {"total": 100, "current": 100, "status": "❌ 连续5轮触发风控，更新失败", "done": True}

def scheduled_update_all():
    conn = get_db_connection()
    accounts = conn.cursor().execute("SELECT id FROM accounts WHERE status = 'active'").fetchall()
    conn.close()

    if not accounts: return

    for acc in accounts:
        PROGRESS_STORE[acc["id"]] = {"total": 100, "current": 0, "status": "已加入全局并发列车...", "done": False}
        
    global_batch_executor.submit(_run_global_update_multi_round, accounts)

# 🚀 新增：支持独立设置的每小时自动巡更函数
def scheduled_hourly_account_update():
    conn = get_db_connection()
    settings = dict(conn.cursor().execute("SELECT key, value FROM settings").fetchall())
    
    int_on = settings.get('auto_update_internal_hourly') == '1'
    ext_on = settings.get('auto_update_external_hourly') == '1'
    
    if not int_on and not ext_on:
        conn.close()
        return
        
    types = []
    if int_on: types.append("'internal'")
    if ext_on: types.append("'external'")
    
    type_cond = f"type IN ({','.join(types)})"
    accounts = conn.cursor().execute(f"SELECT id FROM accounts WHERE status = 'active' AND auto_update = 1 AND {type_cond}").fetchall()
    conn.close()

    if not accounts: return

    for acc in accounts:
        PROGRESS_STORE[acc["id"]] = {"total": 100, "current": 0, "status": "每小时自动抓取任务运行中...", "done": False}
        
    global_batch_executor.submit(_run_global_update_multi_round, accounts)


def retry_all_failed_videos():
    conn = get_db_connection()
    c = conn.cursor()
    rows = c.execute('''
        SELECT a.id, a.username, v.video_id 
        FROM videos v 
        JOIN accounts a ON v.account_id = a.id 
        WHERE v.sync_status = 0 AND a.status = 'active' AND (v.is_deleted = 0 OR v.is_deleted IS NULL)
    ''').fetchall()
    conn.close()
    if not rows: return
    
    from collections import defaultdict
    acc_map = defaultdict(list)
    for r in rows:
        acc_map[(r['id'], r['username'])].append(f"https://www.tiktok.com/@{r['username']}/video/{r['video_id']}")
    
    for (acc_id, username), urls in acc_map.items():
        PROGRESS_STORE[acc_id] = {"total": len(urls), "current": 0, "status": f"进入排队: 准备重试 {len(urls)} 个失败视频...", "done": False}
        
    def _run_retry():
        for (acc_id, username), urls in acc_map.items():
            current_offset = 0
            PROGRESS_STORE[acc_id] = {"total": len(urls), "current": 0, "status": f"开始全局重试 {len(urls)} 个失败视频...", "done": False}
            for i in range(0, len(urls), 20):
                batch = urls[i:i+20]
                process_video_urls(acc_id, username, batch, is_single=False, progress_total=len(urls), progress_offset=current_offset, progress_prefix="全局重试失败视频")
                current_offset += len(batch)
                time.sleep(random.uniform(2.0, 4.0))
                
    global_batch_executor.submit(_run_retry)

def scheduled_24h_video_updater():
    conn = get_db_connection()
    settings = dict(conn.cursor().execute("SELECT key, value FROM settings").fetchall())
    
    int_on = settings.get('auto_update_internal_hourly') == '1'
    ext_on = settings.get('auto_update_external_hourly') == '1'
    
    if not int_on and not ext_on:
        conn.close()
        return
        
    types = []
    if int_on: types.append("'internal'")
    if ext_on: types.append("'external'")
    
    type_cond = f"a.type IN ({','.join(types)})"
    
    c = conn.cursor()
    stale_videos = c.execute(f'''
        SELECT v.video_id, a.id as account_id, a.username 
        FROM videos v 
        JOIN accounts a ON v.account_id = a.id 
        WHERE v.is_deleted = 0 AND a.status = 'active' AND a.auto_update = 1 AND {type_cond}
        AND v.create_time > 1420070400 
        AND NOT EXISTS (
            SELECT 1 FROM video_snapshots vs 
            WHERE vs.video_id = v.video_id 
            AND vs.timestamp >= datetime(v.create_time + ((CAST(strftime('%s', 'now') AS INTEGER) - v.create_time) / 86400) * 86400, 'unixepoch', 'localtime')
        )
    ''').fetchall()
    conn.close()
    
    if not stale_videos: return
    
    from collections import defaultdict
    acc_map = defaultdict(list)
    for row in stale_videos: 
        acc_map[(row['account_id'], row['username'])].append(f"https://www.tiktok.com/@{row['username']}/video/{row['video_id']}")
        
    for (acc_id, username), urls in acc_map.items():
        for i in range(0, len(urls), 20):
            process_video_urls(acc_id, username, urls[i:i+20], is_single=True)
            time.sleep(15)

if not scheduler.running:
    scheduler.start()
    scheduler.add_job(scheduled_24h_video_updater, 'interval', minutes=60)
    scheduler.add_job(scheduled_hourly_account_update, 'cron', minute=0)