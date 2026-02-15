import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/index';
import { startMonitor } from './services/monitor';
import itemsRouter from './routes/items';
import watchlistRouter from './routes/watchlist';
import groupsRouter from './routes/groups';
import alertsRouter from './routes/alerts';
import settingsRouter from './routes/settings';
import monitorRouter from './routes/monitor';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

initializeDatabase();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/items', itemsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/monitor', monitorRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist/frontend')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/frontend/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startMonitor();
});

export default app;
