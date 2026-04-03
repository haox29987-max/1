import re
import random
import time
import requests
import json
import urllib.parse
import math
import datetime
from fastapi import APIRouter, Query
try:
    from curl_cffi import requests as curl_requests
except ImportError:
    pass

from models import decode_val, smart_format, translate_to_zh

router = APIRouter(prefix="/api/product", tags=["Products"])

def format_beijing_time(timestamp_ms):
    if not timestamp_ms:
        return ""
    timestamp_sec = timestamp_ms / 1000.0
    tz_beijing = datetime.timezone(datetime.timedelta(hours=8))
    dt = datetime.datetime.fromtimestamp(timestamp_sec, tz_beijing)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def extract_useful_info(item):
    video_info = item.get("videoInfo", {})
    author_info = item.get("authorInfo", {})
    is_ad = "投流" if video_info.get("adAwemeSource") == 1 else "没有投流"
    return {
        "视频id": video_info.get("videoId"),
        "视频封面": video_info.get("videoCoverUrl"),
        "视频国家": video_info.get("regionCommentZh"),
        "视频播放量": video_info.get("playCountTotal"),
        "点赞数": video_info.get("likeCountTotal"),
        "分享数": video_info.get("shareCountTotal"),
        "收藏数": video_info.get("commentCountTotal"), 
        "视频原链接": video_info.get("originVideoUrl"),
        "发现时间": format_beijing_time(video_info.get("discoverTime")),
        "视频发布时间": format_beijing_time(video_info.get("createTime")),
        "更新时间": format_beijing_time(video_info.get("updateTime")),
        "作者id": author_info.get("authorUid") or video_info.get("authorUid"),
        "作者名称": author_info.get("uniqueId"), 
        "头像url": author_info.get("authorAvatarUrl"), 
        "是否ad投流": is_ad
    }

@router.get("/{pid}/tabcut_videos")
def get_tabcut_product_videos(
    pid: str, 
    pageNo: int = Query(1), 
    sortKey: str = Query("create_time"), 
    sortOrder: str = Query("desc"),
    days: int = Query(30)
):
    base_url = "https://www.tabcut.com/api/trpc/ranking.goods.detailVideoList"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.tabcut.com/",
        "Accept": "application/json",
        "Cookie": "_gcl_au=1.1.875353302.1769235152; _ga=GA1.1.1976326271.1769235152; i18nextLng=zh-CN; Hm_lvt_b5ba559878818924302c54d9fc70edfa=1772969233,1773711775; HMACCOUNT=81DBD1F1490DA564; __Host-next-auth.csrf-token=4c5c881769cbcb5c23f6d6eb5781d77f9bda6a06d5a3a9e6a4ba805594a66e67%7C247f54e3b35b7f4754388e3da1a2d832a7d344f63322c5b184886a26ac799646; uid=9463649134846421; session-id=1b5a9d43b8a8; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.tabcut.com%2Fzh-CN%2Franking%2Fgoods%3FpageNo%3D1%26pageSize%3D24%26rankType%3D1%26bizDate%3D20260316%26region%3DFR%26itemCategoryId%3D0%26trendFilterType%3D0%26orderType%3D1%26sellerType%3D; __Secure-next-auth.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6Imp3dCJ9.eyJuYW1lIjoiVU5WU1RBUiIsImVtYWlsIjpudWxsLCJwaWN0dXJlIjpudWxsLCJzdWIiOiI5NDYzNjQ5MTM0ODQ2NDIxIiwibG9naW5GbGFnIjoiNjEyYTJhNmMxZjgxIiwiaWF0IjoxNzczNzMzOTA4fQ.XsjAKVyh9IJympKMzMG1_oZUH_uhGF03hJQv1YqsdoQ; Hm_lpvt_b5ba559878818924302c54d9fc70edfa=1773733926; _ga_YDX355WVSD=GS2.1.s1773733563$o44$g1$t1773733926$j18$l0$h0" 
    }
    
    now = datetime.datetime.now()
    
    # 🚀 动态日期控制，匹配前端的 7, 30, 90, 0(全部)
    if days == 0:
        begin_time = "2020-01-01 00:00:00"
    else:
        begin_time = (now - datetime.timedelta(days=days)).strftime("%Y-%m-%d 00:00:00")
        
    end_time = now.strftime("%Y-%m-%d 23:59:59")

    # 🚀 极其关键：这是根据你的 JSON 找出的最精准全局排序键名
    order_name = "playCountTotal" if sortKey == "play_count" else "createTime"
    order_type = "ASC" if sortOrder == "asc" else "DESC"

    payload = {
        "pageNo": pageNo,
        "pageSize": 10,
        "itemId": str(pid),
        "filterType": str(days) if days != 0 else "0", # 强制关联天数过滤器
        "videoCreateTimeBegin": begin_time,
        "videoCreateTimeEnd": end_time,
        "videoWithSoldFlag": False,
        "videoWithAdsFlag": False,
        "orderName": order_name,
        "orderType": order_type
    }
    json_str = json.dumps(payload, separators=(',', ':'))
    url = f"{base_url}?input={urllib.parse.quote(json_str)}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        page_data = response.json()
        
        data_block = page_data.get('result', {}).get('data', {})
        
        if not data_block or data_block.get('result') is None:
            return {"total": 0, "videos": []}
            
        total_items = data_block['result']['total']
        items = data_block['result']['data']
        extracted = [extract_useful_info(item) for item in items]
        
        return {"total": total_items, "videos": extracted}
    except Exception as e:
        print(f"❌ [Tabcut请求报错] PID:{pid} 错误信息: {e}")
        return {"total": 0, "videos": []}

