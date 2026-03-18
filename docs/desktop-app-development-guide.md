# 永劫无间藏宝阁助手桌面版开发文档

本文档用于指导本项目从当前的 TypeScript Web 架构重构为 **全 Rust 桌面应用**。

目标读者：负责重构桌面版的其他 agent / 开发者。

本文档不是概念讨论，而是实施规格。默认读者已经可以访问本仓库，并会在当前 `main` 基础上继续开发。

---

## 1. 文档目的

本项目当前是一个典型的前后端同仓 Web 应用：

- 前端：React + Vite + TailwindCSS
- 后端：Express + TypeScript
- 数据层：SQLite
- 外部数据源：网易 CBG 及相关图片资源域名

现在路线正式变更为：

**前端和后端都重构为 Rust。**

本次开发目标不是继续修补 Electron + Express，而是：

1. 将桌面主架构切换为全 Rust 技术栈
2. 保留现有产品能力：搜索、监控、提醒、对比、图片导出、设置、许可证/认证逻辑
3. 保持应用继续能访问远程 CBG 网站/API
4. 保留本地 SQLite 持久化能力
5. 为 Windows 打包与后续桌面发布建立稳定基础

---

## 2. 当前代码现状与重构结论

### 2.1 现状总结

当前仓库的核心能力分散在两侧：

- `src/frontend/`：React 页面与交互
- `src/backend/`：Express 路由、CBG 请求、图片代理、监控任务、通知、SQLite

这意味着当前产品逻辑并不是“只有页面”，而是：

```text
React UI
  -> /api/*
  -> Express
  -> SQLite / CBG / 图片资源 / 通知服务
```

### 2.2 这次重构意味着什么

既然决定“前后端都用 Rust”，就要接受下面这个事实：

- 这不是把 Express 换个语言壳
- 这不是把 React 套进另一个桌面容器
- 这是一次**完整的桌面应用架构迁移**

重构后，现有 TypeScript 前后端都将逐步退出主实现路径。

### 2.3 主决策

本项目的 Rust 桌面化主线采用：

**Tauri v2 + Leptos + Rust core/service/data crates + SQLite**

说明：

- `Tauri v2` 负责桌面应用壳、窗口、打包、系统能力桥接
- `Leptos` 负责 Rust/WASM UI
- Rust 核心 crate 负责业务逻辑、数据访问、远程请求、监控、通知
- SQLite 保持本地持久化

不采用：

- 继续 Electron + Express
- Dioxus Desktop 作为主线
- 纯本地 HTTP 服务再套 Rust UI
- 远程 SaaS 后端依赖

### 2.4 为什么选这条路

1. **满足“前后端都用 Rust”**
   - UI 与业务层都能统一到 Rust 生态

2. **桌面交付成功率高于纯 Rust 原生 UI 路线**
   - Tauri 在跨平台打包、系统集成、Windows 路线方面更成熟

3. **避免 Node 原生模块复杂度**
   - 可以摆脱 `better-sqlite3` 这类 Electron 原生模块痛点

4. **更适合渐进迁移现有业务逻辑**
   - 可以把旧后端能力逐步迁移到 Rust crate，而不是先做 UI 再补底层

5. **对图片密集与交互页面仍然保留 WebView 灵活性**
   - 比完全原生控件 UI 更容易落地图像、预览、复杂布局

---

## 3. 目标架构

### 3.1 运行拓扑

```text
Tauri App
  ├─ Rust Core
  │   ├─ Domain services
  │   ├─ SQLite repositories
  │   ├─ CBG HTTP client
  │   ├─ Image download/cache pipeline
  │   ├─ Monitor scheduler
  │   └─ Notification adapters
  │
  ├─ Tauri Commands / Events
  │   ├─ UI -> command invoke
  │   └─ Core -> event push
  │
  └─ Leptos UI (Rust/WASM)
      ├─ search/watchlist/settings/compare pages
      ├─ local app state
      └─ typed command calls
```

### 3.2 与旧架构的本质区别

旧架构：

```text
React -> HTTP /api -> Express -> DB / Remote APIs
```

新架构：

```text
Leptos UI -> Tauri command -> Rust core -> DB / Remote APIs
```

关键变化：

- 不再保留本地 Express 作为长期主路径
- 不再保留 `/api` 作为内部通信主接口
- 不再依赖 Node/TypeScript 后端运行时
- UI 与业务逻辑之间改为 **typed command/event boundary**

