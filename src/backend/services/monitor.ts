import cron from 'node-cron';
import db from '../db/index';
import cbgClient from './cbg';
import { checkAndTriggerAlerts } from './alert';
import type { Item } from '@shared/types';

const DEFAULT_INTERVAL_MINUTES = 5;
const MONITOR_CONCURRENCY = Math.max(
  1,
  parseInt(process.env.MONITOR_CONCURRENCY || "4", 10) || 4,
);

function getIntervalFromSettings(): number {
  return DEFAULT_INTERVAL_MINUTES;
}

function upsertItem(item: Item): void {
  const stmt = db.prepare(`
    INSERT INTO items (id, name, image_url, capture_urls, serial_num, category, rarity, hero, weapon, star_grid, variation_info, current_price, seller_name, status, collect_count, last_checked_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      image_url = excluded.image_url,
      capture_urls = excluded.capture_urls,
      variation_info = excluded.variation_info,
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
    item.variationInfo ? JSON.stringify(item.variationInfo) : null,
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
  const item = await cbgClient.getItemById(itemId, { bypassCache: true });
  if (item) {
    upsertItem(item);
    savePriceSnapshot(item.id, item.currentPrice, item.status);
  }
  return item;
}

async function checkItemsWithConcurrency(itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) {
    return 0;
  }

  let cursor = 0;
  let checkedCount = 0;
  const workers = Math.min(MONITOR_CONCURRENCY, itemIds.length);

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= itemIds.length) {
        return;
      }

      const itemId = itemIds[index];
      try {
        const result = await checkItem(itemId);
        if (result) {
          checkedCount += 1;
        }
      } catch (error) {
        console.error(`Failed to check item ${itemId}:`, error);
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return checkedCount;
}

let activeMonitorPass: Promise<number> | null = null;

async function runMonitorPass(): Promise<number> {
  if (activeMonitorPass) {
    return activeMonitorPass;
  }

  activeMonitorPass = (async () => {
    const watchlistItems = db
      .prepare(`
        SELECT DISTINCT item_id FROM watchlist WHERE alert_enabled = 1
      `)
      .all() as { item_id: string }[];

    const checkedCount = await checkItemsWithConcurrency(
      watchlistItems.map(({ item_id }) => item_id),
    );
    await checkAndTriggerAlerts();

    return checkedCount;
  })();

  try {
    return await activeMonitorPass;
  } finally {
    activeMonitorPass = null;
  }
}

async function checkAllWatchlistItems(): Promise<void> {
  await runMonitorPass();
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
    const checkedCount = await runMonitorPass();
    return { success: true, checkedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, checkedCount: 0, error: message };
  }
}

export { checkItem, checkAllWatchlistItems };
