import os
import json
import shutil
import subprocess
import traceback
import requests
from datetime import datetime

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# 从各个模块导入
from config import BASE_DIR, USERS_DIR, CACHE_DIR, VIDEO_EXTENSIONS, LOG_STORAGE, LOG_ADMIN
from utils import write_log, get_tiktok_id
from database import init_db, load_db, save_db
from scraper import extract_video_info
from processor import get_ai_analysis_with_retry, parse_ai_output, generate_gifs_for_segments_fastapi, create_html_report

# 初始化数据库
init_db()

# 异步后台任务 - 核心解析引擎
def process_video_task(url: str, username: str, job_id: str, model: str):
    task_dir = os.path.join(USERS_DIR, username, job_id)
    job_file = os.path.join(task_dir, "job.json")
    video_id = get_tiktok_id(url)
    
    if not model or not model.strip(): model = "gpt-5.2-chat-latest"
    
    def update_job(status, progress, text, extra=None):
        try:
            with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
            job.update({'status': status, 'progress': progress, 'progressText': text})
            if extra: job.update(extra)
            with open(job_file, "w", encoding="utf-8") as f: json.dump(job, f, ensure_ascii=False)
        except: pass

    try:
        # 【全局缓存秒传引擎启动】
        cached_task_dir = os.path.join(CACHE_DIR, video_id)
        if os.path.exists(cached_task_dir) and os.path.exists(os.path.join(cached_task_dir, "report.html")):
            update_job("processing", 50, "✨ 命中本地高速缓存系统，正在极速物理秒传...")
            
            for item in os.listdir(cached_task_dir):
                if item == "job.json": continue
                s = os.path.join(cached_task_dir, item)
                d = os.path.join(task_dir, item)
                if os.path.isdir(s): shutil.copytree(s, d, dirs_exist_ok=True)
                else: shutil.copy2(s, d)
            
            video_file = next((f for f in os.listdir(task_dir) if f.startswith(video_id) and f.endswith(VIDEO_EXTENSIONS) and not f.endswith("_temp.mp4")), None)
            cached_title = "视频分析报告 (秒传成功)"
            try:
                with open(os.path.join(cached_task_dir, "meta.json"), "r", encoding="utf-8") as f:
                    cached_title = json.load(f).get("title", cached_title)
            except: pass

            update_job("completed", 100, "✅ 解析完成 (自动秒传极速复用)", {
                "title": cached_title, 
                "report_url": f"/storage/{username}/{job_id}/report.html?v={int(datetime.now().timestamp())}",
                "video_rel_path": f"/storage/{username}/{job_id}/{video_file}" if video_file else ""
            })
            return 
        
        # =========================================================================

        update_job("scraping", 15, "抓取全量视频信息与创作者硬件数据...", {"videoId": video_id})
        
        meta = extract_video_info(url)
        if not meta:
            raise Exception("未能抓取到元数据，请检查网络或代理是否畅通。")

        update_job("processing", 30, "正在高速拉取无水印源文件...")
        
        # 定义临时文件和最终标准文件的路径
        temp_video_path = os.path.join(task_dir, f"{video_id}_temp.mp4")
        final_video_path = os.path.join(task_dir, f"{video_id}.mp4")
        
        res = subprocess.run([
            "yt-dlp", 
            "-o", temp_video_path, 
            "--no-playlist", 
            "-f", "bestvideo+bestaudio/best", 
            "--merge-output-format", "mp4",
            url
        ], capture_output=True, text=True)
        
        if not os.path.exists(temp_video_path):
            err_detail = res.stderr[:200] if res.stderr else res.stdout[:200]
            raise Exception(f"视频文件下载失败，可能是链接已失效。\n详情: {err_detail}")
            
        update_job("processing", 40, "正在进行全平台兼容性转码 (强制 H.264 洗码)...")

        ffmpeg_res = subprocess.run([
            "ffmpeg", "-y",
            "-i", temp_video_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            final_video_path
        ], capture_output=True, text=True)

        if not os.path.exists(final_video_path):
            raise Exception(f"视频格式化转码失败，请检查服务器 ffmpeg 环境。\n详情: {ffmpeg_res.stderr[:200]}")

        try:
            os.remove(temp_video_path)
        except Exception:
            pass

        video_file = f"{video_id}.mp4"
        video_path = final_video_path

        update_job("analyzing", 45, "提取音轨与关键帧画面...", {"video_rel_path": f"/storage/{username}/{job_id}/{video_file}"})

        update_job("analyzing", 60, "AI 云端大模型深度解构推理中 (约需1~2分钟，请耐心等待)...")
        
        ai_text = get_ai_analysis_with_retry(video_path, meta, model)
        if not ai_text: raise Exception("AI 未能返回有效的分析内容！")

        update_job("cutting", 85, "正在切割多分镜 GIF 并组装报告...")
        segments, analysis = parse_ai_output(ai_text)
        if segments:
            segments = generate_gifs_for_segments_fastapi(video_path, segments, task_dir)

        update_job("cutting", 95, "合成原汁原味的本地化 HTML 网页...")
        
        video_data_list = [{
            'filename': video_file,
            'segments': segments,
            'analysis': analysis,
            'metadata': meta,
            'video_rel_path': f"./{video_file}"
        }]
        
        html_path = create_html_report(task_dir, video_data_list)
        title = analysis.get('short_summary', '分析报告')

        update_job("completed", 100, "✅ 解析完成", {"title": title, "report_url": f"/storage/{username}/{job_id}/report.html?v={int(datetime.now().timestamp())}"})
        write_log(LOG_STORAGE, "成功生成网页数据", html_path)
        
        # ✨ 极致清理：在覆盖全局 Cache 前，物理粉碎旧 Cache 文件夹，确保存留的永远是纯净的最新数据
        try:
            if os.path.exists(cached_task_dir):
                shutil.rmtree(cached_task_dir, ignore_errors=True)
            os.makedirs(cached_task_dir, exist_ok=True)
            for item in os.listdir(task_dir):
                if item == "job.json": continue 
                s = os.path.join(task_dir, item)
                d = os.path.join(cached_task_dir, item)
                if os.path.isdir(s): shutil.copytree(s, d, dirs_exist_ok=True)
                else: shutil.copy2(s, d)
            with open(os.path.join(cached_task_dir, "meta.json"), "w", encoding="utf-8") as f:
                json.dump({"title": title}, f, ensure_ascii=False)
        except: pass

    except Exception as e:
        err_msg = str(e)
        trace_info = traceback.format_exc()
        write_log(LOG_ADMIN, "任务发生中断崩溃", f"报错内容: {err_msg}\n{trace_info}")
        update_job("failed", 0, "任务发生异常", {"error": err_msg})

