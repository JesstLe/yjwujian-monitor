import { Router } from 'express';
import db from '../db/index';
import cbgClient from '../services/cbg';
import type { ApiResponse, WatchlistEntry, Item } from '@shared/types';
import { parseSqliteDateTime, parseRequiredSqliteDateTime } from '../utils/date-utils';

const router = Router();

interface WatchlistRow {
  id: number;
  item_id: string;
  group_id: number;
  target_price: number | null;
  alert_enabled: number;
  notes: string | null;
  added_at: string;
  item_name: string;
  item_image_url: string | null;
  item_capture_urls: string | null;
  item_serial_num: string | null;
  item_category: string;
  item_rarity: string;
  item_star_grid: string;
  item_variation_info: string | null;
  item_current_price: number;
  item_seller_name: string | null;
  item_status: string;
  item_collect_count: number;
  item_last_checked_at: string | null;
  group_name: string;
  group_color: string;
}

function rowToEntry(row: WatchlistRow): WatchlistEntry {
  return {
    id: row.id,
    itemId: row.item_id,
    groupId: row.group_id,
    targetPrice: row.target_price,
    alertEnabled: row.alert_enabled === 1,
    notes: row.notes,
    addedAt: parseRequiredSqliteDateTime(row.added_at),
    item: {
      id: row.item_id,
      name: row.item_name,
      imageUrl: row.item_image_url,
      captureUrls: row.item_capture_urls ? JSON.parse(row.item_capture_urls) : [],
      serialNum: row.item_serial_num,
      category: row.item_category as Item['category'],
      rarity: row.item_rarity as Item['rarity'],
      hero: null,
      weapon: null,
      starGrid: JSON.parse(row.item_star_grid),
      variationInfo: row.item_variation_info ? JSON.parse(row.item_variation_info) : null,
      currentPrice: row.item_current_price,
      sellerName: row.item_seller_name,
      status: row.item_status as Item['status'],
      collectCount: row.item_collect_count,
      lastCheckedAt: parseSqliteDateTime(row.item_last_checked_at),
      createdAt: new Date(),
      updatedAt: new Date(),
      gameOrdersn: null,
      rawDesc: null,
    },
    group: {
      id: row.group_id,
      name: row.group_name,
      color: row.group_color,
      alertEnabled: true,
      sortOrder: 0,
      createdAt: new Date(),
    },
  };
}

/**
 * Ensure item exists in items table (upsert).
 * Prefers incoming item object, falls back to CBG API lookup.
 * Returns the resolved item or throws if cannot resolve.
 */
