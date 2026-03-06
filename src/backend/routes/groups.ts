import { Router } from "express";
import db from "../db/index";
import { requireAuth } from "../middleware/auth";
import type { ApiResponse, WatchlistGroup } from "@shared/types";

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

router.get("/", (req, res) => {
  try {
    const userId = req.user!.id;
    // DEV MODE: 获取所有分组（包括 user_id 为 NULL 的）
    const DEV_MODE = process.env.NODE_ENV === "development" || true;
    const rows = db
      .prepare(
        DEV_MODE
          ? `SELECT * FROM groups ORDER BY sort_order, id`
          : `SELECT * FROM groups WHERE user_id = ? ORDER BY sort_order, id`,
      )
      .all(...(DEV_MODE ? [] : [userId])) as {
      id: number;
      name: string;
      color: string;
      alert_enabled: number;
      sort_order: number;
      created_at: string;
    }[];

    const groups: WatchlistGroup[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      alertEnabled: row.alert_enabled === 1,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    }));

    res.json({ success: true, data: groups } as ApiResponse<WatchlistGroup[]>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/", (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, color = "#3b82f6" } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: "name is required" });
      return;
    }

    const maxOrder = db
      .prepare(`SELECT MAX(sort_order) as max FROM groups WHERE user_id = ?`)
      .get(userId) as { max: number | null };
    const sortOrder = (maxOrder.max ?? 0) + 1;

    const result = db
      .prepare(
        `
      INSERT INTO groups (name, color, sort_order, user_id)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `,
      )
      .get(name, color, sortOrder, userId) as {
      id: number;
      name: string;
      color: string;
      alert_enabled: number;
      sort_order: number;
      created_at: string;
    };

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        color: result.color,
        alertEnabled: result.alert_enabled === 1,
        sortOrder: result.sort_order,
        createdAt: new Date(result.created_at),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, color, alertEnabled, sortOrder } = req.body;

    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (color !== undefined) {
      updates.push("color = ?");
      values.push(color);
    }
    if (alertEnabled !== undefined) {
      updates.push("alert_enabled = ?");
      values.push(alertEnabled ? 1 : 0);
    }
    if (sortOrder !== undefined) {
      updates.push("sort_order = ?");
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    values.push(Number(id));
    values.push(userId);
    const result = db
      .prepare(
        `UPDATE groups SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      )
      .run(...values);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (Number(id) === 1) {
      res
        .status(400)
        .json({ success: false, error: "Cannot delete default group" });
      return;
    }

    const result = db
      .prepare(`DELETE FROM groups WHERE id = ? AND user_id = ?`)
      .run(Number(id), userId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
