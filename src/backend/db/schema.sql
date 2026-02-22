-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Items table: Cached item information from CBG
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  capture_urls TEXT,              -- JSON 数组，存储3D预览图URL
  serial_num TEXT,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  hero TEXT,
  weapon TEXT,
  star_grid TEXT,
  variation_info TEXT,            -- JSON 对象，存储谪星变体信息（颜色、狐尾等）
  current_price INTEGER,
  seller_name TEXT,
  status TEXT,
  collect_count INTEGER DEFAULT 0,
  last_checked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist groups
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  alert_enabled INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default group
INSERT OR IGNORE INTO groups (id, name, color) VALUES (1, '默认分组', '#3b82f6');

-- Watchlist entries
CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  group_id INTEGER DEFAULT 1,
  target_price INTEGER,
  alert_enabled INTEGER DEFAULT 1,
  notes TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET DEFAULT
);

-- Price history for tracking trends
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Triggered alerts log
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  triggered_price INTEGER NOT NULL,
  target_price INTEGER NOT NULL,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read INTEGER DEFAULT 0,
  is_resolved INTEGER DEFAULT 0,
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
