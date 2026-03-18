# Rust 桌面版开发 Agent 任务书

本文档把 `docs/desktop-app-development-guide.md` 拆成可直接派发给其他 agent 的任务书。

使用方式：

1. 先把总文档路径一并给 agent：`docs/desktop-app-development-guide.md`
2. 再把本文件中对应任务书整段复制给 agent
3. 推荐按本文档的执行顺序派工

---

## 1. 推荐执行顺序

不要 5 个 agent 完全无依赖并发。

推荐顺序：

1. **Agent A - Rust workspace 与 Tauri 骨架**
2. **Agent B - SQLite 与数据层迁移**
3. **Agent C - Remote HTTP 与图片缓存**
4. **Agent D - Commands/Events 与 P0 页面迁移**
5. **Agent E - 监控/通知/Windows 路线**

其中：

- Agent A 的工程骨架会影响所有后续任务
- Agent B 和 Agent C 可以在 A 初步完成后并行
- Agent D 依赖 A/B/C 的接口边界结论
- Agent E 需要 A/B/C/D 的总体方案稳定后再收敛

---

## 2. 共享前置上下文

派发任何任务前，都建议附上下面这段共享上下文：

```text
项目准备从现有的 React + Vite + Express + SQLite Web 架构，重构为全 Rust 桌面应用。

主架构已经定为：
1. Tauri v2 作为桌面壳
2. Leptos 作为 Rust/WASM UI
3. Rust core/data/net/shared crates 作为主业务层
4. SQLite 继续保留
5. Rust 直接调用远程 CBG/图片网站 API
6. 不再以 Express / 本地 HTTP / /api 作为长期主通信方式

总规范文档：docs/desktop-app-development-guide.md
```

---

## 3. Agent A - Rust workspace 与 Tauri 骨架

### 适用目标

建立可持续演进的 Rust 桌面工程骨架。

### 可直接派发的 Prompt

```text
你现在负责本项目 Rust 桌面重构的“workspace 与 Tauri 骨架搭建”。

先阅读：
1. docs/desktop-app-development-guide.md
2. Cargo / Rust 相关现状（如果仓库里还没有，就据此新建）
3. 现有前端/后端目录，只用于理解迁移来源，不要继续扩展 TypeScript 主实现

任务目标：
建立 Tauri v2 + Leptos + Rust crates 的基础工程，使后续 agent 可以在统一骨架上工作。

必须遵守的架构约束：
1. 主线技术栈是 Tauri v2 + Leptos + Rust core/data/net/shared。
2. 不要继续把 Electron + Express 当长期方案。
3. 不要引入本地 HTTP 服务作为新的主通信方式。
4. UI 与核心逻辑之间以 Tauri commands/events 为主。

必须完成：
1. 建立 Cargo workspace。
2. 建立 app/ui/shared/core/data/net 的基础 crate 结构（命名可微调，但职责必须清晰）。
3. 建立 Tauri app 最小可启动入口。
4. 建立 Leptos 最小页面，使应用可以显示基本 UI。
5. 建立一条最小 command 调用链（例如 ping / health / demo command）。

建议输出结构：
1. src-rust/Cargo.toml
2. crates/app
3. crates/ui
4. crates/shared
5. crates/core
6. crates/data
7. crates/net

交付要求：
1. 代码骨架
2. crate 职责说明
3. 运行命令说明

验收标准：
1. Tauri 应用能启动
2. UI 可显示基础页面
3. 至少一个 command 从 UI 调用到 Rust 成功
4. 工程结构可供其他 agent 继续开发

验证要求：
1. 跑能跑的 cargo check / tauri dev / 最小运行验证
2. 明确写出实际验证了什么
```

---

## 4. Agent B - SQLite 与数据层迁移

### 适用目标

把本地持久化从 TypeScript/Node 迁到 Rust 数据层。

### 可直接派发的 Prompt

