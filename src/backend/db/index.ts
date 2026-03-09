import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, "../../../data/monitor.db");

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

ensureDataDir();

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

export function initializeDatabase() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  // Run migrations for existing databases
  runMigrations();
}

function runMigrations() {
  // Migration: Add variation_info column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(items)").all() as {
    name: string;
  }[];
  const hasVariationInfo = columns.some((col) => col.name === "variation_info");

  if (!hasVariationInfo) {
    db.exec("ALTER TABLE items ADD COLUMN variation_info TEXT");
    console.log("Migration: Added variation_info column to items table");
  }

  // Migration: Add user_id column to tables if they don't exist
  const tablesNeedingUserId = ["groups", "watchlist", "alerts", "compare_list"];

  for (const tableName of tablesNeedingUserId) {
    const tableColumns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as { name: string }[];
    const hasUserId = tableColumns.some((col) => col.name === "user_id");

    if (!hasUserId) {
      try {
        db.exec(
          `ALTER TABLE ${tableName} ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL`,
        );
        console.log(`Migration: Added user_id column to ${tableName} table`);
      } catch (error) {
        // Column might already exist from migration script
        console.log(
          `Migration: user_id column already exists in ${tableName} or error:`,
          error,
        );
      }
    }
  }

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_alerts_watchlist_resolved ON alerts(watchlist_id, is_resolved)",
  );
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique_unresolved ON alerts(watchlist_id) WHERE is_resolved = 0",
  );

  // Create indexes for user_id columns
  const indexStatements = [
    "CREATE INDEX IF NOT EXISTS idx_groups_user ON groups(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_compare_list_user ON compare_list(user_id)",
  ];

  for (const stmt of indexStatements) {
    try {
      db.exec(stmt);
    } catch (error) {
      console.log("Migration: Index creation warning:", error);
    }
  }

}

export default db;
