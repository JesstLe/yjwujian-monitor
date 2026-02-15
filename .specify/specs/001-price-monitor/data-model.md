# Data Model: Price Monitor System

**Feature**: 001-price-monitor
**Database**: SQLite (better-sqlite3)

## Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   items     │────<│   watchlist      │>────│   groups     │
│             │     │                  │     │              │
│ id (PK)     │     │ id (PK)          │     │ id (PK)      │
│ name        │     │ item_id (FK)     │     │ name         │
│ category    │     │ group_id (FK)    │     │ color        │
│ rarity      │     │ target_price     │     │ alert_enabled│
│ ...         │     │ alert_enabled    │     │ created_at   │
└─────────────┘     │ added_at         │     └──────────────┘
      │             └──────────────────┘
      │                    │
      ▼                    ▼
┌──────────────────┐ ┌──────────────┐
│  price_history   │ │   alerts     │
│                  │ │              │
│ id (PK)          │ │ id (PK)      │
│ item_id (FK)     │ │ watchlist_id │
│ price            │ │ triggered_at │
│ checked_at       │ │ price        │
└──────────────────┘ │ is_read      │
                     │ is_resolved  │
                     └──────────────┘
```

## Schema Definition

```sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Items table: Cached item information from CBG
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,              -- CBG equipid
  name TEXT NOT NULL,               -- Item name
  serial_num TEXT,                  -- Serial number (e.g., Y016874)
  category TEXT NOT NULL,           -- 'hero_skin', 'weapon_skin', 'item'
  rarity TEXT NOT NULL,             -- 'gold', 'red'
  hero TEXT,                        -- Hero name for skins
  weapon TEXT,                      -- Weapon type for weapon skins
  star_grid TEXT,                   -- JSON array: [color, style, special]
  current_price INTEGER,            -- Current price in cents
  seller_name TEXT,
  status TEXT,                      -- 'normal', 'draw', 'sold', 'delisted'
  collect_count INTEGER DEFAULT 0,
  last_checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist groups
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',     -- Hex color for UI
  alert_enabled INTEGER DEFAULT 1,  -- Boolean: 0 or 1
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default group
INSERT OR IGNORE INTO groups (id, name, color) VALUES (1, '默认分组', '#3b82f6');

-- Watchlist entries
CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  group_id INTEGER DEFAULT 1,
  target_price INTEGER,             -- Alert target price in cents (null = no alert)
  alert_enabled INTEGER DEFAULT 1,  -- Boolean: 0 or 1
  notes TEXT,                       -- User notes
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET DEFAULT
);

-- Price history for tracking trends
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  price INTEGER NOT NULL,           -- Price in cents
  status TEXT,                      -- Item status at this time
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Triggered alerts log
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  triggered_price INTEGER NOT NULL, -- Price that triggered alert
  target_price INTEGER NOT NULL,    -- User's target price
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read INTEGER DEFAULT 0,        -- Boolean: 0 or 1
  is_resolved INTEGER DEFAULT 0,    -- Boolean: 0 or 1 (resolved = item removed or price changed)
  FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- User settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('check_interval_minutes', '5'),
  ('notification_enabled', 'true'),
  ('notification_sound', 'true');

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_last_checked ON items(last_checked_at);

CREATE INDEX IF NOT EXISTS idx_watchlist_item ON watchlist(item_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_group ON watchlist(group_id);

CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_time ON price_history(checked_at);

CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(triggered_at);
```

## TypeScript Interfaces

```typescript
// Shared types
export type ItemCategory = 'hero_skin' | 'weapon_skin' | 'item';
export type ItemRarity = 'gold' | 'red';
export type ItemStatus = 'normal' | 'draw' | 'sold' | 'delisted';

export interface StarGrid {
  color: number;      // 0-9999
  style: number;      // 0-9999
  special?: number;   // Optional special attribute
}

export interface Item {
  id: string;
  name: string;
  serialNum: string | null;
  category: ItemCategory;
  rarity: ItemRarity;
  hero: string | null;
  weapon: string | null;
  starGrid: StarGrid;
  currentPrice: number;  // In cents
  sellerName: string | null;
  status: ItemStatus;
  collectCount: number;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistGroup {
  id: number;
  name: string;
  color: string;
  alertEnabled: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface WatchlistEntry {
  id: number;
  itemId: string;
  item?: Item;           // Joined item data
  groupId: number;
  group?: WatchlistGroup;
  targetPrice: number | null;
  alertEnabled: boolean;
  notes: string | null;
  addedAt: Date;
}

export interface PriceSnapshot {
  id: number;
  itemId: string;
  price: number;
  status: ItemStatus | null;
  checkedAt: Date;
}

export interface Alert {
  id: number;
  watchlistId: number;
  itemId: string;
  item?: Item;
  triggeredPrice: number;
  targetPrice: number;
  triggeredAt: Date;
  isRead: boolean;
  isResolved: boolean;
}

export interface Settings {
  checkIntervalMinutes: number;
  notificationEnabled: boolean;
  notificationSound: boolean;
}
```

## Query Examples

### Get watchlist with items
```sql
SELECT 
  w.*,
  i.name, i.current_price, i.rarity, i.category,
  g.name as group_name, g.color as group_color
FROM watchlist w
JOIN items i ON w.item_id = i.id
LEFT JOIN groups g ON w.group_id = g.id
WHERE w.alert_enabled = 1
ORDER BY g.sort_order, w.added_at DESC;
```

### Get price history for chart
```sql
SELECT 
  date(checked_at) as date,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM price_history
WHERE item_id = ?
  AND checked_at >= datetime('now', '-30 days')
GROUP BY date(checked_at)
ORDER BY date;
```

### Get unread alerts count
```sql
SELECT COUNT(*) as unread_count
FROM alerts
WHERE is_read = 0 AND is_resolved = 0;
```
