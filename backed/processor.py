import os
import re
import base64
import subprocess
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from config import API_KEY, BASE_URL
from utils import time_to_sec
from openai import OpenAI

def extract_audio(video_path):
    audio_path = os.path.splitext(video_path)[0] + ".mp3"
    if os.path.exists(audio_path): return audio_path
    cmd = ["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "libmp3lame", "-q:a", "4", audio_path]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    return audio_path

def extract_video_frames(video_path, num_frames=3):
    frames_base64 = []
    try:
        dur_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", video_path]
        duration = float(subprocess.check_output(dur_cmd).decode().strip())
        timestamps = [duration * 0.2, duration * 0.5, duration * 0.8]
        for i, ts in enumerate(timestamps):
            out_img = video_path + f"_temp_frame_{i}.jpg"
            cmd = ["ffmpeg", "-y", "-ss", str(ts), "-i", video_path, "-vframes", "1", "-vf", "scale=512:-1", "-q:v", "5", out_img]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
            if os.path.exists(out_img):
                with open(out_img, "rb") as img_f:
                    b64_str = base64.b64encode(img_f.read()).decode('utf-8')
                    frames_base64.append(f"data:image/jpeg;base64,{b64_str}")
                os.remove(out_img) 
    except: pass
    return frames_base64

def get_ai_analysis_with_retry(video_path, metadata, model_name):
    audio_path = extract_audio(video_path)
    if not os.path.exists(audio_path): return None
    
    client = OpenAI(api_key=API_KEY, base_url=BASE_URL)
    try:
        with open(audio_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(model="whisper-1", file=audio_file, response_format="srt")
        srt_content = transcription if isinstance(transcription, str) else transcription.text
    except: srt_content = "[无对白/纯音乐]"
    
    video_frames = extract_video_frames(video_path)
    
    if not metadata:
        metadata = {
            'author': '未知', 'author_id': '', 'register_time': '', 'fans': 0, 'publish_time': '未知',
            'category': '本地视频', 'sub_tag': '未知', 'product_id': 'N/A', 
            'video_type': '未知', 'duration': 0, 'vq_score': '', 'ai_video': '否', 'music': '未知',
            'stats': {'play': 0, 'digg': 0, 'comment': 0, 'share': 0, 'collect': 0}, 'desc': '本地直接导入',
            'crawl_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    meta_info_str = f"""
    【📊 抓取到的硬数据】
    - 采集时间：{metadata.get('crawl_time', '')}
    - 创作者信息：作者名 @{metadata['author']} | 注册时间 {metadata.get('register_time', '未知')} | 粉丝数 {metadata['fans']}
    - 视频属性：平台类目 [{metadata['category']}] | 细分标签 [{metadata['sub_tag']}] | 视频类型 [{metadata.get('video_type', '未知')}]
    - 硬件参数：视频时长 {metadata.get('duration', 0)}秒 | 画质得分 {metadata.get('vq_score', '无')} | AI生成 {metadata.get('ai_video', '否')}
    - 关联产品PID：{metadata['product_id']}
    - 音乐：{metadata.get('music', '原声')}
    - 核心数据：播放 {metadata['stats']['play']} | 点赞 {metadata['stats']['digg']} | 评论 {metadata['stats']['comment']} | 分享 {metadata['stats']['share']} | 收藏 {metadata['stats']['collect']}
    - 视频文案：{metadata['desc']}
    """
    system_prompt = f"""
    你是一个资深的TikTok短视频运营专家。
    请先根据视频内容，严格按照以下格式输出分镜脚本：
    00:00 - 00:03 | 英文原文 | 中文翻译 | 画面视觉描述
    (注意：每一行分镜必须包含这4个部分，并用 | 分隔)

    ===AI_REPORT===
    【评分】：打分（务必采用百分制，满分100分，仅输出纯数字格式，例如：85）
    【文件名总结】：15字以内
    【详细深度分析】：详细内容
    【修改建议】：具体建议
    字幕：{srt_content}
    """
    messages = [{"role": "system", "content": "你是分析专家。"}, {"role": "user", "content": [{"type": "text", "text": system_prompt + "\n" + meta_info_str}]}]
    for b64_img in video_frames:
        messages[1]["content"].append({"type": "image_url", "image_url": {"url": b64_img, "detail": "low"}})
    
    try:
        response = client.chat.completions.create(model=model_name, messages=messages, max_tokens=2000, timeout=180)
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"AI云端接口请求超时或报错。错误详情: {str(e)}")

def parse_ai_output(text):
    if not text: return [], {}
    parts = text.split("===AI_REPORT===")
    script_text, report_text = parts[0].strip(), (parts[1].strip() if len(parts) > 1 else "")
    segments = []
    pattern = re.compile(r"(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*\|(.*?)\|(.*?)\|(.*)")
    for line in script_text.split('\n'):
        match = pattern.search(line)
        if match:
            s_str, e_str, o, t, v = match.groups()
            segments.append({'start_str': s_str, 'end_str': e_str, 'start_sec': time_to_sec(s_str), 'end_sec': time_to_sec(e_str), 'origin': o.strip(), 'trans': t.strip(), 'visual': v.strip(), 'gif_path': ""})
    
    analysis = {"score": "0", "short_summary": "报告", "detail_summary": "暂无", "suggestions": "暂无"}
    if report_text:
        score_m = re.search(r"【评分】[：:]\s*(\d+)", report_text)
        if score_m: analysis["score"] = score_m.group(1)
        short_m = re.search(r"【文件名总结】[：:]\s*(.+)", report_text)
        if short_m: analysis["short_summary"] = short_m.group(1).strip()
        d_m = re.search(r"【详细深度分析】[：:]\s*(.+?)(?=【修改建议】|$)", report_text, re.DOTALL)
        if d_m: analysis["detail_summary"] = d_m.group(1).strip().replace('\n', '<br>')
        s_m = re.search(r"【修改建议】[：:]\s*(.+)", report_text, re.DOTALL)
        if s_m: analysis["suggestions"] = s_m.group(1).strip().replace('\n', '<br>')
    return segments, analysis

def cut_gif(args):
    video_path, start, end, out = args
    cmd = ["ffmpeg", "-y", "-ss", str(start), "-t", str(max(end-start, 1.0)), "-i", video_path, "-vf", "fps=10,scale=360:-1", out]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    return out

def generate_gifs_for_segments_fastapi(video_path, segments, task_dir):
    gif_dir = os.path.join(task_dir, "Clips")
    os.makedirs(gif_dir, exist_ok=True)
    tasks = []
    for i, seg in enumerate(segments):
        gif_filename = f"clip_{i+1:02d}.gif"
        out_path = os.path.join(gif_dir, gif_filename)
        tasks.append((video_path, seg['start_sec'], seg['end_sec'], out_path))
        seg['gif_path'] = f"Clips/{gif_filename}"
    with ThreadPoolExecutor() as exe: list(exe.map(cut_gif, tasks))
    return segments

def create_html_report(save_dir, video_data_list):
    if not video_data_list: return None
    summary = video_data_list[0]['analysis'].get('short_summary', '分析报告')
    clean_summary = re.sub(r'[\\/*?:\'<>|]', '', summary)[:20]
    
    final_filename = "report.html"
    html_path = os.path.join(save_dir, final_filename)
    
    header_html = """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>TikTok 批量复盘报告</title>
        <style>
            body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 1200px; margin: 0 auto; }
            .video-card { background: #fff; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); margin-bottom: 30px; overflow: hidden; display: flex; flex-direction: column; }
            .dashboard { display: flex; border-bottom: 1px solid #edf2f7; background: #fff; }
            .dash-left { flex: 0 0 350px; background: #000; display: flex; align-items: center; justify-content: center; position: relative; }
            video { width: 100%; max-height: 600px; }
            .dash-right { flex: 1; padding: 30px; position: relative; }
            .score-circle { position: absolute; top: 30px; left: 30px; width: 64px; height: 64px; border-radius: 50%; border: 4px solid #2ecc71; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; color: #2ecc71; background: #fff; box-shadow: 0 4px 10px rgba(46, 204, 113, 0.2); }
            .score-num { font-size: 24px; line-height: 1; }
            .score-label { font-size: 10px; margin-top: 2px; }
            .header-info { margin-left: 85px; margin-bottom: 25px; }
            .author-line { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
            .author-name { font-size: 22px; font-weight: 800; color: #1a202c; margin: 0; }
            .link-btn { text-decoration: none; font-size: 12px; background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; transition: all 0.2s; }
            .link-btn:hover { background: #c7d2fe; }
            .tags-container { display: flex; flex-wrap: wrap; gap: 8px; }
            .tag { font-size: 12px; padding: 5px 12px; border-radius: 6px; background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; }
            .tag-pid { background: #fffaf0; border-color: #fbd38d; color: #9c4221; font-weight: bold; }
            .tag-data { background: #ebf8ff; border-color: #90cdf4; color: #2b6cb0; }
            .tag-time { background: #f0fff4; border-color: #9ae6b4; color: #276749; }
            .content-section { margin-top: 25px; }
            .section-title { font-size: 16px; font-weight: bold; color: #2d3748; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
            .section-title::before { content: ""; display: inline-block; width: 4px; height: 16px; background: #3182ce; border-radius: 2px; }
            .section-box { background: #f8fafc; border-radius: 10px; padding: 15px; font-size: 14px; line-height: 1.6; color: #4a5568; margin-bottom: 20px; }
            .section-box-sug { background: #fffaf0; border: 1px solid #feebc8; color: #7b341e; }
            table { width: 100%; border-collapse: collapse; background: #fff; }
            th { background: #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600; text-align: left; padding: 12px 20px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 20px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .col-time { width: 80px; font-family: monospace; color: #3182ce; font-weight: bold; }
            .col-script { width: 30%; border-right: 1px dashed #e2e8f0; }
            .col-visual { padding-left: 25px; }
            .col-gif { width: 180px; text-align: center; }
            .dialogue-origin { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
            .dialogue-trans { font-size: 15px; font-weight: 600; color: #1e293b; line-height: 1.4; }
            .visual-desc { font-size: 14px; line-height: 1.6; color: #334155; }
            .gif-img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; transition: transform 0.2s; }
            .gif-img:hover { transform: scale(1.05); }
        </style>
    </head>
    <body><div class="container">
    """

    body_html = ""
    for vd in video_data_list:
        anl, meta = vd['analysis'], vd.get('metadata')
        origin_url = meta['url'] if meta else "#"
        try: score = int(anl['score'])
        except: score = 0
        score_color = "#2ecc71" if score >= 80 else ("#f39c12" if score >= 60 else "#e74c3c")
        
        fans_display = f"{meta['fans']:,}" if meta and isinstance(meta['fans'], int) else (meta['fans'] if meta else 0)
        play_display = f"{meta['stats']['play']:,}" if meta and isinstance(meta['stats']['play'], int) else (meta['stats']['play'] if meta else 0)
        digg_display = f"{meta['stats']['digg']:,}" if meta and isinstance(meta['stats']['digg'], int) else (meta['stats']['digg'] if meta else 0)

        vd_html = f"""
        <div class="video-card">
            <div class="dashboard">
                <div class="dash-left">
                    <video controls src="{vd['video_rel_path']}"></video>
                </div>
                <div class="dash-right">
                    <div class="score-circle" style="border-color: {score_color}; color: {score_color};">
                        <span class="score-num">{score}</span>
                        <span class="score-label">深度分</span>
                    </div>
                    <div class="header-info">
                        <div class="author-line">
                            <h2 class="author-name">@{meta['author'] if meta else '本地'}</h2>
                            <a href="{origin_url}" class="link-btn" target="_blank">🔗 原始视频链接</a>
                        </div>
                        <div class="tags-container">
                            <span class="tag tag-data">🆔 作者ID: {meta.get('author_id', '未知') if meta else '未知'}</span>
                            <span class="tag tag-time">🕰️ 注册时间: {meta.get('register_time', '未知') if meta else '未知'}</span>
                            <span class="tag tag-data">👥 粉丝数: {fans_display}</span>
                            
                            <span class="tag">📂 类目: {meta['category'] if meta else '本地'}</span>
                            <span class="tag">🧩 标签: {meta['sub_tag'] if meta else '未知'}</span>
                            <span class="tag tag-pid">📦 视频类型: {meta.get('video_type', '未知') if meta else '未知'}</span>
                            <span class="tag tag-time">📅 发布时间: {meta['publish_time'] if meta else 'N/A'}</span>
                            <span class="tag tag-time">⏱️ 视频时长: {meta.get('duration', 0) if meta else 0}s</span>
                            <span class="tag">🎵 音乐名称: {meta.get('music', '原声') if meta else '原声'}</span>
                            <span class="tag">🤖 AI视频: {meta.get('ai_video', '否') if meta else '否'}</span>
                            {f"<span class='tag'>📺 画质得分: {meta.get('vq_score')}</span>" if meta and meta.get('vq_score') else ""}
                            <span class="tag tag-pid">🛍️ 关联产品PID: {meta['product_id'] if meta else 'N/A'}</span>
                            
                            <span class="tag tag-data">▶️ 播放量: {play_display}</span>
                            <span class="tag tag-data">❤️ 点赞量: {digg_display}</span>
                            <span class="tag tag-data">💬 评论数: {meta['stats']['comment'] if meta else 0}</span>
                            <span class="tag tag-data">🔄 分享数: {meta['stats']['share'] if meta else 0}</span>
                            <span class="tag tag-data">⭐ 收藏数: {meta['stats']['collect'] if meta else 0}</span>
                            
                            <span class="tag" style="font-size:10px;">🕒 采集时间: {meta.get('crawl_time', '') if meta else ''}</span>
                        </div>
                    </div>
                    <div class="content-section">
                        <div class="section-title">📊 深度拆解</div>
                        <div class="section-box">{anl['detail_summary']}</div>
                        <div class="section-title">💡 修改建议</div>
                        <div class="section-box section-box-sug">{anl['suggestions']}</div>
                    </div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="col-time">时间轴</th>
                        <th class="col-script">台词 / 翻译</th>
                        <th class="col-visual">画面脚本</th>
                        <th class="col-gif">AI 分镜</th>
                    </tr>
                </thead>
                <tbody>
        """
        for seg in vd['segments']:
            vd_html += f"""
                    <tr>
                        <td class="col-time">{seg['start_str']}<br>↓<br>{seg['end_str']}</td>
                        <td class="col-script">
                            <div class="dialogue-origin">{seg['origin']}</div>
                            <div class="dialogue-trans">{seg['trans']}</div>
                        </td>
                        <td class="col-visual">
                            <div class="visual-desc">{seg['visual']}</div>
                        </td>
                        <td class="col-gif"><img class="gif-img" src="{seg['gif_path']}" loading="lazy"></td>
                    </tr>
            """
        vd_html += "</tbody></table></div>"
        body_html += vd_html
    
    footer_html = "</div></body></html>"
    with open(html_path, "w", encoding="utf-8") as f: f.write(header_html + body_html + footer_html)
    return html_path