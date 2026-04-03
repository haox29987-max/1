from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # 🚀 新增导入：静态文件服务
from database import init_db, COVERS_DIR # 🚀 新增导入：获取刚刚创建的本地目录配置

# 导入拆分后的路由板块
from routers import accounts, videos, dashboard, products, system, ai

# 1. 初始化数据库
init_db()

# 2. 创建 FastAPI 实例
app = FastAPI(title="乘风数据罗盘 API")

# 3. 配置跨域支持
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# 🚀 新增：挂载本地静态资源目录，前端可以直接通过 /api/covers/{账号id}/{视频id}.jpg 访问图片
app.mount("/api/covers", StaticFiles(directory=COVERS_DIR), name="covers")

# 4. 注册拆分后的各个业务板块路由
app.include_router(dashboard.router)
app.include_router(accounts.router)
app.include_router(videos.router)
app.include_router(products.router)
app.include_router(system.router)
app.include_router(ai.router) # 挂载 AI 路由

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=3000, reload=False)