# 永劫无间藏宝阁价格监控系统 — 完整开发文档

本文档基于对 https://yjwujian.cbg.163.com 的深度调研，整理了 CBG API 的完整结构、现有代码的差距分析，以及后续开发的详细计划。

---

## 一、CBG API 完整调研

### 1.1 API 端点总览

| 端点 | 用途 | 已实现 |
|------|------|--------|
| `GET /cgi/api/get_aggregate_equip_type_list` | 获取物品类型聚合列表（含缩略图、3D 预览、最低价） | ✅ |
| `POST /cgi-bin/recommend.py?act=recommd_by_role` | **获取某类型下的具体在售物品列表（含星格、编号、价格）** | ❌ 待实现 |
| `GET /cgi/api/get_equip_detail` | 获取单个在售物品的详细信息 | ✅ 部分 |

### 1.2 聚合列表 API（核心 API）

**端点:** `GET /cgi/api/get_aggregate_equip_type_list`  

**请求参数:**

| 参数 | 类型 | 必选 | 说明 |
|------|------|------|------|
| `client_type` | string | ✅ | 固定值 `h5` |
| `count` | number | ✅ | 每页数量（默认 15） |
| `page` | number | ✅ | 页码（从 1 开始） |
| `order_by` | string | ✅ | 排序方式，如 `selling_time DESC` |
| `query_onsale` | number | ✅ | 固定值 `1`（仅查询在售） |
| `kindid` | number | ✅ | 类别 ID：`3`=英雄皮肤, `4`=兵器皮肤, `5`=道具, `6`=道具 |
| `page_session_id` | string | ❌ | UUID 会话 ID |
| `traffic_trace` | string | ❌ | JSON 字符串，可忽略 |

**响应结构:**

```json
{
  "status": 1,
  "status_code": "OK",
  "count": 15,
  "page": 1,
  "is_last_page": false,
  "kind_header": [
    { "value": "3", "name": "英雄皮肤", "key": "kindid" },
    { "value": "4", "name": "兵器皮肤", "key": "kindid" },
    { "value": "5,6", "name": "道具", "key": "kindid" }
  ],
  "equip_type_list": [
    {
      "equip_type": "3400260",
      "equip_type_name": "谪星·风之絮语",
      "equip_type_desc": "金 | 土御门胡桃",
      "search_type": "role_skin",
      "min_price": 170000,
      "selling_count": "99+",
      "equip_type_list_img_url": "https://cbg-capture.res.netease.com/.../1.png",
      "equip_type_view_url": "https://cbg-capture.res.netease.com/.../1.png",
      "equip_type_3d_view_url": "",
      "equip_type_capture_url": [
        "https://cbg-capture.res.netease.com/.../1.png",
        "...共32张..."
      ]
    }
  ]
}
```

### 1.3 物品详情 API

**端点:** `GET /cgi/api/get_equip_detail`

**请求参数:**

| 参数 | 类型 | 必选 | 说明 |
|------|------|------|------|
| `client_type` | string | ✅ | 固定值 `h5` |
| `serverid` | number | ✅ | 服务器 ID（一般为 `2`） |
| `ordersn` | string | ✅ | 订单流水号 |

**响应关键字段:**

| 字段 | 说明 |
|------|------|
| `equip_name` | 物品名称 |
| `price` | 价格（单位：分） |
| `capture_url` | 预览图 URL 数组 |
| `equip_desc` | JSON 字符串，包含 `variation_id`、`washed_count`、`collection_score`、`counter_value` |
| `status_desc` | 状态文字（"上架中" 等） |
| `collect_num` | 收藏数 |
| `base_equip_info.rarity` | 稀有度（1=红, 2=金） |
| `base_equip_info.star_grid` | 星格信息数组 |
| `base_equip_info.serial_num` | 编号（如 `Y001301`） |

### 1.4 预览图资源

> [!IMPORTANT]
> 预览图完全可用！API 直接返回图片 URL，无需认证即可访问。

**图片来源有两种：**

| 来源 | 域名 | 适用场景 |
|------|------|----------|
| 3D 渲染截图 | `cbg-capture.res.netease.com` | 英雄皮肤、兵器皮肤（32 帧旋转图） |
| 资源图片 | `cbg.fp.ps.netease.com` | 道具（单张静态图） |

**URL format:**
- 3D: `https://cbg-capture.res.netease.com/yjwujian/capture/{dateID}-{UUID}/{frame}.png`
- Static: `https://cbg.fp.ps.netease.com/file/{fileID}`

### 1.5 Sub-Item Listing API (NEW - Core Monitoring API)

> [!IMPORTANT]
> This is the actual API for monitoring individual item prices! The aggregate list only shows item types, the real on-sale listings are fetched via this API.

**Endpoint:** `POST /cgi-bin/recommend.py?client_type=h5&act=recommd_by_role`

