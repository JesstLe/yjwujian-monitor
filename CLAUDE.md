# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在本项目中工作提供指导。

## 项目概述

永劫无间藏宝阁价格监控系统 - 类似股票盯盘的实时价格监控工具，用于监控网易 CBG（藏宝阁）游戏市场物品价格。

## 命令

```bash
# 开发（同时运行后端 + 前端）
pnpm dev

# 开发（单独运行）
pnpm dev:backend    # Express 服务，端口 3000（tsx watch）
pnpm dev:frontend   # Vite 开发服务器，端口 5173

# 生产环境
pnpm build          # 构建前端（vite build）
pnpm start          # 运行后端服务
pnpm preview        # 预览生产构建

# 测试
pnpm test           # 单元/集成测试（vitest）
pnpm test:watch     # Vitest 监听模式
pnpm test:e2e       # E2E 测试（playwright）
pnpm test:e2e:ui   # E2E 测试（UI 模式）

# 代码质量
pnpm lint           # ESLint
pnpm typecheck      # TypeScript 检查

# 数据库
pnpm db:init        # 初始化 SQLite 数据库
```

## 架构

### 后端（Express + TypeScript）
- 验证：使用 Zod 进行请求验证和类型安全
- 入口：`src/backend/index.ts` - 服务配置、中间件、静态文件服务
- 路由：`src/backend/routes/` - REST API 端点（items, watchlist, groups, alerts, settings, monitor）
- 服务：`src/backend/services/` - 业务逻辑层
  - `cbg.ts` - 外部 CBG API 客户端，带速率限制和降级方案
  - `monitor.ts` - Cron 定时价格检查（默认 5 分钟间隔）
  - `alert.ts` - 价格提醒触发逻辑
  - `notification.ts` - 多平台通知服务（浏览器、webhook）
- 数据库：`src/backend/db/` - SQLite（better-sqlite3），WAL 模式已启用

### 前端（React + Vite）
- 入口：`src/frontend/main.tsx`
- 组件：`src/frontend/components/` - Dashboard、SearchPanel、Watchlist、Settings、ItemCard
- API 客户端：`src/frontend/services/api.ts` - 封装所有后端 API 调用

### 共享类型
- `src/shared/types.ts` - 通用 TypeScript 接口定义

### 数据库表（SQLite）
`items`、`groups`、`watchlist`、`price_history`、`alerts`、`settings`

## 路径别名

```typescript
"@/*"        → "./src/*"
"@backend/*" → "./src/backend/*"
"@frontend/*" → "./src/frontend/*"
"@shared/*"  → "./src/shared/*"
```

## 环境配置

参考 `.env.example`：
- `PORT` - 后端服务端口（默认 3000）
- `DATABASE_PATH` - SQLite 数据库文件路径
- `CBG_BASE_URL` - 外部 API 基础 URL
- `CBG_REQUEST_DELAY_MS` - 速率限制延迟
- `CHECK_INTERVAL_MINUTES` - 监控间隔时间

## 外部 API 集成

`cbg.ts` 服务负责与网易 CBG 市场通信：
- 从聚合 API 降级到旧版 API 的备选方案
- 实现可配置的速率限制
- 支持多分类/稀有度物品搜索

## 测试结构

- `tests/unit/` - 单元测试
- `tests/integration/` - 集成测试（API 端点、数据库操作）
- `tests/e2e/` - Playwright E2E 测试
