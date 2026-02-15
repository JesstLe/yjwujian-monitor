import { Router } from 'express';
import db from '../db/index';
import cbgClient from '../services/cbg';
import type { ApiResponse, Item, ItemCategory } from '@shared/types';
import { parseSqliteDateTime, parseRequiredSqliteDateTime } from '../utils/date-utils';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { q, category, rarity, page = 1, limit = 15 } = req.query;

    const kindIdMap: Record<ItemCategory, number> = {
      hero_skin: 3,
      weapon_skin: 4,
      item: 5,
    };

    const kindId = category ? kindIdMap[category as ItemCategory] : 3;
    
    let items: Item[] = [];
    let total = 0;
    let pageCount = 0;
    let upstreamError: string | undefined;

    try {
      const result = await cbgClient.getItemsByCategory(kindId, Number(page), Number(limit));
      items = result.items;
      total = result.total;
      pageCount = result.pageCount;
    } catch (cbgError) {
      upstreamError = cbgError instanceof Error ? cbgError.message : 'CBG upstream request failed';
      
      const cacheCategory = (category as string) || 'hero_skin';
      
      const cachedRows = db.prepare(`
        SELECT * FROM items 
        WHERE category = ?
        ORDER BY last_checked_at DESC 
        LIMIT ? OFFSET ?
      `).all(cacheCategory, Number(limit), (Number(page) - 1) * Number(limit)) as {
        id: string;
        name: string;
        serial_num: string | null;
        category: string;
        rarity: string;
        hero: string | null;
        weapon: string | null;
        star_grid: string;
        current_price: number;
        seller_name: string | null;
        status: string;
        collect_count: number;
        last_checked_at: string | null;
        created_at: string;
        updated_at: string;
      }[];

      items = cachedRows.map((row) => ({
        id: row.id,
        name: row.name,
        serialNum: row.serial_num,
        category: row.category as ItemCategory,
        rarity: row.rarity as 'gold' | 'red',
        hero: row.hero,
        weapon: row.weapon,
        starGrid: JSON.parse(row.star_grid),
        currentPrice: row.current_price,
        sellerName: row.seller_name,
        status: row.status as 'normal' | 'draw' | 'sold' | 'delisted',
        collectCount: row.collect_count,
        lastCheckedAt: parseSqliteDateTime(row.last_checked_at),
        createdAt: parseRequiredSqliteDateTime(row.created_at),
        updatedAt: parseRequiredSqliteDateTime(row.updated_at),
      }));

      total = items.length;
      pageCount = 1;
    }

    if (rarity) {
      items = items.filter((item) => item.rarity === rarity);
    }

    if (q && typeof q === 'string') {
      const query = q.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }

    const response: ApiResponse<Item[]> = {
      success: true,
      data: items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pageCount,
      },
    };

    if (upstreamError) {
      response.error = upstreamError;
      response.meta = {
        total,
        page: Number(page),
        limit: Number(limit),
        pageCount,
        cached: true,
      };
    }

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cached = db
      .prepare(`SELECT * FROM items WHERE id = ?`)
      .get(id) as {
      id: string;
      name: string;
      serial_num: string | null;
      category: string;
      rarity: string;
      hero: string | null;
      weapon: string | null;
      star_grid: string;
      current_price: number;
      seller_name: string | null;
      status: string;
      collect_count: number;
      last_checked_at: string | null;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (cached) {
      const item: Item = {
        id: cached.id,
        name: cached.name,
        serialNum: cached.serial_num,
        category: cached.category as ItemCategory,
        rarity: cached.rarity as 'gold' | 'red',
        hero: cached.hero,
        weapon: cached.weapon,
        starGrid: JSON.parse(cached.star_grid),
        currentPrice: cached.current_price,
        sellerName: cached.seller_name,
        status: cached.status as 'normal' | 'draw' | 'sold' | 'delisted',
        collectCount: cached.collect_count,
        lastCheckedAt: parseSqliteDateTime(cached.last_checked_at),
        createdAt: parseRequiredSqliteDateTime(cached.created_at),
        updatedAt: parseRequiredSqliteDateTime(cached.updated_at),
      };
      res.json({ success: true, data: item });
      return;
    }

    const item = await cbgClient.getItemById(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const rows = db
      .prepare(
        `
      SELECT 
        date(checked_at) as date,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM price_history
      WHERE item_id = ?
        AND checked_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date(checked_at)
      ORDER BY date
    `
      )
      .all(id, Number(days)) as {
      date: string;
      avg_price: number;
      min_price: number;
      max_price: number;
    }[];

    const history = rows.map((row) => ({
      date: row.date,
      avgPrice: Math.round(row.avg_price),
      minPrice: row.min_price,
      maxPrice: row.max_price,
    }));

    res.json({ success: true, data: history });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
