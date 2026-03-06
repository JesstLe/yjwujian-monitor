-- Migration: Add user_id to existing tables for data isolation
-- Run manually for existing databases
--
-- Usage:
--   sqlite3 data/monitor.db < src/backend/db/migrations/001-add-user-id.sql
--
-- Note: This migration is designed to be idempotent where possible.
-- If columns already exist, SQLite will throw an error which can be safely ignored.

-- ============================================
-- Add user_id column to groups table
-- ============================================
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If the column already exists, this will fail (safe to ignore)
ALTER TABLE groups ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- Add user_id column to watchlist table
-- ============================================
ALTER TABLE watchlist ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- Add user_id column to alerts table
-- ============================================
ALTER TABLE alerts ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- Add user_id column to compare_list table
-- ============================================
ALTER TABLE compare_list ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- Create user_settings table
-- ============================================
-- The existing settings table uses key-value format for global settings.
-- We need a separate table for per-user settings.
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- ============================================
-- Optional: Create indexes for user_id columns
-- ============================================
-- These indexes improve query performance when filtering by user_id
CREATE INDEX IF NOT EXISTS idx_groups_user ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_compare_list_user ON compare_list(user_id);
