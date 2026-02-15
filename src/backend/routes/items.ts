import { Router } from 'express';
import db from '../db/index';
import cbgClient from '../services/cbg';
import type { ApiResponse, Item, ItemCategory } from '@shared/types';
import { parseSqliteDateTime, parseRequiredSqliteDateTime } from '../utils/date-utils';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { q, category, rarity, minPrice, maxPrice, page = 1, limit = 15 } = req.query;

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
    const filters = {
      keyword: q as string,
      priceMin: minPrice ? Number(minPrice) : undefined,
      priceMax: maxPrice ? Number(maxPrice) : undefined,
    };

    try {
      const result = await cbgClient.getItemsByCategory(kindId, Number(page), Number(limit), filters);
      items = result.items;
      total = result.total;
      pageCount = result.pageCount;

      // Client-side filtering for rarity (CBG API doesn't seem to support rarity filter for aggregate list)
      if (rarity) {
        items = items.filter((item) => item.rarity === rarity);
        // Recalculate total/page derived from this is impossible without fetching all, 
        // but for now we just filter the current page. 
        // Ideally we should warn user or handle this better.
      }

      // Client-side keyword filter if API didn't handle it well (optional safety)
      // if (q) { ... } 

    } catch (cbgError) {
      upstreamError = cbgError instanceof Error ? cbgError.message : 'CBG upstream request failed';

      const cacheCategory = (category as string) || 'hero_skin';
      const offset = (Number(page) - 1) * Number(limit);

      // Dynamic SQL build
      let sql = `SELECT * FROM items WHERE category = ?`;
      const params: any[] = [cacheCategory];

      if (q) {
        sql += ` AND name LIKE ?`;
        params.push(`%${q}%`);
      }

      if (rarity) {
        sql += ` AND rarity = ?`;
        params.push(rarity);
      }

      if (minPrice) {
        sql += ` AND current_price >= ?`;
        params.push(Number(minPrice) * 100);
      }

      if (maxPrice) {
        sql += ` AND current_price <= ?`;
        params.push(Number(maxPrice) * 100);
      }

      // Get total count for pagination
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = db.prepare(countSql).get(...params) as { count: number };
      total = countResult.count;
      pageCount = Math.ceil(total / Number(limit));

      sql += ` ORDER BY last_checked_at DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), offset);

      const cachedRows = db.prepare(sql).all(...params) as {
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
        imageUrl: row.image_url,
        captureUrls: row.capture_urls ? JSON.parse(row.capture_urls) : [],
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
        gameOrdersn: null,
        rawDesc: null,
      }));
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
      response.meta!.cached = true;
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
    const { ordersn } = req.query;

    // Try to fetch live detail first if ordersn is provided or just by ID
    try {
      const liveDetail = await cbgClient.getItemDetail(id, ordersn as string);
      if (liveDetail) {
        res.json({ success: true, data: liveDetail });
        return;
      }
    } catch (e) {
      console.warn(`Failed to fetch live detail for ${id}:`, e);
    }

    const cached = db
      .prepare(`SELECT * FROM items WHERE id = ?`)
      .get(id) as {
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
        imageUrl: cached.image_url,
        captureUrls: cached.capture_urls ? JSON.parse(cached.capture_urls) : [],
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
        gameOrdersn: null,
        rawDesc: null,
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

// Get sub-item listings for a specific equip type
router.get('/type/:id/listings', async (req, res) => {
  try {
    const { id } = req.params;
    const { searchType = 'role_skin', page = 1, sort = 'price ASC' } = req.query;

    const result = await cbgClient.getEquipListByType(
      id,
      String(searchType),
      Number(page),
      15, // Default count
      String(sort)
    );

    res.json({
      success: true,
      data: result.items,
      meta: {
        page: Number(page),
        isLastPage: result.isLastPage,
      },
    });
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
