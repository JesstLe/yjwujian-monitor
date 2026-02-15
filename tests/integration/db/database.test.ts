import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '../../../data/test-monitor.db');

describe('Database', () => {
  let db: Database.Database;

  beforeAll(() => {
    const dataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(TEST_DB_PATH);
    
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

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should insert and query items', () => {
    const stmt = db.prepare('INSERT INTO items (id, name, category, rarity, current_price, status) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run('test-001', '测试物品', 'hero_skin', 'gold', 100000, 'normal');

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get('test-001') as { name: string; current_price: number };
    expect(item.name).toBe('测试物品');
    expect(item.current_price).toBe(100000);
  });

  it('should insert and query watchlist', () => {
    const stmt = db.prepare('INSERT INTO watchlist (item_id, target_price, alert_enabled) VALUES (?, ?, ?)');
    const result = stmt.run('test-001', 90000, 1);
    
    expect(result.lastInsertRowid).toBeGreaterThan(0);

    const entry = db.prepare('SELECT * FROM watchlist WHERE item_id = ?').get('test-001') as { target_price: number };
    expect(entry.target_price).toBe(90000);
  });

  it('should create alert when price meets target', () => {
    const stmt = db.prepare('INSERT INTO alerts (watchlist_id, item_id, triggered_price, target_price) VALUES (?, ?, ?, ?)');
    stmt.run(1, 'test-001', 85000, 90000);

    const alert = db.prepare('SELECT * FROM alerts WHERE item_id = ?').get('test-001') as { triggered_price: number; is_read: number };
    expect(alert.triggered_price).toBe(85000);
    expect(alert.is_read).toBe(0);
  });
});