# 新增：无损更新视频数据与AI理解任务
def update_existing_job_task(username: str, job_id: str):
    task_dir = os.path.join(USERS_DIR, username, job_id)
    job_file = os.path.join(task_dir, "job.json")
    
    def update_job(status, progress, text, extra=None):
        try:
            with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
            job.update({'status': status, 'progress': progress, 'progressText': text})
            if extra: job.update(extra)
            with open(job_file, "w", encoding="utf-8") as f: json.dump(job, f, ensure_ascii=False)
        except: pass

    try:
        with open(job_file, "r", encoding="utf-8") as f: job_data = json.load(f)
        url = job_data.get("url")
        video_id = job_data.get("videoId")
        model = job_data.get("model", "gpt-5.2-chat-latest")
        
        update_job("scraping", 20, "正在无损更新最新视频数据...")
        meta = extract_video_info(url)
        if not meta:
            raise Exception("未能抓取到最新元数据，请检查网络或代理是否畅通。")

        update_job("analyzing", 50, "正在重新获取AI云端理解 (跳过视频下载)...")
        video_file = f"{video_id}.mp4"
        video_path = os.path.join(task_dir, video_file)
        
        if not os.path.exists(video_path):
            raise Exception("本地视频文件已丢失，无法重新分析，请移入回收站后重新发起解析。")

        ai_text = get_ai_analysis_with_retry(video_path, meta, model)
        if not ai_text: raise Exception("AI 未能返回有效的分析内容！")

        segments, analysis = parse_ai_output(ai_text)
        
        # ✨ 极致清理 1：彻底抹除当前目录下的旧 Clips 文件夹，防止残留多余的旧版本 GIF 占用空间
        clips_dir = os.path.join(task_dir, "Clips")
        if os.path.exists(clips_dir):
            shutil.rmtree(clips_dir, ignore_errors=True)

        update_job("cutting", 85, "正在根据最新AI脚本重新切割分镜 (清除旧数据)...")
        if segments:
            # 不再跳过切片，强制重新生成最新的分镜图，确保与最新的 HTML 完全吻合
            segments = generate_gifs_for_segments_fastapi(video_path, segments, task_dir)

        update_job("cutting", 95, "合成最新的本地化 HTML 网页...")
        
        video_data_list = [{
            'filename': video_file,
            'segments': segments,
            'analysis': analysis,
            'metadata': meta,
            'video_rel_path': f"./{video_file}"
        }]
        
        html_path = create_html_report(task_dir, video_data_list)
        title = analysis.get('short_summary', '分析报告')

        update_job("completed", 100, "✅ 数据与AI分析已成功更新", {
            "title": title, 
            "report_url": f"/storage/{username}/{job_id}/report.html?v={int(datetime.now().timestamp())}",
            "createdAt": datetime.now().isoformat()
        })
        write_log(LOG_STORAGE, "无损更新网页数据成功", html_path)
        
        # ✨ 极致清理 2：清空公共全局 Cache 文件夹里的旧数据，换上纯净的最新数据
        try:
            cached_task_dir = os.path.join(CACHE_DIR, video_id)
            if os.path.exists(cached_task_dir):
                shutil.rmtree(cached_task_dir, ignore_errors=True)
            os.makedirs(cached_task_dir, exist_ok=True)
            for item in os.listdir(task_dir):
                if item == "job.json": continue 
                s = os.path.join(task_dir, item)
                d = os.path.join(cached_task_dir, item)
                if os.path.isdir(s): shutil.copytree(s, d, dirs_exist_ok=True)
                else: shutil.copy2(s, d)
            with open(os.path.join(cached_task_dir, "meta.json"), "w", encoding="utf-8") as f:
                json.dump({"title": title}, f, ensure_ascii=False)
        except: pass

    except Exception as e:
        err_msg = str(e)
        trace_info = traceback.format_exc()
        write_log(LOG_ADMIN, "无损更新任务发生异常崩溃", f"报错内容: {err_msg}\n{trace_info}")
        update_job("failed", 0, "数据更新失败", {"error": err_msg})

