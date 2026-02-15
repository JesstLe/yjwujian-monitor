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

router.put('/', (req, res) => {
  try {
    const updates = req.body;
    const intervalChanged = 'check_interval_minutes' in updates;

    const stmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'boolean' ? String(value) : String(value);
      stmt.run(key, stringValue);
    }

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
