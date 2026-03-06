import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { cbgClient } from "../services/cbg.js";
import { requireAuth } from "../middleware/auth.js";
import type { Item, CompareItem } from "@shared/types";

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const addItemSchema = z.object({
  itemId: z.string(),
  parentTypeId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  captureUrls: z.array(z.string()),
  serialNum: z.string(),
  currentPrice: z.number(),
  category: z.enum(["hero_skin", "weapon_skin", "item"]),
  rarity: z.enum(["gold", "red"]),
  hero: z.string().nullable(),
  weapon: z.string().nullable(),
  starGrid: z.object({ slots: z.array(z.number().nullable()) }).nullable(),
  variationInfo: z.any().nullable(),
});

// GET /api/compare/types - 获取所有物品类型列表
router.get("/types", async (_req, res) => {
  try {
    // 获取所有分类的物品类型
    const categories = [{ kindId: 3 }, { kindId: 4 }, { kindId: 5 }];

    const allTypes: Item[] = [];

    for (const { kindId } of categories) {
      try {
        const result = await cbgClient.getItemsByCategory(kindId, 1, 100);
        allTypes.push(...result.items);
      } catch (err) {
        console.error(`Failed to get items for kindId ${kindId}:`, err);
        // Continue with other categories
      }
    }

    if (allTypes.length === 0) {
      console.error("No items fetched from any category");
      return res.status(500).json({ error: "Failed to get item types" });
    }

    res.json(allTypes);
  } catch (error) {
    console.error("Failed to get types:", error);
    res.status(500).json({ error: "Failed to get item types" });
  }
});

// GET /api/compare/search - 按父层+编号搜索子物品
router.get("/search", async (req, res) => {
  try {
    const { parentTypeId, serialNum, maxPages = "10" } = req.query;

    if (!parentTypeId || !serialNum) {
      return res
        .status(400)
        .json({ error: "Missing parentTypeId or serialNum" });
    }

    const maxPagesNum = parseInt(maxPages as string, 10);

    // 首先获取父层信息来确定 searchType
    const parentItem = await cbgClient.getItemById(parentTypeId as string);
    if (!parentItem) {
      return res.status(404).json({ error: "Parent type not found" });
    }

    // 确定 searchType
    let searchType = "role_skin";
    if (parentItem.category === "weapon_skin") {
      searchType = "weapon_skin";
    } else if (parentItem.category === "item") {
      searchType = "item";
    }

    // 遍历分页搜索
    for (let page = 1; page <= maxPagesNum; page++) {
      const result = await cbgClient.getEquipListByType(
        parentTypeId as string,
        searchType,
        page,
        20,
      );

      // 在当前页查找匹配的编号
      const found = result.items.find((item) => item.serialNum === serialNum);

      if (found) {
        return res.json(found);
      }

      // 如果是最后一页，停止搜索
      if (result.isLastPage) {
        break;
      }
    }

    // 未找到
    res.json(null);
  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /api/compare - 获取对比列表
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = db
      .prepare(
        `
      SELECT id, item_id, parent_type_id, serial_num, item_data, created_at
      FROM compare_list
      WHERE user_id = ?
      ORDER BY created_at ASC
    `,
      )
      .all(userId) as {
      id: string;
      item_id: string;
      parent_type_id: string;
      serial_num: string | null;
      item_data: string;
      created_at: string;
    }[];

    const items: CompareItem[] = rows.map((row) => {
      const data = JSON.parse(row.item_data);
      return {
        id: row.id,
        itemId: row.item_id,
        parentTypeId: row.parent_type_id,
        serialNum: row.serial_num || "",
        name: data.name,
        imageUrl: data.imageUrl,
        captureUrls: data.captureUrls || [],
        currentPrice: data.currentPrice,
        category: data.category,
        rarity: data.rarity,
        hero: data.hero,
        weapon: data.weapon,
        starGrid: data.starGrid,
        variationInfo: data.variationInfo,
      };
    });

    res.json(items);
  } catch (error) {
    console.error("Failed to get compare list:", error);
    res.status(500).json({ error: "Failed to get compare list" });
  }
});

// POST /api/compare - 添加物品到对比列表
router.post("/", async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = addItemSchema.parse(req.body);

    const id = `compare-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const stmt = db.prepare(`
      INSERT INTO compare_list (id, item_id, parent_type_id, serial_num, item_data, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.itemId,
      data.parentTypeId,
      data.serialNum,
      JSON.stringify(data),
      userId,
    );

    const newItem: CompareItem = {
      id,
      itemId: data.itemId,
      parentTypeId: data.parentTypeId,
      serialNum: data.serialNum,
      name: data.name,
      imageUrl: data.imageUrl,
      captureUrls: data.captureUrls,
      currentPrice: data.currentPrice,
      category: data.category,
      rarity: data.rarity,
      hero: data.hero,
      weapon: data.weapon,
      starGrid: data.starGrid,
      variationInfo: data.variationInfo,
    };

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Failed to add item:", error);
    res.status(500).json({ error: "Failed to add item to compare list" });
  }
});

// DELETE /api/compare/:id - 从对比列表移除物品
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = db
      .prepare(
        `
      DELETE FROM compare_list WHERE id = ? AND user_id = ?
    `,
      )
      .run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Failed to remove item:", error);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

export default router;
