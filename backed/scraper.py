import re
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Iterable
import requests
from bs4 import BeautifulSoup
import yt_dlp

from models import translate_to_zh, CATEGORY_MAP, DIVERSIFICATION_MAP, VIDEO_ID_REGEX, EXPORT_COLUMNS, _first_present, safe_int, safe_float, _deep_get

def get_request_headers() -> Dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache", "Pragma": "no-cache",
    }

def fetch_page_source(target_url: str, req_headers: Dict[str, str]) -> str:
    response = requests.get(target_url, headers=req_headers, timeout=12)
    response.raise_for_status()
    return response.text

def get_embedded_data(html_source: str) -> Optional[dict]:
    bs_soup = BeautifulSoup(html_source, "html.parser")
    sigi_tag = bs_soup.find("script", id="SIGI_STATE")
    if sigi_tag and sigi_tag.string:
        try: return json.loads(sigi_tag.string)
        except Exception: pass
    for sid_val in ["__UNIVERSAL_DATA_FOR_REHYDRATION__", "__NEXT_DATA__"]:
        scr_tag = bs_soup.find("script", id=sid_val)
        if scr_tag and scr_tag.string:
            try: return json.loads(scr_tag.string)
            except Exception: pass
    rx_match = re.search(r"SIGI_STATE\s*=\s*(\{.*?\})\s*;\s*</script>", html_source, re.S)
    if rx_match:
        try: return json.loads(rx_match.group(1))
        except Exception: pass
    return None

def locate_video_item(json_data: dict, target_url: str) -> Optional[dict]:
    v_match = VIDEO_ID_REGEX.search(target_url)
    v_id = v_match.group(1) if v_match else None
    if not v_id: return None
    i_module = json_data.get("ItemModule") or json_data.get("itemModule") or {}
    if isinstance(i_module, dict) and v_id in i_module:
        inner_it = i_module.get(v_id)
        if isinstance(inner_it, dict): return inner_it
    def deep_search(obj_node: Any) -> Optional[dict]:
        if isinstance(obj_node, dict):
            if str(obj_node.get("id") or obj_node.get("aweme_id") or "") == str(v_id): return obj_node
            for sub_v in obj_node.values():
                h = deep_search(sub_v)
                if h: return h
        elif isinstance(obj_node, list):
            for sub_v in obj_node:
                h = deep_search(sub_v)
                if h: return h
        return None
    return deep_search(json_data)

def try_json_load_robust(s: str) -> Optional[Any]:
    if not isinstance(s, str): return None
    t = s.strip()
    if not t: return None
    if not ((t.startswith("{") and t.endswith("}")) or (t.startswith("[") and t.endswith("]"))): return None
    try: return json.loads(t)
    except Exception: pass
    try: return json.loads(t.encode("utf-8").decode("unicode_escape"))
    except Exception: pass
    try: return json.loads(t.replace('\\"', '"').replace("\\n", "").replace("\\t", ""))
    except Exception: return None

def _normalize_categories(categories: Any) -> List[dict]:
    if not isinstance(categories, list): return []
    out = []
    for c in categories:
        if isinstance(c, dict) and ("category_id" in c or "category_name" in c): out.append(c)
    return out

def _pick_leaf_category(categories: List[dict]) -> Optional[dict]:
    for c in categories:
        if c.get("is_leaf") is True: return c
    if categories: return categories[-1]
    return None

def _category_path_desc_zh(categories: List[dict]) -> str:
    if not categories:
        return ""
    parts = []
    for c in categories:
        cid = c.get("category_id", "")
        cname = c.get("category_name", "")
        parts.append(f"{cname}({cid})")
    path = " > ".join(parts)
    level_labels = ["一级类目", "二级类目", "三级类目", "四级类目", "五级类目", "六级类目"]
    level_desc_parts = []
    for i, c in enumerate(categories):
        lab = level_labels[i] if i < len(level_labels) else f"{i+1}级类目"
        cid = c.get("category_id", "")
        cname = c.get("category_name", "")
        level_desc_parts.append(f"{lab}: {cname}({cid})")
    return f"类目路径: {path} | " + " | ".join(level_desc_parts)