```text
你现在负责本项目 Rust 桌面重构的“SQLite 与数据层迁移”。

先阅读：
1. docs/desktop-app-development-guide.md
2. 现有数据库相关文件：src/backend/db/*
3. 现有共享类型与业务实体定义
4. Agent A 产出的 workspace 结构

任务目标：
将本地数据持久化迁移到 Rust 数据层，并保持 SQLite 作为桌面本地数据库。

必须遵守的架构约束：
1. 继续保留 SQLite。
2. 数据层必须由 Rust 直接访问，不再依赖 Node/Express/better-sqlite3。
3. 数据库文件必须落在应用用户目录。
4. 不要为了方便把旧 Express 数据访问层继续包着用。

必须完成：
1. 设计 Rust 侧的数据库连接与初始化方式。
2. 迁移核心 schema / migration 方案。
3. 优先实现 watchlist / settings / alerts / price_history / items 等核心表支持。
4. 明确 repo 或 data access 分层。
5. 验证首次启动建库、重启持久化、基础 CRUD。

建议技术方向：
1. 优先考虑 rusqlite
2. 启用 WAL
3. 保留必要恢复逻辑

交付要求：
1. Rust 数据层代码
2. migration / schema 说明
3. 数据目录说明
4. 验证结果

验收标准：
1. SQLite 文件路径合理
2. Rust 端可稳定读写
3. 重启后数据仍在
4. 核心业务实体已可持久化

验证要求：
1. 实际验证读写
2. 明确列出哪些表已迁移、哪些尚未迁移
```

---

## 5. Agent C - Remote HTTP 与图片缓存

### 适用目标

让 Rust 直接访问远程 CBG/API/图片资源，并建立缓存与限流能力。

### 可直接派发的 Prompt

```text
你现在负责本项目 Rust 桌面重构的“Remote HTTP 与图片缓存迁移”。

先阅读：
1. docs/desktop-app-development-guide.md
2. 现有远程访问相关文件：src/backend/services/cbg.ts、src/backend/routes/compare.ts 等
3. Agent A 产出的 workspace 结构

任务目标：
把旧 Node/Express 的远程网站访问能力迁移到 Rust net 层。

必须遵守的架构约束：
1. 远程 CBG/API 查询统一由 Rust 发起。
2. UI 不直接访问网站。
3. 不要新造一个本地 HTTP API 服务层。
4. 图片代理逻辑要变成 Rust 下载/缓存流水线，而不是继续走 Express proxy。

必须完成：
1. 实现 Rust CBG client。
2. 实现请求头、限流、超时、重试、fallback 的统一封装。
3. 实现图片下载与缓存策略。
4. 实现 DTO / 领域对象转换。
5. 识别旧后端里与搜索、详情、compare 图片有关的关键逻辑并迁移。

建议技术方向：
1. reqwest
2. tokio
3. 明确缓存目录与白名单

交付要求：
1. Rust net 层代码
2. 远程请求策略说明
3. 图片缓存策略说明
4. 验证结果

验收标准：
1. 搜索或详情查询可返回真实数据
2. 图片下载/缓存主链路可用
3. 有明确限流与错误恢复策略

验证要求：
1. 明确测试了哪些远程路径
2. 明确说明哪些旧 Node 逻辑已迁移，哪些待迁移
```

---

## 6. Agent D - Commands/Events 与 P0 页面迁移

### 适用目标

建立 UI 与 Rust 核心之间的调用边界，并恢复关键页面。

### 可直接派发的 Prompt

