import json
import requests
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
from database import get_db_connection

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Dict[str, Any]

# 核心：赋能 AI 智能生成 SQL 查数据的 System Prompt
SCHEMA_INFO = """
你是一个精通数据分析的AI智能助手，名字叫“乘风数据罗盘AI”。
你的任务是解答用户关于TikTok账号抓取数据的问题。

【系统当前时间（用于计算昨天、今天等时间概念）】
当前标准时间：{current_time}

【用户当前上下文（这是AI的眼睛）】
用户当前正在访问的页面路径以及他们设置的筛选条件（如果存在）如下：
{context}
提示：session_storage 中的 dash_mem_..._days 代表用户当前筛选的天数，selectedGroup 代表分组等。如果用户说“这些数据”，指的就是上下文里的筛选条件对应的数据范围。如果处于预警中心，则用户正在查阅异常增量数据。

【数据库表结构说明】
1. accounts 表: id, username(唯一), nickname, type(internal或external), status, reg_time, uid, group_name, country
2. videos 表: id, account_id, video_id, desc, create_time(发布时间戳，单位：秒), duration, play_count, digg_count, comment_count, share_count, is_ai, is_deleted, product_category, sync_status(1为成功，0为抓取失败)
3. snapshots 表: id, account_id, timestamp, follower_count, video_count, play_count

【SQL生成强制规则与提示】🔴🔴🔴严格遵守🔴🔴🔴
1. 时间检索规则：videos 表中的 create_time 是 Unix时间戳（秒）。查询某天的数据时，必须使用 date() 和 unixepoch 进行转换！
   - 例如查询“昨天”：date(v.create_time, 'unixepoch', 'localtime') = date('now', '-1 day', 'localtime')
   - 例如查询“今天”：date(v.create_time, 'unixepoch', 'localtime') = date('now', 'localtime')
2. 过滤无效数据：查询 videos 表统计视频数或播放量时，务必强制加上 WHERE v.is_deleted = 0 AND v.sync_status = 1，排除掉被删除和抓取失败的空壳数据。
3. 账号分类：查询“员工内部账号”请限定 accounts.type = 'internal'；查询“竞品/外部账号”请限定 accounts.type = 'external'。
4. 模糊匹配：用户说的“用户名”或“名字”通常指表里的 nickname（中文显示名），而带@的英文账号才指 username。在生成 SQL 做账号模糊搜索时，务必使用 `username LIKE '%值%' OR nickname LIKE '%值%'` 来防止漏查数据！

【输出格式要求】🔴🔴🔴严格遵守🔴🔴🔴
你必须且只能输出一个合法的 JSON 对象！不要包含任何 Markdown 代码块包裹（例如不要有 ```json）。

若你需要从数据库查数据来回答用户，请输出以下 JSON：
{{
  "action": "query",
  "sql": "SELECT * FROM accounts LIMIT 10" 
}}
(注意：必须是合法的 SQLite 查询，请带上 LIMIT 控制数量防止爆炸)

若用户的提问你已经可以直接回答了（比如普通寒暄、概念解释，或者第二轮拿到了数据进行总结），请输出：
{{
  "action": "reply",
  "content": "这里是回答的内容文本，支持 Markdown 编排换行等"
}}
"""

