# Quickstart Guide: Price Monitor Development

**Feature**: 001-price-monitor
**Last Updated**: 2026-02-15

## Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm (recommended) or npm
- SQLite3 (included with better-sqlite3)

## Initial Setup

```bash
# Navigate to project
cd /Users/lv/Workspace/yjwujian-monitor

# Install dependencies
pnpm install

# Initialize database
pnpm db:init

# Start development server
pnpm dev
```

## Development Commands

```bash
# Start both frontend and backend in dev mode
pnpm dev

# Start backend only
pnpm dev:backend

# Start frontend only
pnpm dev:frontend

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run e2e tests
pnpm test:e2e

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Build for production
pnpm build
```

## Project Structure Navigation

```
src/
├── backend/           # Express API server
│   ├── index.ts       # Server entry point
│   ├── db/            # Database layer
│   ├── services/      # Business logic
│   ├── routes/        # API endpoints
│   └── types/         # Backend types
├── frontend/          # React SPA
│   ├── main.tsx       # React entry
│   ├── components/    # UI components
│   ├── hooks/         # Custom hooks
│   ├── services/      # API client
│   └── styles/        # CSS/Tailwind
└── shared/            # Shared types
    └── types.ts
```

## API Endpoints

### Items
- `GET /api/items/search?q=<name>&category=<cat>&rarity=<rar>` - Search items
- `GET /api/items/:id` - Get item details

### Watchlist
- `GET /api/watchlist` - Get all watchlist entries
- `POST /api/watchlist` - Add item to watchlist
- `PUT /api/watchlist/:id` - Update watchlist entry
- `DELETE /api/watchlist/:id` - Remove from watchlist

### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Alerts
- `GET /api/alerts` - Get all alerts
- `PUT /api/alerts/:id/read` - Mark alert as read
- `DELETE /api/alerts/:id` - Delete alert

### Price History
- `GET /api/items/:id/history?days=30` - Get price history

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings

## Environment Variables

Create `.env` file in project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/monitor.db

# CBG API
CBG_BASE_URL=https://yjwujian.cbg.163.com
CBG_REQUEST_DELAY_MS=1000

# Monitoring
CHECK_INTERVAL_MINUTES=5
```

## Database Location

Default: `./data/monitor.db`

Can be changed via `DATABASE_PATH` environment variable.

## Testing Strategy

### Unit Tests
- Location: `tests/unit/`
- Run: `pnpm test`
- Coverage: Services, utilities, data transformations

### Integration Tests
- Location: `tests/integration/`
- Run: `pnpm test`
- Coverage: API endpoints, database operations

### E2E Tests
- Location: `tests/e2e/`
- Run: `pnpm test:e2e`
- Coverage: Critical user journeys

## Mock Data

During development, use mock CBG API responses:

```typescript
// tests/mocks/cbg.ts
export const mockItemList = {
  result: true,
  data: {
    equip_list: [
      {
        equipid: 'test-001',
        equip_name: '谪星·风之絮语',
        unit_price: 338000, // ¥3,380
        kindid: 3,
        base_equip_info: {
          rarity: 2, // gold
          star_grid: [9702, 978, 1],
          serial_num: 'Y016874'
        }
      }
    ]
  }
};
```

## Debugging

### Backend
```bash
# Enable debug logging
DEBUG=monitor:* pnpm dev:backend
```

### Frontend
Open DevTools (F12) and check Console/Network tabs.

### Database
```bash
# Open SQLite CLI
sqlite3 ./data/monitor.db

# Useful queries
.tables
.schema items
SELECT * FROM watchlist;
```

## Common Issues

### 1. Database locked
- Close any other SQLite connections
- Restart the dev server

### 2. CBG API returns empty results
- Check network connectivity
- Verify `page_session_id` format (UUID v4)
- Try reducing request frequency

### 3. Notifications not working
- Check browser permissions
- Verify `notification_enabled` setting
- Check console for errors

## Contributing

1. Create feature branch from `main`
2. Write tests first (TDD)
3. Implement feature
4. Run all tests: `pnpm test && pnpm test:e2e`
5. Submit PR with description
