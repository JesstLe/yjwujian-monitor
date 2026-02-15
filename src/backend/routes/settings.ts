import { Router } from 'express';
import db from '../db/index';
import { getMonitorStatus, restartMonitor } from '../services/monitor';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];

    const settings: Record<string, string | boolean | number> = {};
    for (const row of rows) {
      if (row.value === 'true') {
        settings[row.key] = true;
      } else if (row.value === 'false') {
        settings[row.key] = false;
      } else if (/^\d+$/.test(row.value)) {
        settings[row.key] = parseInt(row.value, 10);
      } else {
        settings[row.key] = row.value;
      }
    }

    const monitorStatus = getMonitorStatus();

    res.json({
      success: true,
      data: {
        ...settings,
        monitorRunning: monitorStatus.running,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { type, config } = req.body;
    if (!type || !config) {
      return res.status(400).json({ success: false, error: 'Missing type or config' });
    }

    // Import dynamically to avoid circular dependency issues if any, though regular import is fine here
    const { NotificationService } = await import('../services/notification');

    await NotificationService.send(type, config, '测试通知', '这是一条来自永劫无间监控的测试通知');
    res.json({ success: true });
  } catch (error) {
    console.error('Test notification failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/', (req, res) => {
  try {
    const updates = req.body;
    const intervalChanged = 'check_interval_minutes' in updates;

    const stmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction((updatesObj: Record<string, any>) => {
      for (const [key, value] of Object.entries(updatesObj)) {
        let stringValue: string;
        if (typeof value === 'object' && value !== null) {
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }
        stmt.run(key, stringValue);
      }
    });

    transaction(updates);

    if (intervalChanged) {
      const status = getMonitorStatus();
      if (status.running) {
        restartMonitor();
      }
    }

    const monitorStatus = getMonitorStatus();
    res.json({ success: true, data: { monitorRunning: monitorStatus.running } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
