import os
import re
from datetime import datetime

def write_log(folder, action, details):
    with open(os.path.join(folder, f"{datetime.now().strftime('%Y-%m-%d')}.txt"), "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] [{action}] {details}\n")

def get_tiktok_id(url):
    match = re.search(r'video/(\d+)', url)
    return match.group(1) if match else f"Local_{datetime.now().strftime('%H%M%S')}"

def time_to_sec(t_str):
    try:
        m, s = t_str.split(':')
        return int(m) * 60 + int(s)
    except: return 0