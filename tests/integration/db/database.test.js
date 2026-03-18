"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const TEST_DB_PATH = path_1.default.join(__dirname, '../../../data/test-monitor.db');
(0, vitest_1.describe)('Database', () => {
    let db;
    (0, vitest_1.beforeAll)(() => {
        const dataDir = path_1.default.dirname(TEST_DB_PATH);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        db = new better_sqlite3_1.default(TEST_DB_PATH);
        db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        rarity TEXT NOT NULL,
        current_price INTEGER,
        status TEXT
      );
      
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        target_price INTEGER,
        alert_enabled INTEGER DEFAULT 1
      );
      
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        watchlist_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        triggered_price INTEGER NOT NULL,
        target_price INTEGER NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_resolved INTEGER DEFAULT 0
      );
    `);
    });
    (0, vitest_1.afterAll)(() => {
        db.close();
        if (fs_1.default.existsSync(TEST_DB_PATH)) {
            fs_1.default.unlinkSync(TEST_DB_PATH);
        }
    });
    (0, vitest_1.it)('should insert and query items', () => {
        const stmt = db.prepare('INSERT INTO items (id, name, category, rarity, current_price, status) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run('test-001', '测试物品', 'hero_skin', 'gold', 100000, 'normal');
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get('test-001');
        (0, vitest_1.expect)(item.name).toBe('测试物品');
        (0, vitest_1.expect)(item.current_price).toBe(100000);
    });
    (0, vitest_1.it)('should insert and query watchlist', () => {
        const stmt = db.prepare('INSERT INTO watchlist (item_id, target_price, alert_enabled) VALUES (?, ?, ?)');
        const result = stmt.run('test-001', 90000, 1);
        (0, vitest_1.expect)(result.lastInsertRowid).toBeGreaterThan(0);
        const entry = db.prepare('SELECT * FROM watchlist WHERE item_id = ?').get('test-001');
        (0, vitest_1.expect)(entry.target_price).toBe(90000);
    });
    (0, vitest_1.it)('should create alert when price meets target', () => {
        const stmt = db.prepare('INSERT INTO alerts (watchlist_id, item_id, triggered_price, target_price) VALUES (?, ?, ?, ?)');
        stmt.run(1, 'test-001', 85000, 90000);
        const alert = db.prepare('SELECT * FROM alerts WHERE item_id = ?').get('test-001');
        (0, vitest_1.expect)(alert.triggered_price).toBe(85000);
        (0, vitest_1.expect)(alert.is_read).toBe(0);
    });
});