@router.get("/{pid}")
def get_product_endpoint(pid: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"https://www.fastmoss.com/zh/e-commerce/detail/{pid}",
        "Cookie": "NEXT_LOCALE=zh; fp_visid=b97c81ba960d36fd340886a662c04bc6; _fbp=fb.1.1769776369617.434507838895594148; fd_tk=db7cc1c56bd9aece12b47d09fc0f7f2a; _clck=r81b44%5E2%5Eg4p%5E0%5E2221; region=US; userTimeZone=Asia%2FShanghai; Hm_lvt_6ada669245fc6950ae4a2c0a86931766=1773882616,1774229776,1774314586,1774588981; HMACCOUNT=81DBD1F1490DA564; Hm_lpvt_6ada669245fc6950ae4a2c0a86931766=1774588993; _uetsid=af4a4420265811f195473940268186b8|kwaxtv|2|g4p|0|2273; _clsk=vn1j87%5E1774588994589%5E4%5E1%5Ewww.clarity.ms%2Feus2-e%2Fcollect; _uetvid=c9f0da50fdd711f09eda7312e291153c|fv6jf|1774588995260|5|1|bat.bing.com/p/insights/c/z"
    }
    html_url = f"https://www.fastmoss.com/zh/e-commerce/detail/{pid}"
    html = ""
    full_content = ""
    try:
        resp = curl_requests.get(html_url, impersonate="chrome120", headers=headers, timeout=15)
        resp.encoding = 'utf-8'
        html = resp.text
        chunks = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', html, re.S)
        full_content = "".join(chunks)
    except Exception as e:
        print(f"[!] HTML 请求失败: {e}")

    def search_text(source, key):
        matches = re.findall(rf'\\"{key}\\":\\"(.*?)\\"', source)
        if not matches: matches = re.findall(rf'"{key}"\s*:\s*"([^"]+)"', html)
        for m in reversed(matches):
            val = decode_val(m)
            if val and "：" not in str(val) and "佣金" not in str(val) and val != "店铺": return val
        return "N/A"

    def search_number(source, key):
        matches = re.findall(rf'\\"{key}\\":([0-9.]+)', source)
        if not matches: matches = re.findall(rf'"{key}"\s*:\s*([0-9.]+)', html)
        for m in reversed(matches): return str(m)
        return "N/A"

    intro_match = re.search(r'<title>查看\[(.*?)\]', html)
    introduction = intro_match.group(1) if intro_match else search_text(full_content, "title")
    brand = "N/A"
    shop_pattern = r'\\"seller_id\\":\d+.*?\\"name\\":\\"([^"\\]*)\\"'
    shop_matches = re.findall(shop_pattern, full_content)
    for m in reversed(shop_matches):
        val = decode_val(m)
        if val and "：" not in val and val not in ["店铺"]: brand = val; break
    if brand == "N/A": brand = search_text(full_content, "name")

    country = search_text(full_content, "region_name")
    raw_price = search_text(full_content, "real_price")
    price = raw_price.replace('$$', '$') if raw_price != "N/A" else "N/A"
    
    def search_list(source, key):
        matches = re.findall(rf'\\"{key}\\":\[\\"(.*?)\\"\]', source)
        for m in reversed(matches): return decode_val(m)
        return "N/A"

    cat1 = search_list(full_content, "category_name")
    cat2 = search_list(full_content, "category_name_l2")
    cat3 = search_list(full_content, "category_name_l3")
    cat_list = [c for c in [cat1, cat2, cat3] if c != "N/A"]
    
    if cat_list:
        last_cat = str(cat_list[-1])
        category_full = translate_to_zh(last_cat)
    else:
        category_full = "N/A"

    images = []
    img_block = re.search(r'\\"cover_list\\":\[(.*?)]', full_content)
    if img_block: images = [decode_val(i) for i in re.findall(r'\\"(.*?)\\"', img_block.group(1))]

    sold_count = search_text(full_content, "sold_count_show")
    sale_amount = search_text(full_content, "sale_amount_show")
    author_count = search_number(full_content, "author_count")
    aweme_count = search_number(full_content, "aweme_count")
    commission_rate = search_text(full_content, "commission_rate")
    product_rating = search_number(full_content, "product_rating")

    if sold_count == "N/A" or sale_amount == "N/A":
        current_time = int(time.time())
        cnonce = random.randint(10000000, 99999999)
        api_url = f"https://www.fastmoss.com/api/goods/v3/base?product_id={pid}&_time={current_time}&cnonce={cnonce}"
        try:
            api_resp = curl_requests.get(api_url, impersonate="chrome120", headers=headers, timeout=15)
            api_data = api_resp.json()
            if api_data.get("msg") == "success":
                product_data = api_data.get("data", {}).get("product", {})
                if sold_count == "N/A": sold_count = str(product_data.get("sold_count_show", "N/A"))
                if sale_amount == "N/A": sale_amount = str(product_data.get("sale_amount_show", "N/A"))
                if author_count == "N/A": author_count = str(product_data.get("author_count", "N/A"))
                if aweme_count == "N/A": aweme_count = str(product_data.get("aweme_count", "N/A"))
                if commission_rate == "N/A": commission_rate = str(product_data.get("commission_rate", "N/A"))
                if product_rating == "N/A": product_rating = str(product_data.get("product_rating", "N/A"))
        except Exception as e:
            print(f"[!] API 请求失败: {e}")

    return {
        "introduction": introduction, 
        "brand": brand, 
        "country": country, 
        "category": category_full, 
        "price": price, 
        "sold_count": sold_count, 
        "sale_amount": sale_amount, 
        "author_count": author_count, 
        "aweme_count": aweme_count, 
        "commission_rate": commission_rate, 
        "product_rating": product_rating, 
        "images": images
    }