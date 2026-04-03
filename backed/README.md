# 🚀 乘风数据罗盘 - 后端服务

## 📖 项目简介

本后端服务是「乘风数据罗盘」的核心数据处理引擎，基于 **FastAPI** 框架构建，负责 TikTok 账号主页数据的实时抓取、解析、存储与 API 接口服务。

## 🏗️ 技术架构

| 技术栈 | 用途 |
|--------|------|
| **FastAPI** | 高性能异步 Web 框架 |
| **SQLite + WAL** | 轻量级数据库，开启 WAL 模式支持高并发读写 |
| **yt-dlp** | TikTok 视频列表抓取工具 |
| **BeautifulSoup4** | HTML 解析与数据提取 |
| **APScheduler** | 定时任务调度器 |
| **ThreadPoolExecutor** | 多线程并发抓取 |
| **deep-translator** | 自动翻译商品类目为中文 |
| **curl_cffi** | 绕过反爬虫机制请求商品数据 |

## 📂 目录结构

```
backed/
├── main.py              # FastAPI 应用入口，注册路由与中间件
├── database.py          # 数据库连接与初始化（SQLite + WAL 模式）
├── models.py            # Pydantic 数据模型与辅助函数
├── scraper.py           # TikTok 数据抓取与解析核心逻辑
├── services.py          # 业务逻辑层（并发抓取、定时任务）
└── routers/             # API 路由模块
    ├── accounts.py      # 账号管理相关 API
    ├── videos.py        # 视频管理相关 API
    ├── dashboard.py     # 数据大盘与预警 API
    ├── products.py      # 商品 PID 信息查询 API
    └── system.py        # 系统设置与全局操作 API
```

## 🗄️ 数据库设计

数据库存储于 `D:\TiktokData\chengfeng_data.db`，包含以下核心表：

### 1. `accounts` - 账号表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | TikTok 用户名（唯一） |
| nickname | TEXT | 昵称 |
| avatar_url | TEXT | 头像链接 |
| type | TEXT | 账号类型：`internal`(内部号) / `external`(外部号) |
| status | TEXT | 状态：`active` / `deleted` |
| group_name | TEXT | 分组名称 |
| country | TEXT | 所属国家 |
| custom_name | TEXT | 自定义备注名 |
| mcn | TEXT | MCN 机构 |
| uid | TEXT | TikTok 原生 UID |
| reg_time | TEXT | 账号注册时间（系统推算） |
| created_at | TEXT | 添加到系统的时间 |
| last_updated | DATETIME | 最后更新时间 |
| deleted_at | DATETIME | 删除时间 |

### 2. `videos` - 视频表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| account_id | INTEGER | 关联账号 ID |
| video_id | TEXT | TikTok 视频 ID |
| desc | TEXT | 视频描述 |
| create_time | INTEGER | 发布时间戳 |
| duration | INTEGER | 视频时长（秒） |
| play_count | INTEGER | 播放量 |
| digg_count | INTEGER | 点赞量 |
| comment_count | INTEGER | 评论数 |
| share_count | INTEGER | 分享数 |
| collect_count | INTEGER | 收藏数 |
| cover_url | TEXT | 封面图链接 |
| platform_category | TEXT | 平台类目名称 |
| sub_label | TEXT | 内容细分标签 |
| vq_score | TEXT | 视频画质得分 |
| is_ai | TEXT | 是否 AI 生成视频 |
| video_type | TEXT | 视频类型（电商/带货/普通流量） |
| music_name | TEXT | 背景音乐名称 |
| pid | TEXT | 商品 PID |
| product_category | TEXT | 商品类目 |
| display_category | TEXT | 翻译后的中文类目 |
| is_deleted | INTEGER | 是否移入回收站 |

### 3. `snapshots` - 账号快照表
记录账号每次更新时的粉丝数、点赞数、视频数等统计数据，用于绘制趋势图。

### 4. `video_snapshots` - 视频快照表
记录每个视频每次抓取时的播放量、点赞数等，用于追踪视频增长曲线。

### 5. `settings` - 系统设置表
存储定时任务时间、抓取视频数量限制、预警阈值等配置参数。

## 🔌 API 接口说明

### 📊 Dashboard 大盘接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 获取大盘统计数据（PID趋势、排行榜） |
| GET | `/api/warnings` | 获取预警视频列表（正常/日增/低播） |

