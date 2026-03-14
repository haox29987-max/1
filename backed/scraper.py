import re
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from config import CATEGORY_MAP, DIVERSIFICATION_MAP

def default_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }

def try_json_load(s):
    if not isinstance(s, str): return None
    t = s.strip()
    if not ((t.startswith("{") and t.endswith("}")) or (t.startswith("[") and t.endswith("]"))): return None
    try: return json.loads(t)
    except:
        try: return json.loads(t.replace('\\"', '"').replace("\\n", ""))
        except: return None

def collect_product_infos(obj, out):
    if isinstance(obj, dict):
        if "product_id" in obj:
            pid = str(obj.get("product_id"))
            if pid: out.add(pid)
        for v in obj.values(): collect_product_infos(v, out)
    elif isinstance(obj, list):
        for v in obj: collect_product_infos(v, out)
    elif isinstance(obj, str):
        maybe = try_json_load(obj)
        if maybe: collect_product_infos(maybe, out)

def extract_pid_from_html(html):
    pids = set()
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all("script"):
        content = (tag.string or "").strip()
        if not content: continue
        if "product_id" in content or "anchors" in content:
            collect_product_infos(content, pids)
    if not pids:
        for m in re.finditer(r'"product_id"\s*:\s*"?(\d{8,})"?', html):
            pids.add(m.group(1))
    return list(pids)

def walk_find_categorytype(obj):
    hits = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.lower() in ["categorytype", "category_type"]:
                if isinstance(v, (int, str)) and str(v).isdigit(): hits.append(int(v))
        hits.extend(walk_find_categorytype(v))
    elif isinstance(obj, list):
        for it in obj: hits.extend(walk_find_categorytype(it))
    return hits

def extract_embedded_json(html):
    soup = BeautifulSoup(html, "html.parser")
    for sid in ["SIGI_STATE", "__UNIVERSAL_DATA_FOR_REHYDRATION__", "__NEXT_DATA__"]:
        tag = soup.find("script", id=sid)
        if tag and tag.string:
            try: return json.loads(tag.string)
            except: pass
    m = re.search(r"SIGI_STATE\s*=\s*(\{.*?\})\s*;\s*</script>", html, re.S)
    if m:
        try: return json.loads(m.group(1))
        except: pass
    return None

def safe_int(x):
    try:
        if x is None: return 0
        if isinstance(x, bool): return int(x)
        if isinstance(x, int): return x
        if isinstance(x, float): return int(x)
        if isinstance(x, str):
            s = x.strip()
            if s == "": return 0
            if s.isdigit(): return int(s)
            m = re.search(r"(-?\d+)", s)
            if m: return int(m.group(1))
    except: return 0
    return 0

def _deep_get(d, path, default=None):
    cur = d
    for p in path:
        if isinstance(cur, dict):
            cur = cur.get(p, default)
        elif isinstance(cur, list) and isinstance(p, int) and 0 <= p < len(cur):
            cur = cur[p]
        else:
            return default
    return cur

def _first_present(*vals, default=None):
    for v in vals:
        if v is not None: return v
    return default

def safe_float(x):
    try:
        if x is None: return 0.0
        if isinstance(x, (int, float)): return float(x)
        if isinstance(x, str):
            s = x.strip()
            return float(s) if s else 0.0
    except: return 0.0
    return 0.0

def unix_to_str(ts):
    try:
        return datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d %H:%M:%S") if ts else ""
    except: return ""

def decode_snowflake_id(snowflake_id):
    try:
        if not snowflake_id: return ""
        id_int = int(snowflake_id)
        timestamp_sec = id_int >> 32
        return datetime.fromtimestamp(timestamp_sec).strftime("%Y-%m-%d %H:%M:%S")
    except: return ""

def extract_author_id(item):
    try:
        author = item.get("author") or item.get("authorInfo") or {}
        if isinstance(author, dict):
            author_id = author.get("id") or author.get("uid") or author.get("userId")
            if author_id: return str(author_id)
    except: pass
    return ""

def extract_video_quality_score(item):
    try:
        video = item.get("video") or {}
        if isinstance(video, dict):
            vq_score = video.get("VQScore")
            if vq_score is not None:
                score = safe_float(vq_score)
                return f"{score:.2f}" if score > 0 else ""
    except: pass
    return ""

def extract_ai_video_flag(item):
    try:
        aigc_type = item.get("aigcLabelType")
        if aigc_type is not None and safe_int(aigc_type) == 1: return "是"
    except: pass
    return "否"

def classify_video_type(item):
    if item.get("isAd") is True or str(item.get("isAd")).lower() == "true": return "广告"
    is_ec = item.get("isECVideo")
    if is_ec == 1 or is_ec is True or str(is_ec) == "1": return "电商/带货"
    if _deep_get(item, ["commerceInfo"]) is not None or _deep_get(item, ["itemInfos", "commerceInfo"]) is not None: return "电商/带货"
    return "普通流量"