def merge_product_info(base: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    if not base: base = {}
    for k, v in new.items():
        if k not in base or base.get(k) in [None, "", 0, "0"]: base[k] = v
    return base

def collect_product_infos(obj: Any, out: Dict[str, Dict[str, Any]]) -> None:
    if isinstance(obj, dict):
        if "product_id" in obj:
            pid = obj.get("product_id")
            if pid is not None:
                pid_str = str(pid)
                categories = _normalize_categories(obj.get("categories"))
                leaf = _pick_leaf_category(categories)
                leaf_id = str(leaf.get("category_id")) if isinstance(leaf, dict) and leaf.get("category_id") is not None else ""
                leaf_name = str(leaf.get("category_name")) if isinstance(leaf, dict) and leaf.get("category_name") is not None else ""
                leaf_level = str(leaf.get("level")) if isinstance(leaf, dict) and leaf.get("level") is not None else ""
                path_desc = _category_path_desc_zh(categories)
                info = {
                    "product_id": pid_str,
                    "类目ID": leaf_id,
                    "类目名称": leaf_name,
                    "类目层级": leaf_level,
                    "类目路径描述": path_desc,
                }
                out[pid_str] = merge_product_info(out.get(pid_str, {}), info)
        for v in obj.values(): collect_product_infos(v, out)
    elif isinstance(obj, list):
        for v in obj: collect_product_infos(v, out)
    elif isinstance(obj, str):
        maybe = try_json_load_robust(obj)
        if maybe is not None: collect_product_infos(maybe, out)

def extract_embedded_json_candidates(html: str) -> Iterable[str]:
    for m in re.finditer(r'<script[^>]*\bid=["\'](SIGI_STATE|__UNIVERSAL_DATA_FOR_REHYDRATION__)["\'][^>]*>(.*?)</script>', html, flags=re.DOTALL | re.IGNORECASE):
        content = (m.group(2) or "").strip()
        if content: yield content
    assign_patterns = [
        r"SIGI_STATE\s*=\s*({.*?})\s*;", r"__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.*?})\s*;",
        r"SIGI_STATE\s*=\s*({.*?})\s*\n", r"__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.*?})\s*\n",
    ]
    for pat in assign_patterns:
        for m in re.finditer(pat, html, flags=re.DOTALL):
            g = m.group(1)
            if g: yield g
    for m in re.finditer(r"<script[^>]*>(.*?)</script>", html, flags=re.DOTALL | re.IGNORECASE):
        content = (m.group(1) or "").strip()
        if not content: continue
        if ("product_id" in content) or ("anchors" in content) or ("anchor_shop" in content) or ("TikTokShop" in content):
            if (content.startswith("{") and content.endswith("}")) or (content.startswith("[") and content.endswith("]")):
                yield content
            else:
                for pat in assign_patterns:
                    mm = re.search(pat, content, flags=re.DOTALL)
                    if mm and mm.group(1): yield mm.group(1)

def scrape_pid_from_html(html_source: str) -> List[Dict[str, Any]]:
    pid_info_map = {}
    for cand in extract_embedded_json_candidates(html_source):
        parsed = try_json_load_robust(cand)
        if parsed is not None:
            collect_product_infos(parsed, pid_info_map)
        else:
            collect_product_infos(cand, pid_info_map)
    
    if not pid_info_map:
        for match in re.finditer(r'"product_id"\s*:\s*"?(\d{8,})"?', html_source):
            p_str = match.group(1)
            pid_info_map[p_str] = merge_product_info(pid_info_map.get(p_str, {}), {
                "product_id": p_str,
                "类目ID": "",
                "类目名称": "",
                "类目层级": "",
                "类目路径描述": "",
            })
            
    items = list(pid_info_map.values())
    items.sort(key=lambda x: x.get("product_id", ""))
    return items

def extract_music_name(item: dict) -> str:
    music = item.get("music") or item.get("musicInfo") or item.get("sound") or {}
    if isinstance(music, dict):
        title = _first_present(music.get("title"), music.get("musicName"), music.get("name"), default="")
        author = _first_present(music.get("authorName"), music.get("artistName"), music.get("ownerHandle"), default="")
        if title and author:
            return f"{title} - {author}"
        return title or author or ""
    return _first_present(item.get("musicName"), item.get("music_title"), default="")

def classify_video_type(item: dict) -> str:
    is_ad = item.get("isAd")
    if is_ad is True or str(is_ad).lower() == "true": return "广告"
    is_ec_video = item.get("isECVideo")
    if is_ec_video == 1 or is_ec_video is True or str(is_ec_video) == "1": return "电商/带货"
    if _deep_get(item, ["commerceInfo"], None) is not None: return "电商/带货"
    if _deep_get(item, ["itemInfos", "commerceInfo"], None) is not None: return "电商/带货"
    return "普通流量"

def extract_counts(item: dict) -> Tuple[int, int, int, int, int]:
    stats = item.get("stats") or item.get("statistics") or item.get("statsV2") or {}
    if not isinstance(stats, dict): stats = {}
    play = safe_int(_first_present(stats.get("playCount"), stats.get("plays"), stats.get("viewCount"), default=0))
    digg = safe_int(_first_present(stats.get("diggCount"), stats.get("likes"), stats.get("likeCount"), default=0))
    comment = safe_int(_first_present(stats.get("commentCount"), stats.get("comments"), default=0))
    share = safe_int(_first_present(stats.get("shareCount"), stats.get("shares"), default=0))
    collect = safe_int(_first_present(
        stats.get("collectCount"),
        stats.get("favoriteCount"),
        stats.get("favouriteCount"),
        stats.get("favorites"),
        stats.get("collect"),
        default=0
    ))
    return play, digg, comment, share, collect

def extract_categorytype_precise(item: dict) -> Optional[int]:
    for k in ["CategoryType", "categoryType", "category_type"]:
        v = item.get(k)
        if v is None: continue
        if isinstance(v, int): return v
        if isinstance(v, str) and v.isdigit(): return int(v)
    v = _deep_get(item, ["extra", "CategoryType"])
    if isinstance(v, int): return v
    if isinstance(v, str) and v.isdigit(): return int(v)
    return None

def walk_find_categorytype(obj: Any) -> List[int]:
    hits = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ["CategoryType", "categoryType", "category_type"]:
                if isinstance(v, int): hits.append(v)
                elif isinstance(v, str) and v.isdigit(): hits.append(int(v))
            hits.extend(walk_find_categorytype(v))
    elif isinstance(obj, list):
        for it in obj: hits.extend(walk_find_categorytype(it))
    return hits

def extract_diversification_id(item: dict) -> Optional[int]:
    for k in ["diversificationId", "diversification_id", "diversificationID"]:
        v = item.get(k)
        if v is None: continue
        if isinstance(v, int): return v
        if isinstance(v, str):
            vv = v.strip()
            if vv.isdigit(): return int(vv)
            m = re.search(r"(\d+)", vv)
            if m:
                try: return int(m.group(1))
                except Exception: pass
    v = _deep_get(item, ["extra", "diversificationId"])
    if isinstance(v, int): return v
    if isinstance(v, str) and v.strip().isdigit(): return int(v.strip())
    v = _deep_get(item, ["itemInfo", "diversificationId"])
    if isinstance(v, int): return v
    if isinstance(v, str) and v.strip().isdigit(): return int(v.strip())
    return None

def extract_video_quality_score(item: dict) -> str:
    try:
        video = item.get("video") or {}
        if isinstance(video, dict):
            vq_score = video.get("VQScore")
            if vq_score is not None:
                score = safe_float(vq_score)
                return f"{score:.2f}" if score > 0 else ""
    except Exception: pass
    return ""

def extract_ai_video_flag(item: dict) -> str:
    try:
        aigc_type = item.get("aigcLabelType")
        if aigc_type is not None:
            if safe_int(aigc_type) == 1: return "是"
    except Exception: pass
    return "否"

def scrape_homepage_dynamic_stats(html_source: str) -> List[Dict[str, Any]]:
    json_data = get_embedded_data(html_source)
    if not json_data: 
        return []
    
    results = []
    
    i_module = json_data.get("ItemModule") or json_data.get("itemModule") or {}
    if i_module and isinstance(i_module, dict):
        for vid, item in i_module.items():
            if not isinstance(item, dict): continue
            v_id = item.get("id") or item.get("aweme_id") or str(vid)
            play, digg, comment, share, collect = extract_counts(item)
            results.append({
                "video_id": str(v_id),
                "play_count": play,
                "digg_count": digg,
                "comment_count": comment,
                "share_count": share,
                "collect_count": collect
            })
        return results

    def deep_find_items(obj: Any):
        if isinstance(obj, dict):
            if "id" in obj and "stats" in obj and isinstance(obj["stats"], dict):
                play, digg, comment, share, collect = extract_counts(obj)
                results.append({
                    "video_id": str(obj["id"]),
                    "play_count": play,
                    "digg_count": digg,
                    "comment_count": comment,
                    "share_count": share,
                    "collect_count": collect
                })
            for v in obj.values():
                deep_find_items(v)
        elif isinstance(obj, list):
            for v in obj:
                deep_find_items(v)

    deep_find_items(json_data)
    
    seen = set()
    unique_results = []
    for r in results:
        if r["video_id"] not in seen:
            seen.add(r["video_id"])
            unique_results.append(r)
            
    return unique_results

def merge_analysis_results(url_target: str, html_source: str, c_time: str, req_uname: str) -> List[Dict[str, Any]]:
    json_data = get_embedded_data(html_source)
    v_item = locate_video_item(json_data, url_target) if json_data else None
    
    base_r = {k: "" for k in EXPORT_COLUMNS}
    base_r["url"] = url_target
    base_r["采集时间"] = c_time
    base_r["has_play_data"] = False
    
    match = VIDEO_ID_REGEX.search(url_target)
    extracted_vid = match.group(1) if match else str(int(time.time() * 1000))
    base_r["video_id"] = extracted_vid
    base_r["作者名"] = req_uname
    for num_k in ["视频时长(秒)", "播放量", "点赞量", "评论数", "分享数", "收藏数", "作者粉丝数", "create_ts", "following_count", "heart_count", "video_count"]:
        base_r[num_k] = 0
    
    if v_item is not None:
        base_r["has_play_data"] = True
            
        a_info = v_item.get("author") or v_item.get("authorInfo") or {}
        base_r["作者名"] = a_info.get("nickname") or req_uname
        base_r["avatar_url"] = a_info.get("avatarLarger") or a_info.get("avatarMedium") or ""
        a_id_str = str(a_info.get("id") or a_info.get("uid") or "")
        base_r["作者ID"] = a_id_str
        
        try: base_r["注册时间"] = datetime.fromtimestamp(int(a_id_str) >> 32).strftime("%Y-%m-%d %H:%M:%S")
        except: pass
        
        v_dur = v_item.get("duration") or v_item.get("video", {}).get("duration") or 0
        base_r["视频时长(秒)"] = int(v_dur) // 1000 if int(v_dur) > 10000 else int(v_dur)
        
        play, digg, comment, share, collect = extract_counts(v_item)
        base_r["播放量"] = play
        base_r["点赞量"] = digg
        base_r["评论数"] = comment
        base_r["分享数"] = share
        base_r["收藏数"] = collect
        
        base_r["视频类型"] = classify_video_type(v_item)
        base_r["音乐名称"] = extract_music_name(v_item)

        a_stats = a_info.get("stats") or v_item.get("authorStats") or {}
        base_r["作者粉丝数"] = int(a_stats.get("followerCount") or 0)
        base_r["following_count"] = int(a_stats.get("followingCount") or 0)
        base_r["heart_count"] = int(a_stats.get("heartCount") or 0)
        base_r["video_count"] = int(a_stats.get("videoCount") or 0)
        base_r["desc"] = v_item.get("desc", "")
        base_r["cover_url"] = _deep_get(v_item, ["video", "cover"], "")
        
        cat = extract_categorytype_precise(v_item)
        if cat is None and json_data is not None:
            cat_candidates = walk_find_categorytype(json_data)
            cat = cat_candidates[0] if cat_candidates else None
        base_r["平台类目ID"] = cat if cat else ""
        base_r["类目名称"] = CATEGORY_MAP.get(cat, "未知类目") if cat else ""
        
        div_id = extract_diversification_id(v_item)
        base_r["内容细分标签 ID"] = div_id if div_id is not None else ""
        base_r["细分标签名称"] = DIVERSIFICATION_MAP.get(div_id, "") if div_id is not None else ""
        
        base_r["视频画质得分"] = extract_video_quality_score(v_item)
        base_r["AI视频"] = extract_ai_video_flag(v_item)

    create_ts = v_item.get("createTime") if v_item else 0
    if not create_ts and extracted_vid.isdigit() and len(extracted_vid) > 15: create_ts = int(extracted_vid) >> 32
    base_r["create_ts"] = int(create_ts) if create_ts else int(time.time())

    pid_list = scrape_pid_from_html(html_source)
    final_merged = []
    if not pid_list: 
        final_merged.append(base_r)
    else:
        for p_data in pid_list:
            n_row = base_r.copy()
            n_row["PID"] = p_data.get("product_id", "")
            n_row["商品类目名称"] = p_data.get("类目路径描述", "") or p_data.get("类目名称", "")
            final_merged.append(n_row)
            
    return final_merged

def fetch_profile_video_urls(user_id: str, limit: int = 0) -> Tuple[List[str], int]:
    if not user_id.startswith('@'): user_id = '@' + user_id
    url = f"https://www.tiktok.com/{user_id}"
    ydl_opts = {'extract_flat': True, 'quiet': True, 'ignoreerrors': True}
    video_items = []
    seen_vids = set()
    playlist_count = 0
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info:
                playlist_count = info.get('playlist_count', 0)
                if 'entries' in info:
                    entries = list(info['entries'])
                    if playlist_count == 0: playlist_count = len(entries)
                    for entry in entries:
                        video_url = entry.get('url')
                        if video_url:
                            match = VIDEO_ID_REGEX.search(video_url)
                            vid = match.group(1) if match else None
                            if vid and vid not in seen_vids:
                                seen_vids.add(vid)
                                create_time = (int(vid) >> 32) if vid.isdigit() and len(vid) > 15 else 0
                                video_items.append({'id': vid, 'url': video_url, 'time': create_time})
    except Exception as e:
        print(f"[-] yt-dlp Error: {e}")
        
    video_items.sort(key=lambda x: x['time'], reverse=True)
    url_list = [v['url'] for v in video_items]
    if limit > 0: url_list = url_list[:limit]
    return url_list, playlist_count