# ================= 🌐 API 端点 =================
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/storage", StaticFiles(directory=USERS_DIR), name="storage")

class LoginReq(BaseModel): 
    username: str
    mode: str
    password: str = "" 

class UsersReq(BaseModel): users: list
class AnalyzeReq(BaseModel): urls: list; model: str; username: str
class JobReq(BaseModel): username: str
class TestAIReq(BaseModel): model: str; api_key: str 

@app.get("/api/users")
def get_users():
    users = load_db().get("allowed_users", [])
    safe_users = [{"username": u.get("username")} if isinstance(u, dict) else {"username": u} for u in users]
    return {"users": safe_users}

@app.post("/api/admin/users")
def get_admin_users(req: LoginReq):
    if req.mode == 'admin' and req.username == '秦涛' and req.password == 'qt20030802':
        return {"users": load_db().get("allowed_users", [])}
    return JSONResponse(status_code=403, content={"status": "error", "message": "非法访问，拒绝获取核心数据！"})

@app.post("/api/users")
def update_users(req: UsersReq):
    save_db({"allowed_users": req.users})
    return {"status": "success"}

@app.post("/api/login")
def login(req: LoginReq):
    if req.mode == 'admin': 
        if req.username == '秦涛' and req.password == 'qt20030802':
            return {"status": "success"}
        return JSONResponse(status_code=403, content={"status": "error", "message": "对不起，超级管理员身份或密码错误！"})
        
    users = load_db().get("allowed_users", [])
    for u in users:
        if isinstance(u, dict) and u.get("username") == req.username:
            if u.get("password") == req.password:
                return {"status": "success", "api_key": u.get("api_key")}
            else:
                return JSONResponse(status_code=403, content={"status": "error", "message": "访问密码错误，请联系管理员核对！"})
                
    return JSONResponse(status_code=403, content={"status": "error", "message": "对不起，未被录入系统！"})

@app.post("/api/test_ai")
def api_test_ai(req: TestAIReq):
    try:
        headers = {"Authorization": f"Bearer {req.api_key}", "Content-Type": "application/json"}
        payload = {"model": req.model, "messages": [{"role": "user", "content": "Say this is a test!"}], "temperature": 0.7}
        resp = requests.post("https://yunwu.ai/v1/chat/completions", json=payload, headers=headers, timeout=15)
        data = resp.json()
        if resp.ok:
            return {"status": "success", "msg": f"连接成功! 响应: {data['choices'][0]['message']['content']}"}
        else:
            return {"status": "error", "msg": f"连接失败: {data.get('error', {}).get('message', resp.reason)}"}
    except Exception as e:
        return {"status": "error", "msg": f"请求异常: {str(e)}"}

@app.post("/api/analyze")
def api_analyze(req: AnalyzeReq, bg_tasks: BackgroundTasks):
    video_id = get_tiktok_id(req.urls[0])
    user_dir = os.path.join(USERS_DIR, req.username)
    
    # ✨ 极致清理 3：用户端绝对拦截！如果用户重复输入同一个视频链接，自动物理删除旧的任务，只保留最新一次的动作
    if os.path.exists(user_dir):
        for folder in os.listdir(user_dir):
            old_task_dir = os.path.join(user_dir, folder)
            old_job_file = os.path.join(old_task_dir, "job.json")
            if os.path.exists(old_job_file):
                try:
                    with open(old_job_file, "r", encoding="utf-8") as f:
                        old_job = json.load(f)
                    if old_job.get("videoId") == video_id:
                        shutil.rmtree(old_task_dir, ignore_errors=True) # 直接删了旧文件夹腾出空间
                except:
                    pass

    job_id = f"Job_{datetime.now().strftime('%m%d_%H%M%S')}"
    task_dir = os.path.join(USERS_DIR, req.username, job_id)
    os.makedirs(task_dir, exist_ok=True)

    job_data = {
        "id": job_id, "videoId": video_id, "url": req.urls[0], "status": "pending",
        "progress": 5, "progressText": "任务进入执行队列...",
        "createdAt": datetime.now().isoformat(),
        "title": "任务启动处理中...", "username": req.username,
        "model": req.model 
    }
    with open(os.path.join(task_dir, "job.json"), "w", encoding="utf-8") as f: json.dump(job_data, f)
    bg_tasks.add_task(process_video_task, req.urls[0], req.username, job_id, req.model)
    return {"status": "success"}

