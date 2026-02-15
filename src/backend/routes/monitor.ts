import { Router } from 'express';
import { startMonitor, stopMonitor, getMonitorStatus, checkNow } from '../services/monitor';

const router = Router();

router.get('/status', (_req, res) => {
  try {
    const status = getMonitorStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/start', (_req, res) => {
  try {
    startMonitor();
    const status = getMonitorStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/stop', (_req, res) => {
  try {
    stopMonitor();
    const status = getMonitorStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/check-now', async (_req, res) => {
  try {
    const result = await checkNow();
    if (result.success) {
      res.json({
        success: true,
        data: {
          checkedCount: result.checkedCount,
          message: `Checked ${result.checkedCount} items`,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Check failed',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
