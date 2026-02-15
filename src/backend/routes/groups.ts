import { Router } from 'express';
import db from '../db/index';
import type { ApiResponse, WatchlistGroup } from '@shared/types';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT * FROM groups ORDER BY sort_order, id
    `
      )
      .all() as {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, color = '#3b82f6' } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    const maxOrder = db.prepare(`SELECT MAX(sort_order) as max FROM groups`).get() as { max: number | null };
    const sortOrder = (maxOrder.max ?? 0) + 1;

    const result = db
      .prepare(
        `
      INSERT INTO groups (name, color, sort_order)
      VALUES (?, ?, ?)
      RETURNING *
    `
      )
      .get(name, color, sortOrder) as {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, alertEnabled, sortOrder } = req.body;

    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (alertEnabled !== undefined) {
      updates.push('alert_enabled = ?');
      values.push(alertEnabled ? 1 : 0);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    values.push(Number(id));
    const result = db.prepare(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Group not found' });
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

    if (Number(id) === 1) {
      res.status(400).json({ success: false, error: 'Cannot delete default group' });
      return;
    }

    const result = db.prepare(`DELETE FROM groups WHERE id = ?`).run(Number(id));

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
