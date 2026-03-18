import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ensureUserDataDir, getDbPath } from "../utils/data-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type DbInstance = InstanceType<typeof Database>;

let dbInstance: DbInstance | null = null;
let databaseInitialized = false;

function ensureDataDir() {
  ensureUserDataDir();
}

// 清理残留的 WAL/SHM 文件（防止跨平台同步导致的不一致）
function cleanStaleWalFiles() {
  const dbPath = getDbPath();
  const walPath = dbPath + "-wal";
  const shmPath = dbPath + "-shm";
  // 如果数据库文件不存在但 WAL/SHM 存在，说明是残留文件
  if (!fs.existsSync(dbPath)) {
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  }
}

// 启动时完整性检查，损坏则自动备份并重建
function openDatabaseSafe(): DbInstance {
  cleanStaleWalFiles();
  const dbPath = getDbPath();

  try {
    const database = new Database(dbPath);
    database.pragma("journal_mode = WAL");

    // 执行完整性检查
    const result = database.pragma("integrity_check") as { integrity_check: string }[];
    if (result[0]?.integrity_check !== "ok") {
      throw new Error(`Integrity check failed: ${result[0]?.integrity_check}`);
    }

    return database;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Database corrupted or unreadable: ${message}`);
    console.error("Backing up corrupted database and creating a fresh one...");

    // 备份损坏的文件
    const backupSuffix = `.corrupted.${Date.now()}`;
    const filesToBackup = [dbPath, dbPath + "-wal", dbPath + "-shm"];
    for (const file of filesToBackup) {
      if (fs.existsSync(file)) {
        fs.renameSync(file, file + backupSuffix);
        console.log(`Backed up: ${file} -> ${file}${backupSuffix}`);
      }
    }

    // 创建全新的数据库
    const freshDb = new Database(dbPath);
    freshDb.pragma("journal_mode = WAL");
    console.log("Fresh database created successfully.");
    return freshDb;
  }
}

function getOrCreateDb(): DbInstance {
  if (!dbInstance) {
    ensureDataDir();
    dbInstance = openDatabaseSafe();
  }

  return dbInstance;
}

export function getDb(): DbInstance {
  return getOrCreateDb();
}

export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, property, receiver) {
    const targetDb = getOrCreateDb() as unknown as object;
    const value = Reflect.get(targetDb, property, receiver);
    if (typeof value === "function") {
      return value.bind(targetDb);
    }
    return value;
  },
  set(_target, property, value, receiver) {
    const targetDb = getOrCreateDb() as unknown as object;
    return Reflect.set(targetDb, property, value, receiver);
  },
});

export function initializeDatabase() {
  if (databaseInitialized) {
    return;
  }

  const database = getOrCreateDb();
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  database.exec(schema);

  // 本地模式下自动创建默认用户，避免外键约束失败
  ensureLocalUser(database);

  // Run migrations for existing databases
  runMigrations(database);
  databaseInitialized = true;
}

/**
 * 确保本地模式的 dev-user 存在于 users 表中，
 * 否则 watchlist/groups/alerts 等表的外键约束会失败。
 */
function ensureLocalUser(database: DbInstance) {
  const LOCAL_MODE = process.env.LOCAL_MODE !== "false";
  if (!LOCAL_MODE) return;

  database.exec(`
    INSERT OR IGNORE INTO users (id, email, username, password_hash, email_verified)
    VALUES ('dev-user', 'local@localhost', '本地用户', '', 1)
  `);
}

function runMigrations(database: DbInstance) {
  // Migration: Add variation_info column if it doesn't exist
  const columns = database.prepare("PRAGMA table_info(items)").all() as {
    name: string;
  }[];
  const hasVariationInfo = columns.some((col) => col.name === "variation_info");

  if (!hasVariationInfo) {
    database.exec("ALTER TABLE items ADD COLUMN variation_info TEXT");
    console.log("Migration: Added variation_info column to items table");
  }

  // Migration: Add user_id column to tables if they don't exist
  const tablesNeedingUserId = ["groups", "watchlist", "alerts", "compare_list"];

  for (const tableName of tablesNeedingUserId) {
    const tableColumns = database
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as { name: string }[];
    const hasUserId = tableColumns.some((col) => col.name === "user_id");

    if (!hasUserId) {
      try {
        database.exec(
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

  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_alerts_watchlist_resolved ON alerts(watchlist_id, is_resolved)",
  );
  database.exec(
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
      database.exec(stmt);
    } catch (error) {
      console.log("Migration: Index creation warning:", error);
    }
  }
}

export default db;