@router.post("/chat")
def ai_chat(req: ChatRequest):
    conn = get_db_connection()
    try:
        api_key_row = conn.cursor().execute("SELECT value FROM settings WHERE key='deepseek_api_key'").fetchone()
        if not api_key_row or not api_key_row['value']:
            return {"role": "assistant", "content": "系统提示：尚未配置 DeepSeek 密钥，请先前往【设置】页面配置 API Key。"}

        api_key = api_key_row['value'].strip()
        
        # 动态获取当前时间注入给 AI
        current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        system_msg = {
            "role": "system", 
            "content": SCHEMA_INFO.format(
                context=json.dumps(req.context, ensure_ascii=False),
                current_time=current_time_str
            )
        }
        
        api_messages = [system_msg]
        for m in req.messages:
            api_messages.append({"role": m.role, "content": m.content})
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": api_messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.1,  # 设定低温度以获得极其理性的 SQL 和严谨回答
            "max_tokens": 4096
        }
        
        # 第 1 次对话：判断意图（回答 or 查数据库）
        # ✅ 正确的样子
        resp = requests.post("https://api.deepseek.com/chat/completions", json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        ai_text = resp.json()["choices"][0]["message"]["content"].strip()
        
        # 净化字符串避免带有markdown代码块
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:]
        elif ai_text.startswith("```"):
            ai_text = ai_text[3:]
            
        if ai_text.endswith("```"):
            ai_text = ai_text[:-3]
            
        ai_text = ai_text.strip()
        
        # 解析 AI 返回的 JSON
        try:
            ai_response = json.loads(ai_text)
        except json.JSONDecodeError:
            return {"role": "assistant", "content": f"系统提示：AI 返回的 JSON 格式不正确，解析失败。\n\n原始返回：{ai_text}"}

        action = ai_response.get("action")
        
        if action == "reply":
            return {"role": "assistant", "content": ai_response.get("content", "抱歉，AI 返回的内容为空。")}
            
        elif action == "query":
            sql = ai_response.get("sql", "")
            if not sql:
                return {"role": "assistant", "content": "系统提示：AI 尝试查询数据库，但生成的 SQL 语句为空。"}
                
            try:
                # 执行 SQL
                cursor = conn.cursor()
                cursor.execute(sql)
                # 获取列名并组装为字典
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                results = [dict(zip(columns, row)) for row in rows]
                
                # 限制返回给 AI 的数据量，防止超长报错
                results_str = json.dumps(results, ensure_ascii=False)
                if len(results_str) > 15000:
                    results_str = results_str[:15000] + "\n...(数据过多已截断)"

                # 第 2 次对话：携带查询出来的数据，让 AI 进行总结
                db_context_msg = {
                    "role": "user",
                    "content": f"你刚才执行了SQL: `{sql}`\n\n这是数据库返回的结果：\n{results_str}\n\n请根据上述数据，直接用清晰、专业的语言回答我最初的问题（无需告诉我你查了数据库，直接给结论即可）。"
                }
                api_messages.append(db_context_msg)
                payload["messages"] = api_messages
                
                resp2 = requests.post("https://api.deepseek.com/chat/completions", json=payload, headers=headers, timeout=60)
                resp2.raise_for_status()
                ai_text2 = resp2.json()["choices"][0]["message"]["content"].strip()
                
                # 第二次返回大概率是 reply action，同样进行净化解析
                if ai_text2.startswith("```json"):
                    ai_text2 = ai_text2[7:]
                elif ai_text2.startswith("```"):
                    ai_text2 = ai_text2[3:]
                if ai_text2.endswith("```"):
                    ai_text2 = ai_text2[:-3]
                ai_text2 = ai_text2.strip()
                
                try:
                    final_response = json.loads(ai_text2)
                    return {"role": "assistant", "content": final_response.get("content", "")}
                except json.JSONDecodeError:
                    # 如果 AI 二次回答没有严格遵守 JSON，直接将其作为文本返回作为容错
                    return {"role": "assistant", "content": ai_text2}
                    
            except Exception as db_err:
                return {"role": "assistant", "content": f"系统提示：执行 AI 生成的 SQL 语句时发生数据库错误。\nSQL: `{sql}`\n错误: {str(db_err)}"}
        else:
            return {"role": "assistant", "content": "系统提示：无法识别的 AI Action 指令。"}

    except requests.exceptions.RequestException as req_err:
         return {"role": "assistant", "content": f"系统提示：调用 DeepSeek API 接口失败。请检查网络或配置。\n错误信息: {str(req_err)}"}
    except Exception as e:
        return {"role": "assistant", "content": f"系统提示：后端发生未知异常：{str(e)}"}
    finally:
        if conn:
            conn.close()