**Request (form-urlencoded):**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `equip_type` | string | YES | Item type ID (e.g. `3402116`) |
| `search_type` | string | YES | `role_skin` / `weapon_skin` etc. |
| `page` | number | YES | Page (starts at 1) |
| `count` | number | YES | Items per page (default 8) |
| `order_by` | string | NO | `price ASC`/`price DESC`/`selling_time DESC`/`collect_num DESC` |

**Response (single item):**

```json
{
  "serverid": 2,
  "equipid": 5320077,
  "eid": "202602101905313-2-N4J3BSOLEGJMJA",
  "game_ordersn": "3488285783ca4baba250af4cb24ebcc8",
  "price": 425000,
  "collect_num": 12,
  "server_name": "国服",
  "kindid": 3,
  "status": 2,
  "selling_time": "2026-02-10 19:57:01",
  "equip_type": "3402116",
  "format_equip_name": "谪星·通天狐袄",
  "is_random_draw_period": false,
  "other_info": {
    "basic_attrs": ["编号: Y001573"],
    "capture_url": ["(32 3D preview frames)"],
    "extra_desc_sumup_short": "红 | 玉玲珑",
    "variation_info": {
      "variation_id": "973-996-185-0",
      "variation_name": "颜色-狐尾-裙纹-天狐",
      "variation_quality": "5-5-3-1",
      "variation_unlock": "1-1-1-0",
      "variation_unlock_num": 3,
      "red_star_num": 2
    }
  }
}
```

**Star Grid (variation_info) Fields:**

| Field | Meaning | Example |
|-------|---------|---------|
| `variation_id` | Star grid value IDs | `973-996-185-0` |
| `variation_name` | Star grid slot names | 颜色-狐尾-裙纹-天狐 |
| `variation_quality` | Quality per slot (1-5) | `5-5-3-1` |
| `variation_unlock` | Unlock status per slot | `1-1-1-0` (1=unlocked) |
| `variation_unlock_num` | Total unlocked slots | `3` |
| `red_star_num` | Red star count (quality=5) | `2` |

**Pagination:** `paging.is_last_page` indicates last page.

### 1.6 Two-Level Data Model

```
Level 1: Aggregate Types (get_aggregate_equip_type_list)
  e.g. 谪星·通天狐袄 => min_price=¥4,250, selling_count=99+

Level 2: Individual Listings (recommend.py)
  e.g. Y001573 => star_grid=5-5-3-1, price=¥4,250, collect=12
       Y000445 => star_grid=5-5-5-1, price=¥4,499, collect=46
       Y001162 => star_grid=5-5-3-1, price=¥5,800, collect=61
```

---


## 二、现有代码差距分析

### 2.1 已完成 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| 数据库 Schema | ✅ | items/watchlist/price_history/alerts/groups/settings 表 |
| CBG Client (`cbg.ts`) | ✅ 部分 | 支持聚合列表 API 和详情 API，但**缺少预览图字段** |
| Monitor Service | ✅ | cron 定时任务 + 价格快照 |
| Alert Service | ✅ | 价格预警 + 通知推送 |
| 前端 API 客户端 | ✅ | 搜索/关注/分组/设置/监控 |
| 前端页面 | ✅ | Dashboard/Search/Watchlist/Settings |

### 2.2 需要改进 🔧

| 问题 | 影响 | 优先级 |
|------|------|--------|
| `Item` 类型缺少 `imageUrl` 和 `captureUrls` 字段 | 无法显示预览图 | **P0** |
| `cbg.ts` 的 `transformAggregateItem` 未保留图片 URL | 丢失了 API 返回的图片数据 | **P0** |
| 数据库 `items` 表缺少 `image_url` / `capture_urls` 列 | 无法持久化图片信息 | **P0** |
| 前端无物品图片展示 | 用户体验差 | **P0** |
| `equip_type_desc` 解析不够完善 | 部分英雄/武器名提取不准 | P1 |
| 道具类别仅使用 `kindid=5` | 遗漏 `kindid=6` 的道具 | P1 |
| 前端 UI 风格朴素 | 不够美观 | P1 |

---

## 三、开发计划

### Phase 1: 数据层改造（预览图支持）

#### [MODIFY] [types.ts](file:///Users/lv/Workspace/yjwujian-monitor/src/shared/types.ts)

扩展 `Item` 接口，添加图片字段：

```diff
 export interface Item {
   id: string;
   name: string;
+  imageUrl: string | null;       // 缩略图 URL
+  captureUrls: string[];          // 3D 旋转预览图数组（最多32张）
   serialNum: string | null;
   category: ItemCategory;
   ...
 }
```

#### [MODIFY] [schema.sql](file:///Users/lv/Workspace/yjwujian-monitor/src/backend/db/schema.sql)

在 `items` 表中添加：

```sql
ALTER TABLE items ADD COLUMN image_url TEXT;
ALTER TABLE items ADD COLUMN capture_urls TEXT;  -- JSON array
```

