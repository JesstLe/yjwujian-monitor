import cron from 'node-cron';
import db from '../db/index';
import cbgClient from './cbg';
import { checkAndTriggerAlerts } from './alert';
import type { Item } from '@shared/types';

const DEFAULT_INTERVAL_MINUTES = 5;

function getIntervalFromSettings(): number {
  try {
    const row = db
      .prepare(`SELECT value FROM settings WHERE key = 'check_interval_minutes'`)
      .get() as { value: string } | undefined;

    if (row?.value) {
      const parsed = parseInt(row.value, 10);
      return isNaN(parsed) || parsed <= 0 ? DEFAULT_INTERVAL_MINUTES : parsed;
    }
  } catch {
    return DEFAULT_INTERVAL_MINUTES;
  }
  return DEFAULT_INTERVAL_MINUTES;
}

function upsertItem(item: Item): void {
  const stmt = db.prepare(`
    INSERT INTO items (id, name, image_url, capture_urls, serial_num, category, rarity, hero, weapon, star_grid, current_price, seller_name, status, collect_count, last_checked_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      image_url = excluded.image_url,
      capture_urls = excluded.capture_urls,
      current_price = excluded.current_price,
      seller_name = excluded.seller_name,
      status = excluded.status,
      collect_count = excluded.collect_count,
      last_checked_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    item.id,
    item.name,
    item.imageUrl,
    JSON.stringify(item.captureUrls),
    item.serialNum,
    item.category,
    item.rarity,
    item.hero,
    item.weapon,
    JSON.stringify(item.starGrid),
    item.currentPrice,
    item.sellerName,
    item.status,
    item.collectCount
  );
}

function savePriceSnapshot(itemId: string, price: number, status: string): void {
  const stmt = db.prepare(`
    INSERT INTO price_history (item_id, price, status)
    VALUES (?, ?, ?)
  `);
  stmt.run(itemId, price, status);
}

async function checkItem(itemId: string): Promise<Item | null> {
  const item = await cbgClient.getItemById(itemId);
  if (item) {
    upsertItem(item);
    savePriceSnapshot(item.id, item.currentPrice, item.status);
  }
  return item;
}

async function checkAllWatchlistItems(): Promise<void> {
  const watchlistItems = db
    .prepare(`
      SELECT DISTINCT item_id FROM watchlist WHERE alert_enabled = 1
    `)
    .all() as { item_id: string }[];

  for (const { item_id } of watchlistItems) {
    try {
      await checkItem(item_id);
    } catch (error) {
      console.error(`Failed to check item ${item_id}:`, error);
    }
  }

  checkAndTriggerAlerts();
}

let scheduledTask: cron.ScheduledTask | null = null;
let currentIntervalMinutes = DEFAULT_INTERVAL_MINUTES;

export function startMonitor(): void {
  if (scheduledTask) {
    console.log('Monitor already running');
    return;
  }

  currentIntervalMinutes = getIntervalFromSettings();
  const cronExpression = `*/${currentIntervalMinutes} * * * *`;
  scheduledTask = cron.schedule(cronExpression, checkAllWatchlistItems, {
    runOnInit: true,
  });

  console.log(`Monitor started (checking every ${currentIntervalMinutes} minutes)`);
}

export function stopMonitor(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Monitor stopped');
  }
}

export function restartMonitor(): void {
  stopMonitor();
  startMonitor();
}

export function getMonitorStatus(): { running: boolean; intervalMinutes: number } {
  return {
    running: scheduledTask !== null,
    intervalMinutes: scheduledTask ? currentIntervalMinutes : getIntervalFromSettings(),
  };
}

export async function checkNow(): Promise<{ success: boolean; checkedCount: number; error?: string }> {
  try {
    const watchlistItems = db
      .prepare(`SELECT DISTINCT item_id FROM watchlist WHERE alert_enabled = 1`)
      .all() as { item_id: string }[];

    let checkedCount = 0;
    for (const { item_id } of watchlistItems) {
      try {
        const result = await checkItem(item_id);
        if (result) checkedCount++;
      } catch (error) {
        console.error(`Failed to check item ${item_id}:`, error);
      }
    }

    checkAndTriggerAlerts();
    return { success: true, checkedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, checkedCount: 0, error: message };
  }
}

export { checkItem, checkAllWatchlistItems };