### 👤 账号管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/accounts` | 获取账号列表 |
| POST | `/api/accounts` | 添加新账号 |
| GET | `/api/accounts/{id}` | 获取账号详情（含视频列表、趋势数据） |
| PUT | `/api/accounts/{id}/meta` | 更新账号备注信息 |
| POST | `/api/accounts/{id}/refresh` | 触发账号数据更新 |
| POST | `/api/accounts/{id}/delete` | 软删除账号（移入回收站） |
| POST | `/api/accounts/{id}/restore` | 恢复已删除账号 |
| DELETE | `/api/accounts/{id}` | 永久删除账号 |
| GET | `/api/accounts/{id}/progress` | 获取账号抓取进度 |
| GET | `/api/accounts/{id}/export` | 导出单个账号数据 |
| POST | `/api/accounts/{id}/add_video` | 手动添加视频链接 |
| POST | `/api/accounts/batch/delete` | 批量删除账号 |
| PUT | `/api/accounts/batch/group` | 批量修改分组 |
| PUT | `/api/accounts/batch/meta` | 批量修改账号属性 |

### 🎬 视频管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/videos/filter` | 按条件筛选视频 |
| GET | `/api/videos/deleted` | 获取回收站视频 |
| GET | `/api/videos/{video_id}/trend` | 获取视频播放趋势 |
| POST | `/api/videos/{video_id}/delete` | 软删除视频 |
| POST | `/api/videos/{video_id}/restore` | 恢复视频 |
| DELETE | `/api/videos/{video_id}` | 永久删除视频 |
| POST | `/api/videos/{video_id}/refresh_single` | 单独抓取更新视频 |
| POST | `/api/videos/batch/delete` | 批量删除视频 |

### 🛍️ 商品信息接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/product/{pid}` | 获取商品详情（价格、销量、佣金率等） |

### ⚙️ 系统设置接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings` | 获取系统设置 |
| POST | `/api/settings` | 保存系统设置 |
| POST | `/api/settings/force_update_all` | 强制更新所有活跃账号 |
| GET | `/api/progress/all` | 获取所有账号的抓取进度 |
| GET | `/api/export` | 导出全部数据 |
| DELETE | `/api/recycle_bin/empty` | 清空回收站 |

## 🕷️ 抓取机制

### 数据抓取流程

```
1. 用户添加 TikTok 账号主页链接
    ↓
2. 使用 yt-dlp 提取账号视频列表 URL
    ↓
3. 并发抓取每个视频页面 HTML（5线程）
    ↓
4. BeautifulSoup 解析 SIGI_STATE JSON 数据
    ↓
5. 提取视频信息、作者信息、商品 PID
    ↓
6. 翻译商品类目为中文
    ↓
7. 写入 SQLite 数据库（支持 UPSERT）
    ↓
8. 生成账号快照与视频快照
```

### 抓取数据字段

- **作者信息**: 昵称、头像、粉丝数、关注数、获赞数、视频数、注册时间
- **视频信息**: 播放量、点赞、评论、分享、收藏、时长、封面、描述
- **平台标签**: 类目ID、细分标签、画质得分、AI视频标记
- **电商数据**: 商品PID、商品类目（自动翻译为中文）

### 定时任务

- **每日定时更新**: 按设定时间自动更新所有活跃账号
- **每小时视频追踪**: 自动为缺失快照的视频补充增量数据

## 🚀 启动方式

### 环境要求
- Python 3.10+
- Conda 环境（推荐使用 py310）

### 依赖安装

```bash
pip install fastapi uvicorn sqlite3 yt-dlp beautifulsoup4 requests pydantic apscheduler deep-translator curl_cffi
```

### 启动服务

```bash
cd backed
python main.py
```

服务将运行于 `http://127.0.0.1:3000`

### 使用一键启动脚本

直接运行项目根目录的 `乘风数据罗盘(一键启动).bat` 即可同时启动前后端服务。

## ⚠️ 注意事项

1. **数据库路径**: 数据库存储于 `D:\TiktokData\chengfeng_data.db`，请确保该目录存在且有写入权限
2. **网络环境**: 抓取 TikTok 数据需要能够访问 TikTok 官网
3. **浏览器调试端口**: 如需抓取新账号数据，部分功能可能需要配合 Chrome 9222 调试端口
4. **商品数据**: 商品详情数据来源于 FastMoss 第三方平台，需要网络畅通

## 📝 开发备注

- 使用 WAL 模式解决 SQLite 高并发读写阻塞问题
- 使用 ThreadPoolExecutor 实现多线程并发抓取
- API 支持 CORS 跨域，方便前端开发调试
- 所有删除操作默认为软删除，支持数据恢复
