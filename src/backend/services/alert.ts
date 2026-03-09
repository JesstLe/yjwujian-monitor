import db from '../db/index';
import { sendNotification } from './notification';
import type { Alert } from '@shared/types';

interface WatchlistRow {
  watchlist_id: number;
  item_id: string;
  target_price: number;
  item_name: string;
  item_current_price: number;
  item_status: string;
  user_id: string;
}

export async function checkAndTriggerAlerts(): Promise<Alert[]> {
  const watchlistItems = db
    .prepare(`
      SELECT 
        w.id as watchlist_id,
        w.item_id,
        w.target_price,
        i.name as item_name,
        i.current_price as item_current_price,
        i.status as item_status,
        w.user_id
      FROM watchlist w
      JOIN items i ON w.item_id = i.id
      WHERE w.alert_enabled = 1 
        AND w.target_price IS NOT NULL
        AND w.user_id IS NOT NULL
        AND i.current_price <= w.target_price
    `)
    .all() as WatchlistRow[];

  const newAlerts: Alert[] = [];

  if (watchlistItems.length === 0) {
    return newAlerts;
  }

  const watchlistIds = watchlistItems.map((item) => item.watchlist_id);
  const placeholders = watchlistIds.map(() => "?").join(",");
  const unresolvedRows = db
    .prepare(
      `
      SELECT watchlist_id
      FROM alerts
      WHERE is_resolved = 0 AND watchlist_id IN (${placeholders})
    `,
    )
    .all(...watchlistIds) as { watchlist_id: number }[];

  const unresolvedSet = new Set(unresolvedRows.map((row) => row.watchlist_id));
  const toInsert = watchlistItems.filter(
    (item) => !unresolvedSet.has(item.watchlist_id),
  );

  if (toInsert.length === 0) {
    return newAlerts;
  }

  const batchPlaceholders = toInsert.map(() => "(?, ?, ?, ?)").join(", ");
  const values = toInsert.flatMap((item) => [
    item.watchlist_id,
    item.item_id,
    item.item_current_price,
    item.target_price,
  ]);

  const insertedRows = db
    .prepare(
      `INSERT OR IGNORE INTO alerts (watchlist_id, item_id, triggered_price, target_price)
       VALUES ${batchPlaceholders}
       RETURNING *`,
    )
    .all(...values) as {
      id: number;
      watchlist_id: number;
      item_id: string;
      triggered_price: number;
      target_price: number;
      triggered_at: string;
      is_read: number;
      is_resolved: number;
    }[];

  // Build alert objects
  for (const row of insertedRows) {
    const alert: Alert = {
      id: row.id,
      watchlistId: row.watchlist_id,
      itemId: row.item_id,
      triggeredPrice: row.triggered_price,
      targetPrice: row.target_price,
      triggeredAt: new Date(row.triggered_at),
      isRead: row.is_read === 1,
      isResolved: row.is_resolved === 1,
    };
    newAlerts.push(alert);
  }

  // Send notifications in parallel
  const notificationPromises = toInsert.map((item) =>
    sendNotification(item.user_id, {
      title: '价格提醒',
      body: `${item.item_name} 已降至 ¥${(item.item_current_price / 100).toFixed(2)}，低于目标价 ¥${(item.target_price / 100).toFixed(2)}`,
      data: { alertId: item.watchlist_id, itemId: item.item_id },
    }),
  );
  await Promise.all(notificationPromises);

  return newAlerts;
}

export function getAlerts(unreadOnly: boolean = false): Alert[] {
  const query = unreadOnly
    ? `SELECT * FROM alerts WHERE is_read = 0 ORDER BY triggered_at DESC`
    : `SELECT * FROM alerts ORDER BY triggered_at DESC`;

  const rows = db.prepare(query).all() as {
    id: number;
    watchlist_id: number;
    item_id: string;
    triggered_price: number;
    target_price: number;
    triggered_at: string;
    is_read: number;
    is_resolved: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    watchlistId: row.watchlist_id,
    itemId: row.item_id,
    triggeredPrice: row.triggered_price,
    targetPrice: row.target_price,
    triggeredAt: new Date(row.triggered_at),
    isRead: row.is_read === 1,
    isResolved: row.is_resolved === 1,
  }));
}

export function markAlertAsRead(alertId: number): boolean {
  const result = db.prepare(`UPDATE alerts SET is_read = 1 WHERE id = ?`).run(alertId);
  return result.changes > 0;
}

export function resolveAlert(alertId: number): boolean {
  const result = db.prepare(`UPDATE alerts SET is_resolved = 1 WHERE id = ?`).run(alertId);
  return result.changes > 0;
}

export function deleteAlert(alertId: number): boolean {
  const result = db.prepare(`DELETE FROM alerts WHERE id = ?`).run(alertId);
  return result.changes > 0;
}
