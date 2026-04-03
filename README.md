# 🎨 乘风数据罗盘 - 前端界面

## 📖 项目简介

本前端项目是「乘风数据罗盘」的可视化交互界面，基于 **React 19 + TypeScript + Vite** 构建，提供 TikTok 账号数据的实时监控、数据大盘、预警中心、账号详情等功能模块。

## 🏗️ 技术架构

| 技术栈 | 用途 |
|--------|------|
| **React 19** | 前端 UI 框架 |
| **TypeScript** | 类型安全开发 |
| **Vite 6** | 极速开发与构建工具 |
| **TailwindCSS 4** | 原子化 CSS 样式框架 |
| **React Router 7** | 客户端路由管理 |
| **TanStack Query** | 服务端状态管理与缓存 |
| **Recharts** | 数据可视化图表库 |
| **Radix UI** | 无障碍 UI 组件库 |
| **Lucide React** | 精美图标库 |
| **Axios** | HTTP 请求库 |
| **date-fns** | 日期处理工具 |

## 📂 目录结构

```
frontend/
├── index.html              # HTML 入口文件
├── package.json            # 项目依赖配置
├── vite.config.ts          # Vite 构建配置
├── tsconfig.json           # TypeScript 配置
├── components.json         # shadcn/ui 组件配置
└── src/
    ├── main.tsx            # React 应用入口
    ├── App.tsx             # 根组件与路由配置
    ├── api.ts              # API 接口封装与类型定义
    ├── index.css           # 全局样式与 Tailwind 配置
    ├── lib/
    │   └── utils.ts        # 工具函数（cn 类名合并）
    ├── components/
    │   ├── Layout.tsx      # 全局布局组件（侧边栏导航）
    │   ├── AddAccountDialog.tsx  # 添加账号弹窗组件
    │   └── ui/             # shadcn/ui 基础组件
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── select.tsx
    │       └── ...
    ├── pages/
    │   ├── Dashboard.tsx       # 数据大盘主页面
    │   ├── AccountDetail.tsx   # 账号详情页面
    │   ├── WarningCenter.tsx   # 预警中心页面
    │   ├── RecycleBin.tsx      # 回收站页面
    │   ├── Settings.tsx        # 系统设置页面
    │   ├── DashboardComponents/    # Dashboard 子组件
    │   │   ├── AccountCard.tsx     # 账号卡片
    │   │   ├── BatchActionBar.tsx  # 批量操作栏
    │   │   ├── DashboardCharts.tsx # 图表面板
    │   │   ├── DashboardFilterBar.tsx  # 筛选条件栏
    │   │   ├── DashboardHeader.tsx     # 页面头部
    │   │   └── DashboardModals.tsx     # 弹窗集合
    │   ├── DashboardHooks/
    │   │   └── useDashboardLogic.ts    # Dashboard 业务逻辑 Hook
    │   ├── AccountDetailComponents/    # 账号详情子组件
    │   │   ├── AccountProfileHeader.tsx  # 账号信息头
    │   │   ├── AccountCharts.tsx         # 趋势图表
    │   │   ├── AccountVideoList.tsx      # 视频列表
    │   │   └── AccountDetailModals.tsx   # 弹窗集合
    │   └── AccountDetailHooks/
    │       └── useAccountDetailLogic.ts  # 账号详情业务逻辑 Hook
    └── services/
        └── tiktokScraper.ts    # （预留）前端爬虫服务
```

## 🖥️ 页面功能说明

### 1. 📊 数据大盘 (Dashboard)

**路由**: `/`（内部号）、`/external`（外部号）

**功能特性**:
- 📈 **PID 趋势图**: 显示指定时间范围内商品挂车数量趋势
- 🏆 **PID 排行榜**: 展示出现次数最多的商品 PID
- 📂 **类目排行榜**: 统计商品类目分布（自动翻译为中文）
- 🃏 **账号卡片列表**: 展示所有账号的核心指标
  - 粉丝数、视频数、日均发布量
  - AI 视频数量统计
  - 实时抓取进度显示
- 🔍 **多维度筛选**: 按分组、国家、关键词筛选
- 📊 **排序功能**: 按更新时间、视频数、注册时间、粉丝数排序
- ✅ **批量操作**: 批量选择账号进行分组、更新、删除
- 📥 **数据导出**: 导出 CSV 格式数据表

### 2. 👤 账号详情 (AccountDetail)

**路由**: `/account/:id`

**功能特性**:
- 🧑‍💻 **账号资料卡**: 头像、昵称、用户名、粉丝数、获赞数
- 📊 **TOP10 视频趋势对比图**: 可自定义选择要对比的视频
- 📈 **每日播放量新增图**: 点击可查看当日发布的视频
- 📹 **视频列表**: 
  - 封面、描述、各项数据指标
  - 商品 PID 标签（点击查看商品详情）
  - 单独刷新、删除、查看趋势
  - 多种排序方式
- 📥 **手动添加视频**: 支持手动录入视频链接
- 📊 **粉丝趋势弹窗**: 查看粉丝增长曲线
- 📁 **数据导出**: 导出账号资料与关联视频

### 3. ⚠️ 预警中心 (WarningCenter)

**路由**: `/warning-center`