```text
你现在负责本项目 Rust 桌面重构的“Commands/Events 与 P0 页面迁移”。

先阅读：
1. docs/desktop-app-development-guide.md
2. 现有前端页面：src/frontend/components/*（仅作为迁移参考）
3. Agent A/B/C 产出的新 Rust 结构和数据/网络接口

任务目标：
用 Leptos 逐步恢复关键页面，并通过 Tauri commands/events 调用 Rust 核心。

必须遵守的架构约束：
1. 不再使用 /api 作为 UI 主通信方式。
2. 只通过 typed commands/events 与 Rust core 交互。
3. 第一阶段只优先恢复 P0 页面：Dashboard/Search/Watchlist/Settings。
4. 不要优先投入 Compare3D 的深度重构。

必须完成：
1. 设计 commands 和必要的 events。
2. 迁移 Dashboard/Search/Watchlist/Settings 页面。
3. 建立 UI 状态管理与错误反馈。
4. 让页面能消费 Agent B/C 提供的数据与能力。

不要求：
1. 第一阶段达到旧 React UI 的全部细节。
2. 第一阶段恢复所有高级页面。

交付要求：
1. Leptos 页面代码
2. command/event 设计说明
3. 迁移范围说明

验收标准：
1. P0 页面可显示
2. 页面可以触发真实命令并返回结果
3. 搜索/监控列表/设置主链路可用

验证要求：
1. 明确写出哪些页面已迁移
2. 明确写出哪些能力仍是占位或未完成
```

---

## 7. Agent E - 监控/通知/Windows 路线

### 适用目标

恢复后台能力，并收敛到现实可执行的 Windows 发布路线。

### 可直接派发的 Prompt

```text
你现在负责本项目 Rust 桌面重构的“监控/通知/Windows 路线”。

先阅读：
1. docs/desktop-app-development-guide.md
2. 现有 monitor/alert/notification 相关 TypeScript 文件
3. Agent A/B/C/D 的新 Rust 结构

任务目标：
恢复后台监控与通知能力，并给出 Windows 构建与验收路线。

必须遵守的架构约束：
1. monitor 统一由 Rust core + tokio 管理。
2. 通知能力统一迁到 Rust。
3. 不要把 Windows 路线建立在旧 Electron 假设之上。

必须完成：
1. 迁移或设计 monitor scheduler。
2. 迁移至少一种通知通道，并为其余通道预留清晰结构。
3. 说明 settings 变更如何影响后台任务。
4. 设计 Windows 构建与验收 checklist。
5. 识别 WebView2、路径、权限、首启等风险。

建议技术方向：
1. tokio interval/task
2. Rust 通知适配层
3. Tauri Windows 打包与 CI 方案

交付要求：
1. Rust 后台任务/通知代码或方案
2. Windows 构建路线说明
3. 验收 checklist

验收标准：
1. monitor 基本可运行
2. 至少一种通知方式可测试
3. Windows 构建与运行风险说明清晰

验证要求：
1. 明确说明哪些后台能力已实际跑通
2. 若 Windows 只能给方案，必须把不可在 macOS 完成的部分写清楚
```

---

## 8. 你自己作为协调者要看的重点

收到各 agent 回报后，重点检查：

1. **Agent A** 有没有真正搭出可运行的 Rust workspace，而不是只创建目录
2. **Agent B** 有没有完成真实数据库读写，而不是只迁了 schema 名字
3. **Agent C** 有没有真正把 CBG/图片访问迁到 Rust，而不是只写伪接口
4. **Agent D** 有没有通过 commands/events 跑通主链路，而不是只画页面壳
5. **Agent E** 有没有把 monitor 与 Windows 路线落到具体验收步骤，而不是泛泛而谈

---

## 9. 最小派工组合

如果你不想一次派 5 个 agent，最小组合建议是：

### 组合 A：先把 Rust 桌面骨架立起来

1. Agent A
2. Agent B
3. Agent C

### 组合 B：进入可用产品阶段

1. Agent D
2. Agent E

---

## 10. 建议你现在先派谁

如果你只准备先派一个 agent，优先派：

**Agent A - Rust workspace 与 Tauri 骨架**

原因：

- 它决定这次 Rust 重构是否真正起步
- 它会先暴露 workspace、Tauri、Leptos、commands 的真实集成问题
- 后面的数据层、远程访问和页面迁移都依赖这个骨架