### 3.3 通信方式

#### UI -> Core

- 使用 Tauri commands
- 对长流程或实时进度使用 Tauri events
- 不使用本地 HTTP 服务作为主通信方式

#### Core -> Remote Websites/APIs

- 使用 Rust HTTP 客户端直接请求远程 CBG 与图片资源域名
- 由 Rust 端统一处理请求头、限流、重试、缓存、错误恢复

#### Core -> SQLite

- 使用 Rust SQLite 驱动直接访问数据库
- 不再依赖 `better-sqlite3`

---

## 4. 技术选型

### 4.1 桌面壳

- `Tauri v2`

职责：

- 创建桌面应用
- 暴露 commands/events
- 处理文件系统、系统托盘、外链、通知、窗口等系统能力
- 承担跨平台打包

### 4.2 前端 UI

- `Leptos`

选择原因：

- Rust/WASM UI 路线成熟度较高
- 组件与响应式模型对 Web 前端迁移更友好
- 更适合保留当前页面型产品结构

备选但不作为主线：

- `Yew`
- `Dioxus`

### 4.3 业务核心

- 纯 Rust crate，按领域拆分

推荐分层：

```text
crates/
  core/      业务用例、应用服务、任务编排
  data/      SQLite repos、migrations、models
  net/       CBG client、image fetch/cache、retry/rate limit
  notify/    Bark/Feishu/DingTalk/PushPlus/Webhook
  shared/    DTO、errors、commands、events
  ui/        Leptos 前端
  app/       Tauri 入口
```

### 4.4 数据库

- `SQLite`
- 推荐优先：`rusqlite`

原因：

- 本项目本质是单机桌面监控工具
- SQLite 很适合本地持久化
- `rusqlite` 足够稳定直接

可选：

- `sqlx`（若更重视 async 统一和查询抽象）

### 4.5 异步运行时与后台任务

- `tokio`

职责：

- 远程 HTTP 请求
- 后台监控轮询
- 通知派发
- 图片下载与缓存
- 定时任务和并发控制

### 4.6 HTTP 与限流

- 推荐：`reqwest`

需要封装：

- 自定义 headers
- User-Agent
- Referer
- retry/backoff
- rate limiting
- bounded concurrency

### 4.7 配置与序列化

- `serde`
- `serde_json`
- 配置文件可用 `toml` 或 SQLite settings 表继续保存

---

## 5. 开发范围

### 5.1 第一阶段必须完成

1. Tauri 应用能启动
2. Leptos UI 能跑起来
3. Rust core 能访问 SQLite
4. Rust core 能访问远程 CBG / 图片资源
5. 基础页面至少恢复：搜索、监控列表、设置
6. 监控任务能运行
7. 桌面版能在 macOS 开发环境跑通
8. 有明确的 Windows 构建路径

### 5.2 第一阶段不做

1. 不做移动端适配
2. 不做移动端 App 共用方案
3. 不把所有复杂页面一次性全量迁完
4. 不优先追求 UI 比旧版更炫
5. 不在第一阶段做云端同步

### 5.3 页面迁移优先级

#### P0

- Search
- Watchlist
- Settings
- Dashboard

#### P1

- ComparePage
- Alert/notification management
- License / auth 管理逻辑

#### P2

- Compare3DPage
- 高级导出/图片压缩/ZIP 流程

原因：

- P0 决定产品是否“能用”
- P2 最容易在 WebView 性能上踩坑，应延后

---

## 6. 模块分工

建议将开发拆成 6 个并行但有依赖顺序的工作包。

### WP-1: Rust workspace 与应用骨架

目标：建立 Tauri + Leptos + Rust crates 的基本工程结构。

涉及内容：

- Cargo workspace
- Tauri app crate
- Leptos UI crate
- shared/core/data/net crate 初始结构

交付标准：

- `cargo` workspace 可编译
- Tauri app 可启动
- UI 页面可渲染基本骨架

### WP-2: SQLite 与数据模型迁移

目标：把当前 SQLite 数据结构迁到 Rust 数据层。

涉及内容：

- schema / migration
- repositories
- settings/watchlist/alerts/price_history 等核心表

交付标准：

- Rust 可读写数据库
- 用户数据目录落盘正确
- WAL/恢复逻辑明确

### WP-3: Remote HTTP 与图片流水线

目标：让 Rust 端直接请求 CBG 和图片资源。

涉及内容：

- CBG client
- image download/cache
- rate limiting
- retry/fallback

