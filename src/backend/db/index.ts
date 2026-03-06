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
}

export default db;