async function ensureItemInDatabase(itemId: string, incomingItem?: Item): Promise<Item> {
  const existing = db.prepare(`SELECT * FROM items WHERE id = ?`).get(itemId) as {
    id: string;
    name: string;
    image_url: string | null;
    capture_urls: string | null;
    serial_num: string | null;
    category: string;
    rarity: string;
    hero: string | null;
    weapon: string | null;
    star_grid: string;
    variation_info: string | null;
    current_price: number;
    seller_name: string | null;
    status: string;
    collect_count: number;
    last_checked_at: string | null;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (existing) {
    if (incomingItem) {
      db.prepare(`
        UPDATE items SET
          name = ?,
          image_url = ?,
          capture_urls = ?,
          serial_num = ?,
          category = ?,
          rarity = ?,
          hero = ?,
          weapon = ?,
          star_grid = ?,
          variation_info = ?,
          current_price = ?,
          seller_name = ?,
          status = ?,
          collect_count = ?,
          last_checked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        incomingItem.name,
        incomingItem.imageUrl,
        JSON.stringify(incomingItem.captureUrls),
        incomingItem.serialNum,
        incomingItem.category,
        incomingItem.rarity,
        incomingItem.hero,
        incomingItem.weapon,
        JSON.stringify(incomingItem.starGrid),
        incomingItem.variationInfo ? JSON.stringify(incomingItem.variationInfo) : null,
        incomingItem.currentPrice,
        incomingItem.sellerName,
        incomingItem.status,
        incomingItem.collectCount,
        itemId
      );
    }
    return incomingItem || {
      id: existing.id,
      name: existing.name,
      imageUrl: existing.image_url,
      captureUrls: existing.capture_urls ? JSON.parse(existing.capture_urls) : [],
      serialNum: existing.serial_num,
      category: existing.category as Item['category'],
      rarity: existing.rarity as Item['rarity'],
      hero: existing.hero,
      weapon: existing.weapon,
      starGrid: JSON.parse(existing.star_grid),
      variationInfo: existing.variation_info ? JSON.parse(existing.variation_info) : null,
      currentPrice: existing.current_price,
      sellerName: existing.seller_name,
      status: existing.status as Item['status'],
      collectCount: existing.collect_count,
      lastCheckedAt: parseSqliteDateTime(existing.last_checked_at),
      createdAt: parseRequiredSqliteDateTime(existing.created_at),
      updatedAt: parseRequiredSqliteDateTime(existing.updated_at),
      gameOrdersn: null,
      rawDesc: null,
    };
  }

  let resolvedItem: Item | null = incomingItem || await cbgClient.getItemById(itemId);

  if (!resolvedItem) {
    throw new Error(`Cannot resolve item ${itemId}: item not found`);
  }

  db.prepare(`
    INSERT INTO items (id, name, image_url, capture_urls, serial_num, category, rarity, hero, weapon, star_grid, variation_info, current_price, seller_name, status, collect_count, last_checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    resolvedItem.id,
    resolvedItem.name,
    resolvedItem.imageUrl,
    JSON.stringify(resolvedItem.captureUrls),
    resolvedItem.serialNum,
    resolvedItem.category,
    resolvedItem.rarity,
    resolvedItem.hero,
    resolvedItem.weapon,
    JSON.stringify(resolvedItem.starGrid),
    resolvedItem.variationInfo ? JSON.stringify(resolvedItem.variationInfo) : null,
    resolvedItem.currentPrice,
    resolvedItem.sellerName,
    resolvedItem.status,
    resolvedItem.collectCount
  );

  return resolvedItem;
}

router.get('/', (_req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT 
        w.*,
        i.name as item_name,
        i.image_url as item_image_url,
        i.capture_urls as item_capture_urls,
        i.serial_num as item_serial_num,
        i.category as item_category,
        i.rarity as item_rarity,
        i.star_grid as item_star_grid,
        i.variation_info as item_variation_info,
        i.current_price as item_current_price,
        i.seller_name as item_seller_name,
        i.status as item_status,
        i.collect_count as item_collect_count,
        i.last_checked_at as item_last_checked_at,
        g.name as group_name,
        g.color as group_color
      FROM watchlist w
      LEFT JOIN items i ON w.item_id = i.id
      LEFT JOIN groups g ON w.group_id = g.id
      ORDER BY w.added_at DESC
    `
      )
      .all() as WatchlistRow[];

    const entries = rows.map(rowToEntry);

    res.json({ success: true, data: entries } as ApiResponse<WatchlistEntry[]>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { itemId, groupId = 1, targetPrice, alertEnabled = true, notes, item } = req.body;

    if (!itemId) {
      res.status(400).json({ success: false, error: 'itemId is required' });
      return;
    }

    const existing = db.prepare(`SELECT id FROM watchlist WHERE item_id = ?`).get(itemId);
    if (existing) {
      res.status(400).json({ success: false, error: 'Item already in watchlist' });
      return;
    }

    await ensureItemInDatabase(itemId, item);

    const result = db
      .prepare(
        `
      INSERT INTO watchlist (item_id, group_id, target_price, alert_enabled, notes)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(itemId, groupId, targetPrice, alertEnabled ? 1 : 0, notes) as {
        id: number;
        item_id: string;
        group_id: number;
        target_price: number | null;
        alert_enabled: number;
        notes: string | null;
        added_at: string;
      };

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        itemId: result.item_id,
        groupId: result.group_id,
        targetPrice: result.target_price,
        alertEnabled: result.alert_enabled === 1,
        notes: result.notes,
        addedAt: parseRequiredSqliteDateTime(result.added_at),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { targetPrice, alertEnabled, groupId, notes } = req.body;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (targetPrice !== undefined) {
      updates.push('target_price = ?');
      values.push(targetPrice);
    }
    if (alertEnabled !== undefined) {
      updates.push('alert_enabled = ?');
      values.push(alertEnabled ? 1 : 0);
    }
    if (groupId !== undefined) {
      updates.push('group_id = ?');
      values.push(groupId);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    values.push(Number(id));
    const result = db.prepare(`UPDATE watchlist SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Watchlist entry not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare(`DELETE FROM watchlist WHERE id = ?`).run(Number(id));

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Watchlist entry not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