交付标准：

- 搜索与详情查询可用
- 图片下载/缓存可用
- 远程访问有速率保护

### WP-4: Application commands/events

目标：建立 UI 与 Rust core 之间的类型化命令边界。

涉及内容：

- commands
- DTO
- events
- error mapping

交付标准：

- UI 可通过 command 触发核心能力
- 长任务可通过 event 通知进度/结果

### WP-5: 页面迁移

目标：把旧 React 页面逐步迁到 Leptos。

涉及内容：

- search/dashboard/watchlist/settings 优先
- compare/3D 页面后置

交付标准：

- P0 页面可用
- 交互链路完整

### WP-6: 桌面发布与 Windows 路线

目标：形成跨平台构建与验收路径。

涉及内容：

- Tauri build/package
- Windows WebView2 风险说明
- CI 构建路线
- 验收 checklist

交付标准：

- 有明确 Windows 构建方案
- 有首启/数据库/远程访问验证步骤

---

## 7. 建议的 Rust workspace 结构

```text
src-rust/
  Cargo.toml
  crates/
    app/
    ui/
    shared/
    core/
    data/
    net/
    notify/
```

### 7.1 `app`

职责：

- Tauri app 入口
- command 注册
- event 发射
- app 生命周期
- 系统能力桥接

### 7.2 `ui`

职责：

- Leptos 页面与组件
- 页面路由
- 本地状态管理
- command 调用封装

### 7.3 `shared`

职责：

- DTO
- commands 参数类型
- events payload
- errors
- 通用枚举

### 7.4 `core`

职责：

- 搜索用例
- watchlist 管理
- monitor 调度
- alerts 逻辑
- compare 业务

### 7.5 `data`

职责：

- SQLite 连接
- migration
- repo 抽象
- settings / watchlist / alerts / items / history 读写

### 7.6 `net`

职责：

- CBG API client
- 图片下载与缓存
- 远程资源访问控制
- rate limiting / retry / timeout

### 7.7 `notify`

职责：

- Bark
- 飞书
- 钉钉
- PushPlus
- 自定义 Webhook

---

## 8. 详细技术方案

### 8.1 UI 与业务通信

原则：

- 不再保留 `/api` 内部接口作为主模型
- UI 不直接访问 SQLite
- UI 不直接访问远程网站

Leptos 页面调用方式：

```text
User Action
  -> Leptos component
  -> Tauri command invoke
  -> Rust core service
  -> data/net layer
  -> result DTO back to UI
```

长流程（如监控、批量图片下载）使用：

```text
Core task
  -> emit event
  -> UI listen event
  -> update progress/status
```

### 8.2 Remote HTTP 直连策略

这次重构后，**Rust 直接调用网站/API 是主设计，不是例外。**

要求：

1. 所有远程请求由 `net` crate 发起
2. 不让 UI 自己拼网站 URL
3. 所有请求头、限流、重试逻辑统一收敛
4. 图片下载和缓存也走统一流水线

必须封装：

- CBG 基础 URL
- 请求参数映射
- 解析与 DTO 转换
- fallback 逻辑
- 图片域名白名单
- 文件缓存位置

### 8.3 SQLite 策略

继续保留 SQLite。

但这次要摆脱 Electron/Node 的原生模块问题，统一改为 Rust 侧直连数据库。

建议：

- 使用 `rusqlite`
- 继续启用 WAL
- 数据目录使用应用用户目录
- migration 在 app 启动时自动检查

必须验证：

1. 首次启动可建库
2. 多次重启数据仍在
3. watchlist / settings / history / alerts 均可读写

### 8.4 定时监控策略

原来由 `node-cron` 驱动的监控，重构后统一由 `tokio` 任务管理。

要求：

- 可配置间隔
- 应用启动后初始化
- 设置变更时可热更新
- 避免重复 scheduler
- 有失败重试与错误日志

### 8.5 通知策略

通知继续保留原产品能力，但统一迁到 Rust：

- Bark
- Feishu
- DingTalk
- PushPlus
- Custom Webhook

要求：

- 配置存 SQLite
- 发送逻辑在 Rust 侧
- UI 仅负责配置和测试触发

### 8.6 图片与缓存策略

旧版通过后端代理图片规避跨域。

重构后不再做 Express 图片代理，而是：

1. Rust 直接下载图片
2. 校验域名白名单
3. 存入应用缓存目录
4. UI 通过安全路径/协议访问缓存内容

