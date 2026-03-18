use rusqlite::Connection;
use shared::AppError;

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    rarity TEXT,
    current_price INTEGER,
    min_price INTEGER,
    image_url TEXT,
    capture_urls TEXT,
    equip_type_desc TEXT,
    search_type TEXT,
    serverid INTEGER,
    ordersn TEXT,
    last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'dev-user',
    item_id TEXT NOT NULL,
    item_name TEXT,
    target_price INTEGER,
    alert_enabled INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    group_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'dev-user',
    name TEXT NOT NULL,
    color TEXT,
    alert_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'dev-user',
    watchlist_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    price INTEGER NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compare_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'dev-user',
    item_id TEXT NOT NULL,
    item_name TEXT,
    category TEXT,
    price INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_id);
"#;

pub fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(SCHEMA)
        .map_err(|e| AppError::Database(format!("Migration failed: {}", e)))?;

    conn.execute(
        "INSERT OR IGNORE INTO users (id, email, username, password_hash, email_verified) VALUES ('dev-user', 'local@localhost', '本地用户', '', 1)",
        [],
    )?;

    Ok(())
}
