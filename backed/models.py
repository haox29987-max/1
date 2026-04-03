import re
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

try:
    from deep_translator import GoogleTranslator
    def translate_to_zh(text: str) -> str:
        if not text: return ""
        if re.search(r'[\u4e00-\u9fa5]', text): return text
        try: return GoogleTranslator(source='auto', target='zh-CN').translate(text)
        except: return text
except ImportError:
    def translate_to_zh(text: str) -> str: return text

# -------------------------
# 类目映射
# -------------------------
CATEGORY_MAP = {
    120: "全部 / 聚合入口（非内容类目）", 119: "唱歌 / 跳舞", 118: "科技 / 数码",
    117: "健身 / 健康", 116: "知识 / 教育", 115: "汽车", 114: "社会 / 观点 / 纪实",
    113: "宠物 / 动物", 112: "体育 / 运动", 111: "美食", 110: "对口型 / 模仿表演",
    109: "穿搭 / 服饰", 108: "剧情 / 短剧 / 演绎", 107: "情感 / 恋爱 / 两性关系",
    106: "家庭 / 亲子", 105: "日常 / 生活记录", 104: "搞笑 / 幽默", 103: "游戏",
    102: "美妆 / 护肤", 101: "综艺 / 剧集 / 节目剪辑", 100: "动漫 / 二次元",
}

DIVERSIFICATION_MAP = {
    120: "全部 / 聚合入口（非内容类目）", 119: "唱歌 / 跳舞", 118: "科技 / 数码",
    117: "健身 / 健康", 116: "知识 / 教育", 115: "汽车", 114: "社会 / 观点 / 纪实",
    113: "宠物 / 动物", 112: "体育 / 运动",
    111: "美食", 110: "对口型 / 模仿表演", 109: "穿搭 / 服饰", 108: "剧情 / 短剧 / 演绎",
    107: "情感 / 恋爱 / 两性关系", 106: "家庭 / 亲子", 105: "日常 / 生活记录", 104: "搞笑 / 幽默",
    103: "游戏", 102: "美妆 / 护肤", 101: "综艺 / 剧集 / 节目剪辑", 100: "动漫 / 二次元",
    10000: "剧情搞笑（剧本式喜剧表演）", 10001: "路人整蛊 / 恶作剧", 10002: "搞笑翻车 / 失败瞬间",
    10003: "搞笑内容（泛搞笑）", 10004: "剧情短剧 / 情景剧", 10005: "跳舞", 10006: "魔术",
    10008: "专业特效 / 高级视觉效果", 10009: "唱歌 / 乐器演奏", 10011: "才艺（未细分）",
    10012: "恋爱 / 情感", 10013: "励志 / 激励", 10014: "日记 / Vlog", 10015: "校园生活",
    10017: "婴儿 / 宝宝", 10018: "家庭", 10019: "宠物", 10020: "农场动物", 10021: "动物（泛）",
    10022: "环保", 10024: "社会新闻", 10025: "美发", 10026: "美妆", 10027: "美容护理（泛）",
    10028: "美甲", 10029: "穿搭", 10032: "美妆穿搭（泛）", 10033: "DIY / 手工", 10034: "生活技巧",
    10035: "平面设计 / 视觉艺术", 10036: "艺术创作", 10037: "解压 / 舒适视频", 10039: "食物展示",
    10040: "烹饪 / 做饭", 10041: "吃播 / 试吃", 10042: "饮品", 10043: "旅行", 10044: "家居 / 园艺",
    10045: "影视作品", 10046: "音乐", 10047: "戏剧 / 舞台", 10049: "娱乐新闻", 10050: "玩具 / 收藏",
    10051: "角色扮演", 10052: "漫画 / 动画 / 二次元", 10056: "电子游戏", 10057: "非电子游戏",
    10058: "极限运动", 10059: "传统体育", 10060: "体育新闻", 10061: "健身", 10062: "汽车 / 卡车 / 摩托",
    10063: "汽车（泛）", 10064: "钓鱼 / 狩猎 / 露营 / 风景 / 植物",
    10067: "科技产品 / 资讯", 10068: "学校教育", 10070: "工作 / 职业", 10071: "对口型",
    10073: "自拍", 10080: "手指舞 / 基础舞蹈", 10081: "街头采访 / 社会实验", 10082: "摄影",
    10085: "美食探店 / 推荐", 10086: "娱乐 / 休闲设施", 10087: "社会议题", 10088: "明星剪辑 / 综艺",
    10089: "灵异 / 恐怖", 10091: "职业 / 个人成长", 10092: "人文", 10093: "商业 / 金融",
    10094: "科学", 10095: "软件 / 应用", 10096: "健康 / 养生",
}