**功能特性**:
- 🚀 **正常流量预警**: 筛选播放量达到阈值的爆款视频
- ⚡ **日增长极速预警**: 筛选24小时内增长异常的视频
- 🧊 **低播沉寂预警**: 筛选发布后播放量过低的视频
- 👥 **按作者分组展示**: 折叠式作者区块
- 🔍 **多维度筛选**: 按账号类型、分组、国家、日期范围筛选
- ✅ **批量管理**: 批量选择视频移入回收站
- 📥 **导出预警数据**: 导出当前预警列表

### 4. 🗑️ 回收站 (RecycleBin)

**路由**: `/recycle-bin`

**功能特性**:
- 📹 **被删除的视频**: 查看、恢复或永久删除
- 👤 **被删除的账号**: 查看、恢复或永久删除
- 🧹 **一键清空**: 永久删除所有回收站内容

### 5. ⚙️ 系统设置 (Settings)

**路由**: `/settings`

**功能特性**:
- ⏰ **定时任务配置**: 设置每日自动更新时间
- 📊 **抓取参数配置**: 
  - 内部号默认抓取视频数量
  - 外部号默认抓取视频数量
- ⚠️ **预警阈值配置**:
  - 正常预警播放量起点
  - 正常预警高亮标红点
  - 日增长预警起点
  - 日增长强提醒起点
  - 低播预警判断天数
  - 低播预警播放量阈值
- 🔄 **一键全库更新**: 强制更新所有活跃账号

## 🎨 UI 组件库

基于 **shadcn/ui** 构建的组件库，所有组件位于 `src/components/ui/`：

| 组件 | 说明 |
|------|------|
| `Button` | 按钮组件，支持多种变体 |
| `Card` | 卡片容器组件 |
| `Dialog` | 模态对话框组件 |
| `Input` | 输入框组件 |
| `Select` | 下拉选择组件 |
| `Avatar` | 头像组件 |
| `Label` | 表单标签组件 |
| `DropdownMenu` | 下拉菜单组件 |
| `RadioGroup` | 单选组组件 |

## 📡 API 接口调用

所有 API 调用封装在 `src/api.ts`，使用 Axios 进行 HTTP 请求：

```typescript
// API 接口示例
export const api = {
  // 账号相关
  getAccounts: async (type?: string) => { ... },
  addAccount: async (username: string, type: string) => { ... },
  getAccountDetails: async (id: number, days: number) => { ... },
  refreshAccount: async (id: number, limit: number) => { ... },
  
  // 视频相关
  getFilteredVideos: async (filterType: string, filterVal: string) => { ... },
  getVideoTrend: async (videoId: string, days: number) => { ... },
  deleteVideo: async (videoId: string) => { ... },
  
  // 大盘与预警
  getDashboardStats: async (type?: string, days: number) => { ... },
  getWarningVideos: async (type: 'normal' | 'growth' | 'low') => { ... },
  
  // 商品信息
  getProductInfo: async (pid: string) => { ... },
  
  // 系统设置
  getSettings: async () => { ... },
  saveSettings: async (settings: any) => { ... },
};
```

## 🚀 启动方式

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
cd frontend
npm install
```

### 开发模式启动

```bash
npm run dev
```

服务将运行于 `http://localhost:5173`

### 生产构建

```bash
npm run build
```

构建产物位于 `dist/` 目录

### 使用一键启动脚本

直接运行项目根目录的 `乘风数据罗盘(一键启动).bat` 即可同时启动前后端服务。

## 🎯 核心设计理念

### 1. 状态管理策略

- **TanStack Query**: 用于服务端状态缓存，设置 5 分钟 staleTime
- **SessionStorage**: 用于页面内状态记忆（筛选条件、滚动位置）
- **LocalStorage**: 用于持久化用户偏好（趋势图选中视频）

### 2. 组件拆分原则

- **页面组件**: 负责路由入口与整体布局
- **子组件**: 负责具体功能区块的渲染
- **自定义 Hook**: 封装业务逻辑与状态管理

### 3. 性能优化

- **懒加载**: 预警中心使用滚动懒加载
- **useMemo**: 缓存计算结果避免重复渲染
- **防抖轮询**: 进度状态使用间隔轮询而非 WebSocket
- **缓存优先**: 优先显示缓存数据，后台静默更新

## 🎨 主题与样式

- **设计风格**: 简约现代的数据可视化风格
- **主色调**: Indigo 紫蓝色系 (#4F46E5)
- **字体**: Nunito（英文）+ 系统中文字体
- **暗色模式**: 预留 CSS 变量，支持扩展

## ⚠️ 注意事项

1. **后端依赖**: 前端运行需要后端 API 服务（端口 3000）
2. **跨域配置**: Vite 开发服务器已配置 API 代理
3. **图片防盗链**: TikTok 图片需设置 `referrerPolicy="no-referrer"`
4. **浏览器兼容**: 推荐使用 Chrome/Edge 最新版本

## 📝 开发备注

- 使用 `key` 属性强制重新挂载组件，隔离内部号/外部号状态
- 图表使用 Recharts 库，支持响应式与交互
- 弹窗组件使用 Radix UI Dialog，支持键盘导航
- 批量操作使用 Set 数据结构管理选中状态