#### [MODIFY] [cbg.ts](file:///Users/lv/Workspace/yjwujian-monitor/src/backend/services/cbg.ts)

- `transformAggregateItem` 中保留 `equip_type_list_img_url` → `imageUrl`
- `transformAggregateItem` 中保留 `equip_type_capture_url` → `captureUrls`
- `transformLegacyItem` 同理

#### [MODIFY] [monitor.ts](file:///Users/lv/Workspace/yjwujian-monitor/src/backend/services/monitor.ts)

- `upsertItem` 中保存 `image_url` 和 `capture_urls`

#### [MODIFY] [items.ts](file:///Users/lv/Workspace/yjwujian-monitor/src/backend/routes/items.ts)

- 查询时读取 `image_url` 和 `capture_urls` 并映射到 `Item` 类型

---

### Phase 2: 前端 UI 升级

#### [MODIFY] [ItemCard.tsx](file:///Users/lv/Workspace/yjwujian-monitor/src/frontend/components/ItemCard.tsx)

- 显示物品缩略图（`imageUrl`）
- 鼠标悬停时切换 `captureUrls` 帧实现 3D 旋转预览效果
- 添加稀有度颜色指示（红/金）

#### [MODIFY] [SearchPanel.tsx](file:///Users/lv/Workspace/yjwujian-monitor/src/frontend/components/SearchPanel.tsx)

- 搜索结果展示为卡片网格布局，包含缩略图
- 优化分类筛选交互

#### [MODIFY] [Watchlist.tsx](file:///Users/lv/Workspace/yjwujian-monitor/src/frontend/components/Watchlist.tsx)

- 关注列表中展示缩略图和价格趋势小图表

#### [MODIFY] [Dashboard.tsx](file:///Users/lv/Workspace/yjwujian-monitor/src/frontend/components/Dashboard.tsx)

- 重新设计仪表盘布局，添加视觉丰富的物品卡片
- 添加价格变动高亮（涨/跌指示）

#### UI 设计方向

- **暗色主题** — 游戏风格的深色背景
- **Glassmorphism 毛玻璃效果** — 卡片使用半透明背景 + 模糊
- **动态预览** — 鼠标悬停时自动播放 32 帧旋转预览
- **稀有度视觉** — 红色品质发光边框、金色品质金色渐变边框
- **价格变动动画** — 价格上涨 🔴 / 下跌 🟢 + 微动画

---

### Phase 3: 功能增强

- **物品详情页**：新增 `/item/:id` 路由，展示完整信息 + 大图 + 价格历史图表
- **搜索增强**：支持按名称模糊搜索、按稀有度/类别/价格区间筛选
- **通知增强**：可选微信/邮件/浏览器推送
- **数据导出**：支持导出价格历史为 CSV

---

## 四、API 字段对照表

| CBG API 字段 | 项目 Item 字段 | 说明 |
|---|---|---|
| `equip_type` | `id` | 物品类型唯一标识 |
| `equip_type_name` | `name` | 物品名称 |
| `equip_type_desc` | → `rarity`, `hero`, `weapon` | 解析描述字段获取稀有度和角色/武器 |
| `min_price` | `currentPrice` | 最低价格（单位：分） |
| `selling_count` | `collectCount` | 在售数量 |
| `search_type` | → `category` | 映射到 `hero_skin`/`weapon_skin`/`item` |
| `equip_type_list_img_url` | `imageUrl` 🆕 | 缩略图 URL |
| `equip_type_capture_url` | `captureUrls` 🆕 | 32 帧 3D 预览图数组 |
| `equip_type_view_url` | — | 预览入口图（同第一帧） |
| `equip_type_3d_view_url` | — | 3D 检视器页面链接（可选） |

---

## 五、注意事项

> [!WARNING]
> **速率限制**：CBG 为网易平台，需保持合理的请求间隔（当前设置 1 秒）。过于频繁的请求可能触发 IP 封禁。

> [!IMPORTANT]
> **价格单位**：API 返回的价格均为 **分**（cents），前端显示时需除以 100。例如 `170000` = ¥1,700.00。

> [!NOTE]
> **道具类目**：道具对应 `kindid=5` 和 `kindid=6` 两个值。道具没有 3D 预览图（`equip_type_capture_url` 为空数组），但有静态资源图。

---

## 六、验证计划

### 自动化测试

```bash
# 运行现有单元测试
pnpm test

# 类型检查
pnpm typecheck
```

### 手动验证

1. **启动开发服务器** — `pnpm dev`，访问 `http://localhost:5173`
2. **搜索页面** — 切换"英雄皮肤"/"兵器皮肤"/"道具"分类，确认物品列表加载正常
3. **预览图** — 确认物品卡片上显示缩略图，鼠标悬停时有 3D 旋转效果
4. **价格监控** — 添加物品到关注列表，设置目标价，等待定时检查触发
5. **价格历史** — 查看物品的价格趋势图表数据是否正确


