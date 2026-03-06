import { Router } from 'express';
import db from '../db/index';
import { requireAuth } from '../middleware/auth';
import type { ApiResponse, Alert } from '@shared/types';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

interface AlertRow {
  id: number;
  watchlist_id: number;
  item_id: string;
  triggered_price: number;
  target_price: number;
  triggered_at: string;
  is_read: number;
  is_resolved: number;
}

function rowToAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    itemId: row.item_id,
    triggeredPrice: row.triggered_price,
    targetPrice: row.target_price,
    triggeredAt: new Date(row.triggered_at),
    isRead: row.is_read === 1,
    isResolved: row.is_resolved === 1,
  };
}

router.get('/', (req, res) => {
  try {
    const userId = req.user!.id;
    const unreadOnly = req.query.unread === 'true';

    const query = unreadOnly
      ? `SELECT a.* FROM alerts a
         JOIN watchlist w ON a.watchlist_id = w.id
         WHERE w.user_id = ? AND a.is_read = 0
         ORDER BY a.triggered_at DESC`
      : `SELECT a.* FROM alerts a
         JOIN watchlist w ON a.watchlist_id = w.id
         WHERE w.user_id = ?
         ORDER BY a.triggered_at DESC`;

    const rows = db.prepare(query).all(userId) as AlertRow[];
    const alerts = rows.map(rowToAlert);

    res.json({ success: true, data: alerts } as ApiResponse<Alert[]>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Only allow marking alerts as read if the alert belongs to user's watchlist
    const result = db
      .prepare(
        `UPDATE alerts SET is_read = 1
         WHERE id = ? AND watchlist_id IN (SELECT id FROM watchlist WHERE user_id = ?)`
      )
      .run(Number(id), userId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Alert not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Only allow resolving alerts if the alert belongs to user's watchlist
    const result = db
      .prepare(
        `UPDATE alerts SET is_resolved = 1
         WHERE id = ? AND watchlist_id IN (SELECT id FROM watchlist WHERE user_id = ?)`
      )
      .run(Number(id), userId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Alert not found' });
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
    const userId = req.user!.id;

    // Only allow deleting alerts if the alert belongs to user's watchlist
    const result = db
      .prepare(
        `DELETE FROM alerts
         WHERE id = ? AND watchlist_id IN (SELECT id FROM watchlist WHERE user_id = ?)`
      )
      .run(Number(id), userId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Alert not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