@app.post("/api/jobs/{job_id}/retry")
def api_retry(job_id: str, req: JobReq, bg_tasks: BackgroundTasks):
    job_file = os.path.join(USERS_DIR, req.username, job_id, "job.json")
    if os.path.exists(job_file):
        with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
        job["status"] = "pending"
        job["progress"] = 5
        job["progressText"] = "任务已被手工重启，正在排队..."
        if "error" in job: del job["error"]
        
        with open(job_file, "w", encoding="utf-8") as f: json.dump(job, f, ensure_ascii=False)
        
        url = job.get("url")
        model = job.get("model", "gpt-5.2-chat-latest")
        if url:
            bg_tasks.add_task(process_video_task, url, req.username, job_id, model)
            return {"status": "success"}
    return JSONResponse(status_code=400, content={"status": "error", "message": "无法重试，该任务的基础文件可能已经丢失或损毁。"})

@app.post("/api/jobs/{job_id}/update")
def api_update(job_id: str, req: JobReq, bg_tasks: BackgroundTasks):
    job_file = os.path.join(USERS_DIR, req.username, job_id, "job.json")
    if os.path.exists(job_file):
        with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
        job["status"] = "pending"
        job["progress"] = 5
        job["progressText"] = "已接收更新指令，准备更新数据..."
        if "error" in job: del job["error"]
        
        with open(job_file, "w", encoding="utf-8") as f: json.dump(job, f, ensure_ascii=False)
        
        bg_tasks.add_task(update_existing_job_task, req.username, job_id)
        return {"status": "success"}
    return JSONResponse(status_code=400, content={"status": "error", "message": "无法更新，该任务的基础配置已丢失。"})

@app.get("/api/jobs")
def api_jobs(username: str):
    user_dir = os.path.join(USERS_DIR, username)
    jobs = []
    if os.path.exists(user_dir):
        for folder in os.listdir(user_dir):
            task_dir = os.path.join(user_dir, folder)
            job_file = os.path.join(task_dir, "job.json")
            if os.path.exists(job_file):
                try:
                    with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
                    if "deletedAt" in job:
                        del_date = datetime.fromisoformat(job["deletedAt"])
                        if (datetime.now() - del_date).days >= 3:
                            shutil.rmtree(task_dir)
                            continue
                    jobs.append(job)
                except: pass
    jobs.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"jobs": jobs}

@app.post("/api/jobs/{job_id}/trash")
def api_trash(job_id: str, req: JobReq):
    job_file = os.path.join(USERS_DIR, req.username, job_id, "job.json")
    if os.path.exists(job_file):
        with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
        job["deletedAt"] = datetime.now().isoformat()
        with open(job_file, "w", encoding="utf-8") as f: json.dump(job, f)
    return {"status": "success"}

@app.post("/api/jobs/{job_id}/restore")
def api_restore(job_id: str, req: JobReq):
    job_file = os.path.join(USERS_DIR, req.username, job_id, "job.json")
    if os.path.exists(job_file):
        with open(job_file, "r", encoding="utf-8") as f: job = json.load(f)
        if "deletedAt" in job: del job["deletedAt"]
        with open(job_file, "w", encoding="utf-8") as f: json.dump(job, f)
    return {"status": "success"}

@app.delete("/api/jobs/{job_id}")
def api_delete(job_id: str, username: str):
    task_dir = os.path.join(USERS_DIR, username, job_id)
    if os.path.exists(task_dir): shutil.rmtree(task_dir)
    return {"status": "success"}

@app.get("/api/export/{username}/{job_id}")
def api_export(username: str, job_id: str):
    task_dir = os.path.join(USERS_DIR, username, job_id)
    zip_path = os.path.join(USERS_DIR, username, f"{job_id}.zip")
    shutil.make_archive(zip_path.replace('.zip', ''), 'zip', task_dir)
    return FileResponse(zip_path, filename=f"TikTok脱机包_{job_id}.zip")

if __name__ == "__main__":
    print(f"\n✅ 内网数据隔离引擎已启动！系统存储根目录严格锁定在：{BASE_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8001)