注意：

- 不要让 UI 任意访问本地路径
- 不要无边界缓存所有远程图片
- 需要缓存清理策略

### 8.7 3D / 高复杂页面策略

`Compare3DPage` 是重构风险最高的页面。

第一阶段建议：

- 不优先迁 3D 深度交互
- 先恢复 2D 对比与图片导出主链路
- 3D 页放在第二阶段专门处理

原因：

- WebView 下高频图像/3D 性能更敏感
- Rust UI 重构阶段，先确保核心业务稳定

### 8.8 认证与许可证逻辑

本项目当前存在项目自身认证/设备验证/许可证逻辑。

Rust 重构原则：

- 认证与许可证逻辑迁到 Rust core
- UI 不直接持有敏感实现细节
- 邮箱/设备验证流程保留，但实现方式统一到 Rust

如果第一阶段来不及，可以：

- 先保留许可证状态检查与基础激活
- 高复杂认证流程延后

---

## 9. 实施顺序

### Phase 0: 建工程骨架

先完成：

1. Cargo workspace
2. Tauri app
3. Leptos UI 最小页面
4. 基本 command 调用

### Phase 1: 先迁底层，不先迁全部页面

优先迁：

1. SQLite data layer
2. CBG client
3. settings / watchlist / search 用例
4. monitor scheduler

### Phase 2: 恢复 P0 页面

先恢复：

1. Dashboard
2. Search
3. Watchlist
4. Settings

### Phase 3: 恢复对比与高级能力

后续恢复：

1. Compare
2. alerts 细节
3. 导出能力
4. 许可证细节

### Phase 4: Windows 路线与发布准备

最后做：

1. Windows build
2. WebView2 环境验证
3. 自动更新策略
4. 打包验收

---

## 10. 文件级迁移说明

### 10.1 旧前端文件如何处理

以下目录不再作为长期主实现：

- `src/frontend/`
- `src/frontend/services/api.ts`

这些文件的角色变为：

- 迁移参考
- 交互逻辑对照
- 页面结构参考

不要再围绕它们继续做大量新功能。

### 10.2 旧后端文件如何处理

以下目录不再作为长期主实现：

- `src/backend/routes/`
- `src/backend/services/`
- `src/backend/index.ts`

这些文件的角色变为：

- 业务逻辑迁移参考
- CBG 请求参数与行为参考
- 数据流程参考

### 10.3 迁移原则

迁移时不要机械对照文件名 1:1 翻译。

正确方式：

```text
旧 Express route/service
  -> Rust use case / repository / net client / command
```

例如：

- `src/backend/services/cbg.ts`
  -> `net::cbg_client`
- `src/backend/services/monitor.ts`
  -> `core::monitor_scheduler`
- `src/backend/routes/watchlist.ts`
  -> `core::watchlist_service` + Tauri command

---

## 11. 任务拆分建议（可直接给其他 agent）

### Agent A — Rust workspace 与 Tauri 骨架

任务目标：搭出 Rust 桌面应用骨架。

必须做：

1. 建立 Cargo workspace
2. 建立 Tauri app crate
3. 建立 Leptos UI crate
4. 建立 shared/core/data/net 的初始 crate

验收：

- 应用可启动
- 基础页面可显示
- command 调用链最小可用

### Agent B — SQLite 与数据层迁移

任务目标：把本地持久化迁到 Rust。

必须做：

1. 设计 SQLite 数据访问层
2. 建立 migration 方案
3. 迁移 watchlist/settings/history/alerts 核心表
4. 验证用户目录落盘

验收：

- Rust 端可稳定读写数据库
- 重启数据不丢失

### Agent C — Remote HTTP 与图片缓存

任务目标：让 Rust 直接访问远程网站/API。

必须做：

1. 实现 CBG client
2. 实现限流/重试
3. 实现图片下载与缓存
4. 设计 DTO 转换

验收：

- 搜索结果可拿到
- 图片缓存可用
- 失败恢复路径明确

### Agent D — Commands/Events 与 P0 页面迁移

任务目标：恢复关键页面。

必须做：

1. 设计 commands/events
2. 迁移 Dashboard/Search/Watchlist/Settings
3. 处理 UI 状态与错误反馈

验收：

- P0 页面基本可用
- 主链路完整

### Agent E — 监控/通知/Windows 路线

任务目标：处理后台任务和发布路径。

必须做：