VIDEO_ID_REGEX = re.compile(r"/video/(\d+)")

EXPORT_COLUMNS = [
    "url", "采集时间", "作者名", "作者ID", "注册时间", "平台类目ID", "类目名称", 
    "内容细分标签 ID", "细分标签名称", "发布时间", "视频时长(秒)", "视频画质得分", 
    "AI视频", "音乐名称", "视频类型", "PID", "类目ID", "商品类目名称", 
    "类目层级", "具体在哪个类目里面", "作者粉丝数", "播放量", "点赞量", "评论数", "分享数", "收藏数",
    "video_id", "create_ts", "cover_url", "desc", "following_count", "heart_count", "video_count", "avatar_url" 
]

class AccountCreate(BaseModel): username: str; type: str

# 🚀 新增了 device 和 auto_update 校验
class AccountMetaUpdate(BaseModel): custom_name: str; group_name: str; country: str; mcn: str; created_at: str; device: str; auto_update: int

class BatchMetaUpdateRequest(BaseModel):
    ids: list[int]
    group_name: Optional[str] = None
    country: Optional[str] = None
    mcn: Optional[str] = None
    created_at: Optional[str] = None

class SettingsUpdate(BaseModel): 
    internal_scrape_video_limit: Optional[str] = None
    external_scrape_video_limit: Optional[str] = None
    network_country: Optional[str] = None
    warning_normal_play: Optional[str] = None
    warning_normal_high: Optional[str] = None
    warning_growth_play: Optional[str] = None
    warning_growth_high: Optional[str] = None
    warning_low_days: Optional[str] = None
    warning_low_play: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    # 🚀 新增两个独立时钟配置
    auto_update_internal_hourly: Optional[str] = None
    auto_update_external_hourly: Optional[str] = None

class RefreshRequest(BaseModel): limit: int = 30
class SingleRefreshRequest(BaseModel): account_id: int
class AddVideoRequest(BaseModel): url: str 
class BatchDeleteRequest(BaseModel): ids: List[int]
class BatchGroupRequest(BaseModel): ids: List[int]; group_name: str

def decode_val(val_str):
    try: return json.loads(f'"{val_str}"')
    except: return val_str

def smart_format(val, is_money=False):
    if val == "N/A" or val is None: return "N/A"
    try:
        num = float(val)
        if num >= 10000: res = f"{num / 10000:.2f}万"
        else: res = f"{num:.2f}" if is_money else f"{int(num)}"
        return f"${res}" if is_money else res
    except (ValueError, TypeError): return str(val)

def fill_zero_dates(db_rows: List[sqlite3.Row], days: int, value_key: str) -> List[Dict[str, Any]]:
    end_date = datetime.now().date()
    if days > 0: start_date = end_date - timedelta(days=days-1)
    else:
        if db_rows:
            valid_dates = []
            for r in db_rows:
                try:
                    d = datetime.strptime(dict(r)['date'], '%Y-%m-%d').date()
                    if d.year >= 2015: valid_dates.append(d)
                except Exception: pass
            start_date = min(valid_dates) if valid_dates else end_date
        else: return []
    if (end_date - start_date).days > 4000: start_date = end_date - timedelta(days=4000)

    data_map = {dict(row)['date']: dict(row).get(value_key, 0) for row in db_rows if dict(row).get('date')}
    filled = []
    curr = start_date
    while curr <= end_date:
        d_str = curr.strftime('%Y-%m-%d')
        filled.append({"date": d_str, value_key: data_map.get(d_str, 0)})
        curr += timedelta(days=1)
    return filled

def _first_present(*vals, default=None):
    for v in vals:
        if v is not None: return v
    return default

def safe_int(x: Any) -> int:
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

def safe_float(x: Any) -> float:
    try:
        if x is None: return 0.0
        if isinstance(x, (int, float)): return float(x)
        if isinstance(x, str):
            s = x.strip()
            if s == "": return 0.0
            return float(s)
    except: return 0.0
    return 0.0

def _deep_get(d: Any, path: List[Any], default: Any = None) -> Any:
    cur = d
    for p in path:
        if isinstance(cur, dict): cur = cur.get(p, default)
        elif isinstance(cur, list) and isinstance(p, int) and 0 <= p < len(cur): cur = cur[p]
        else: return default
    return cur