def extract_author_name(item):
    author = item.get("author") or item.get("authorInfo") or {}
    if isinstance(author, dict): return _first_present(author.get("nickname"), author.get("uniqueId"), author.get("id"), default="")
    return _first_present(item.get("authorName"), item.get("author_name"), default="未知")

def extract_counts(item):
    stats = item.get("stats") or item.get("statistics") or item.get("statsV2") or {}
    if not isinstance(stats, dict): stats = {}
    play = safe_int(_first_present(stats.get("playCount"), stats.get("plays"), stats.get("viewCount"), default=0))
    digg = safe_int(_first_present(stats.get("diggCount"), stats.get("likes"), stats.get("likeCount"), default=0))
    comment = safe_int(_first_present(stats.get("commentCount"), stats.get("comments"), default=0))
    share = safe_int(_first_present(stats.get("shareCount"), stats.get("shares"), default=0))
    collect = safe_int(_first_present(stats.get("collectCount"), stats.get("favoriteCount"), stats.get("favouriteCount"), stats.get("favorites"), stats.get("collect"), default=0))
    return play, digg, comment, share, collect

def extract_author_followers(item):
    for k in ["authorStatsV2", "authorStats", "author_stats_v2", "author_stats"]:
        v = item.get(k)
        if isinstance(v, dict):
            for kk in ["followerCount", "followers", "fans", "fansCount"]:
                if v.get(kk) is not None: return safe_int(v.get(kk))
    author = item.get("author") or item.get("authorInfo") or {}
    if isinstance(author, dict):
        st = author.get("stats") or author.get("statsV2") or author.get("statistics") or {}
        if isinstance(st, dict):
            for kk in ["followerCount", "followers", "fans", "fansCount"]:
                if st.get(kk) is not None: return safe_int(st.get(kk))
    return 0

def extract_publish_time(item):
    ts = safe_int(_first_present(item.get("createTime"), item.get("create_time"), item.get("create_time_sec"), default=0))
    if ts == 0: ts = safe_int(_deep_get(item, ["video", "createTime"], 0))
    return unix_to_str(ts) or "未知"

def extract_duration(item):
    d = safe_int(_first_present(_deep_get(item, ["video", "duration"]), item.get("duration"), _deep_get(item, ["video", "durationMillis"]), item.get("durationMillis"), default=0))
    return d // 1000 if d > 10000 else d

def extract_music_name(item):
    music = item.get("music") or item.get("musicInfo") or item.get("sound") or {}
    if isinstance(music, dict):
        title = _first_present(music.get("title"), music.get("musicName"), music.get("name"), default="")
        author = _first_present(music.get("authorName"), music.get("artistName"), music.get("ownerHandle"), default="")
        if title and author: return f"{title} - {author}"
        return title or author or "原声"
    return _first_present(item.get("musicName"), item.get("music_title"), default="原声")

def extract_video_info(url):
    print(f"    🔍 [Meta] 正在抓取元数据: {url}")
    try:
        resp = requests.get(url, headers=default_headers(), timeout=15)
        html = resp.text
    except: return None

    data = extract_embedded_json(html)
    if not data: return None

    found_pids = extract_pid_from_html(html)
    pid_str = " | ".join(found_pids) if found_pids else "未找到 PID"

    vid = re.search(r"/video/(\d+)", url)
    vid = vid.group(1) if vid else ""
    item = {}
    item_module = data.get("ItemModule") or data.get("itemModule") or {}
    if vid and vid in item_module:
        item = item_module[vid]
    else:
        def dfs(o):
            if isinstance(o, dict):
                if str(o.get("id") or o.get("aweme_id") or "") == str(vid): return o
                for v in o.values():
                    res = dfs(v)
                    if res: return res
            elif isinstance(o, list):
                for v in o:
                    res = dfs(v)
                    if res: return res
            return None
        item = dfs(data) or {}

    cat_candidates = walk_find_categorytype(item) if item else walk_find_categorytype(data)
    cat_id = 0
    for c in cat_candidates:
        if c in CATEGORY_MAP:
            cat_id = c
            break
    if cat_id == 0 and cat_candidates: cat_id = cat_candidates[0]
    cat_name = CATEGORY_MAP.get(cat_id, "未知类目")

    div_id = safe_int(item.get("diversificationId") or item.get("diversification_id"))
    div_name = DIVERSIFICATION_MAP.get(div_id, "未知细分")

    # 全面统计数据提取
    play, digg, comment, share, collect = extract_counts(item)
    author_id = extract_author_id(item)

    return {
        "url": url,
        "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "author": extract_author_name(item),
        "author_id": author_id,
        "register_time": decode_snowflake_id(author_id),
        "fans": extract_author_followers(item),
        "publish_time": extract_publish_time(item),
        "desc": item.get("desc") or "",
        "music": extract_music_name(item),
        "category": cat_name, 
        "sub_tag": div_name,
        "product_id": pid_str,
        "video_type": classify_video_type(item),
        "duration": extract_duration(item),
        "vq_score": extract_video_quality_score(item),
        "ai_video": extract_ai_video_flag(item),
        "stats": {
            "play": play,
            "digg": digg,
            "comment": comment,
            "share": share,
            "collect": collect
        }
    }