1. 迁移 monitor scheduler
2. 迁移通知通道
3. 设计 Windows 构建与验收路线
4. 补充发布风险说明

验收：

- 监控任务可运行
- 通知可测试
- Windows 路线清晰

---

## 12. 验收标准

只有同时满足以下条件，才算 Rust 桌面版第一阶段完成。

### 12.1 应用验收

1. Tauri 应用能启动
2. Leptos UI 能显示主页面
3. UI 可调用 Rust commands

### 12.2 数据验收

1. SQLite 文件落在用户目录
2. watchlist/settings/history 可读写
3. 重启后数据保留

### 12.3 远程访问验收

1. Rust 可访问 CBG API
2. Rust 可下载或缓存图片资源
3. 搜索页面能返回真实数据

### 12.4 后台任务验收

1. monitor scheduler 可运行
2. 配置变更后任务行为正确
3. 至少一种通知通道可用

### 12.5 平台验收

1. macOS 开发环境可运行
2. Windows 构建路径明确
3. 已识别 WebView2 与打包风险

---

## 13. 风险清单

### 风险 1：UI 重写成本远高于预期

表现：

- Leptos 页面迁移速度慢
- 组件生态不如 React 丰富

应对：

- 先迁 P0 页面
- 旧 React 页面仅作为行为参考

### 风险 2：3D / 图像密集页面性能不理想

表现：

- Compare3DPage 类功能在 WebView 中性能不稳定

应对：

- 第一阶段不强推 3D 完整恢复
- 必要时单独设计原生/专门渲染方案

### 风险 3：业务层迁移时丢失旧逻辑细节

表现：

- CBG 参数映射、fallback、限流、缓存策略未迁全

应对：

- 先迁底层服务，再迁 UI
- 对照旧 `src/backend/` 行为做回归验证

### 风险 4：后台任务与 UI 生命周期耦合错误

表现：

- 重复 scheduler
- 休眠恢复后监控异常

应对：

- 把 monitor 统一交给 core 管理
- 增加任务状态与生命周期控制

### 风险 5：Windows 打包与运行环境差异

表现：

- WebView2 缺失
- 文件路径/权限行为不同

应对：

- 尽早设计 Windows 验收清单
- 用 CI 或 Windows 机器验证真实产物

---

## 14. 不要这样做

1. **不要继续把 Electron + Express 文档当成主线执行**
2. **不要把 Leptos UI 仅当 React 的语法翻译器**
3. **不要先疯狂迁页面，再回头补底层 Rust 服务**
4. **不要在 Rust 重构阶段继续扩张旧 TypeScript 后端能力**
5. **不要为了图快再造一个本地 HTTP 服务层替代 Express**
6. **不要一开始就要求 3D 页面达到旧版本全部能力**

---

## 15. 推荐的第一批里程碑

### Milestone 1 — Rust 应用能起来

- Tauri app 启动
- Leptos UI 显示
- 基本 command 可调用

### Milestone 2 — 数据与远程访问打通

- SQLite 可读写
- CBG 搜索可用
- 图片缓存初步可用

### Milestone 3 — P0 页面恢复

- Dashboard
- Search
- Watchlist
- Settings

### Milestone 4 — 后台任务恢复

- monitor scheduler
- 至少一种通知通道

### Milestone 5 — 发布路线明确

- Windows 构建方案
- 验收 checklist

---

## 16. 手动验证清单

### 16.1 应用启动

1. 启动 Tauri 应用
2. 确认 UI 正常显示
3. 确认 command 可调用

### 16.2 搜索流程

1. 搜索英雄皮肤
2. 搜索兵器皮肤
3. 搜索道具
4. 验证结果与图片加载

### 16.3 监控流程

1. 添加 watchlist
2. 修改目标价
3. 重启后验证数据仍在
4. 验证 scheduler 状态正确

### 16.4 设置流程

1. 修改通知设置
2. 测试发送通知
3. 重启后验证配置仍在

### 16.5 对比流程

1. 验证 2D compare 主链路
2. 若已迁移，再验证 3D 页面

---

## 17. 最终结论

本项目的桌面化主线已经改变：

**不是继续修 Electron + Express，而是重构为 Tauri + Leptos + Rust core + SQLite 的全 Rust 桌面应用。**

一句话概括：

> 重构后，UI 不再通过 `/api` 调本地后端，而是通过 Tauri commands 调 Rust 核心；远程网站查询、SQLite、监控和通知全部收敛到 Rust。 
