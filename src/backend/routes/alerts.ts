import { Router } from 'express';
import { getAlerts, markAlertAsRead, resolveAlert, deleteAlert } from '../services/alert';
import type { ApiResponse, Alert } from '@shared/types';

const router = Router();

router.get('/', (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const alerts = getAlerts(unreadOnly);
    res.json({ success: true, data: alerts } as ApiResponse<Alert[]>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const success = markAlertAsRead(Number(id));

    if (!success) {
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
    const success = resolveAlert(Number(id));

    if (!success) {
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
    const success = deleteAlert(Number(id));

    if (!success) {
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
