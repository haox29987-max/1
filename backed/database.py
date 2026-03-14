import os
import json
import sqlite3
import threading
from config import DB_FILE, OLD_DB_FILE

db_lock = threading.Lock()

def init_db():
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        c = conn.cursor()
        
        # 1. 确保基础表存在
        c.execute('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY)')
        
        # 2. 动态检测并升级表结构（修复之前只存名字丢失 API_KEY 等配置的致命 Bug）
        c.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in c.fetchall()]
        if "user_data" not in columns:
            c.execute("ALTER TABLE users ADD COLUMN user_data TEXT")
            # 补救：把已经存进去的残缺名字，包装成完整的 JSON 对象补存
            c.execute("SELECT username FROM users")
            rows = c.fetchall()
            for row in rows:
                c.execute("UPDATE users SET user_data = ? WHERE username = ?", (json.dumps({"username": row[0]}, ensure_ascii=False), row[0]))
        conn.commit()
        
        # 3. 兼容旧版本：将 database.json 账号数据无损导入数据库
        if os.path.exists(OLD_DB_FILE):
            try:
                with open(OLD_DB_FILE, 'r', encoding='utf-8') as f:
                    old_data = json.load(f)
                for u in old_data.get("allowed_users", []):
                    # 使用 REPLACE 确保如果用户改回了 .bak，能完整覆盖之前残缺的数据
                    if isinstance(u, dict) and u.get("username"):
                        c.execute('INSERT OR REPLACE INTO users (username, user_data) VALUES (?, ?)', 
                                  (u.get("username"), json.dumps(u, ensure_ascii=False)))
                    elif isinstance(u, str): 
                        c.execute('INSERT OR REPLACE INTO users (username, user_data) VALUES (?, ?)', 
                                  (u, json.dumps({"username": u}, ensure_ascii=False)))
                conn.commit()
                os.rename(OLD_DB_FILE, OLD_DB_FILE + ".bak") # 备份老文件，避免重复导入
            except: pass
        conn.close()

def load_db():
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        c = conn.cursor()
        c.execute('SELECT user_data, username FROM users')
        users = []
        for row in c.fetchall():
            try:
                if row[0]: # user_data 存在
                    users.append(json.loads(row[0])) # 完整恢复 JSON 对象返回给前端（含 apiKey）
                else:
                    users.append({"username": row[1]})
            except: 
                users.append({"username": row[1]})
        conn.close()
        return {"allowed_users": users}

def save_db(data):
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        c = conn.cursor()
        c.execute('DELETE FROM users') # 每次以管理员最新数据为准覆盖
        users_to_insert = []
        for u in data.get("allowed_users", []):
            if isinstance(u, dict) and u.get("username"):
                # 把整个用户对象转成字符串存进去，保证 apiKey 等其它配置永不丢失
                users_to_insert.append((u.get("username"), json.dumps(u, ensure_ascii=False)))
        if users_to_insert:
            c.executemany('INSERT INTO users (username, user_data) VALUES (?, ?)', users_to_insert)
        conn.commit()
        conn.close()