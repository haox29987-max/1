import time
import re
from typing import Optional
from fastapi import APIRouter, Query
from database import get_db_connection
from models import fill_zero_dates, translate_to_zh

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/warnings")
def get_warnings(type: str = Query('normal')):
    conn = get_db_connection()
    c = conn.cursor()
    settings_rows = c.execute("SELECT key, value FROM settings").fetchall()
    settings = {row['key']: row['value'] for row in settings_rows}
    
    warn_normal = int(settings.get('warning_normal_play', 8000))
    warn_high = int(settings.get('warning_normal_high', 20000))
    growth_normal = int(settings.get('warning_growth_play', 1000))
    growth_high = int(settings.get('warning_growth_high', 3000))
    low_days = float(settings.get('warning_low_days', 2.0))
    low_play = int(settings.get('warning_low_play', 100))
    
    q = '''
        SELECT v.*, a.username as account_username, a.nickname, a.avatar_url, a.group_name, a.country, a.type as account_type,
               (SELECT play_count FROM video_snapshots vs 
                WHERE vs.video_id = v.video_id 
                AND vs.timestamp <= datetime('now', '-1 day', 'localtime') 
                ORDER BY vs.timestamp DESC LIMIT 1) as yesterday_plays
        FROM videos v
        JOIN accounts a ON v.account_id = a.id
        WHERE (v.is_deleted = 0 OR v.is_deleted IS NULL) AND a.status = 'active'
    '''
    videos_raw = c.execute(q).fetchall()
    
    results = []
    now_ts = int(time.time())
    for r in videos_raw:
        v = dict(r)
        play_count = int(v.get('play_count') or 0)
        yesterday_plays = int(v.get('yesterday_plays') or play_count)
        daily_growth = play_count - yesterday_plays
        
        v['daily_growth'] = daily_growth
        v['is_high_play'] = play_count >= warn_high
        v['is_high_growth'] = daily_growth >= growth_high
        
        create_time = int(v.get('create_time') or 0)
        days_since = (now_ts - create_time) / 86400.0 if create_time > 0 else 0
        
        if type == 'normal':
            if play_count >= warn_normal:
                results.append(v)
        elif type == 'growth':
            if daily_growth >= growth_normal:
                results.append(v)
        elif type == 'low':
            if days_since >= low_days and play_count <= low_play:
                results.append(v)
                
    conn.close()
    
    if type == 'normal':
        results.sort(key=lambda x: x['play_count'], reverse=True)
    elif type == 'growth':
        results.sort(key=lambda x: x['daily_growth'], reverse=True)
    else:
        results.sort(key=lambda x: x['create_time'], reverse=True)
        
    return results

@router.get("/dashboard/stats")
def get_dashboard_stats(type: Optional[str] = None, days: int = Query(30), group: Optional[str] = None, country: Optional[str] = None):
    conn = get_db_connection()
    c = conn.cursor()
    query_acc = "SELECT id FROM accounts WHERE status = 'active'"
    params = []
    if type:
        query_acc += " AND type = ?"
        params.append(type)
    if group and group != 'all':
        query_acc += " AND group_name = ?"
        params.append(group)
    if country and country != 'all':
        query_acc += " AND country = ?"
        params.append(country)
        
    acc_ids = [row['id'] for row in c.execute(query_acc, params).fetchall()]
    if not acc_ids: return {"trend": [], "ranking": [], "categoryRanking": []}
    placeholders = ",".join("?" * len(acc_ids))
    date_cond = f"create_time > 1420070400 AND date(create_time, 'unixepoch', 'localtime') >= date('now', 'localtime', '-{days-1} days')" if days > 0 else "create_time > 1420070400"
        
    trend_rows = c.execute(f'''SELECT date(create_time, 'unixepoch', 'localtime') as date, COUNT(pid) as count FROM videos WHERE account_id IN ({placeholders}) AND pid != '' AND (is_deleted = 0 OR is_deleted IS NULL) AND {date_cond} GROUP BY date(create_time, 'unixepoch', 'localtime') ORDER BY date ASC''', acc_ids).fetchall()
    trend = fill_zero_dates(trend_rows, days, "count")
    
    ranking = c.execute(f'''SELECT pid as nickname, COUNT(*) as count FROM videos WHERE account_id IN ({placeholders}) AND pid != '' AND (is_deleted = 0 OR is_deleted IS NULL) AND {date_cond} GROUP BY pid ORDER BY count DESC LIMIT 10''', acc_ids).fetchall()
    
    categoryRanking_raw = c.execute(f'''SELECT product_category as category, display_category, COUNT(*) as count FROM videos WHERE account_id IN ({placeholders}) AND product_category != '' AND (is_deleted = 0 OR is_deleted IS NULL) AND {date_cond} GROUP BY product_category ORDER BY count DESC LIMIT 10''', acc_ids).fetchall()
    
    cat_res = []
    need_commit = False 
    
    for r in categoryRanking_raw:
        d = dict(r)
        raw_display = d.get('display_category', '')
        
        if not raw_display or not re.search(r'[\u4e00-\u9fa5]', str(raw_display)):
            raw_cat = d.get('category', '')
            if raw_cat:
                parts = str(raw_cat).split('>')
                clean_name = re.sub(r'\(\d+\)$', '', parts[-1].strip()).strip()
                translated_name = translate_to_zh(clean_name) 
                d['display_category'] = translated_name
                
                c.execute("UPDATE videos SET display_category = ? WHERE product_category = ?", (translated_name, raw_cat))
                need_commit = True
            else:
                d['display_category'] = '未知类目'
        cat_res.append(d)

    if need_commit:
        conn.commit()

    conn.close()
    return {"trend": trend, "ranking": [dict(r) for r in ranking], "categoryRanking": cat_res}