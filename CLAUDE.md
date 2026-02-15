# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

永劫无间藏宝阁价格监控系统 (Naraka: Bladepoint marketplace price monitor) - A stock-ticker-style price monitoring tool for tracking in-game item prices from NetEase's CBG (藏宝阁) marketplace.

## Commands

```bash
# Development (runs both backend + frontend)
pnpm dev

# Development (individual services)
pnpm dev:backend    # Express server on port 3000 (tsx watch)
pnpm dev:frontend   # Vite dev server on port 5173

# Production
pnpm build          # Build frontend (vite build)
pnpm start          # Run backend server

# Testing
pnpm test           # Unit/integration tests (vitest)
pnpm test:watch     # Vitest watch mode
pnpm test:e2e       # E2E tests (playwright)

# Code Quality
pnpm lint           # ESLint
pnpm typecheck      # TypeScript check

# Database
pnpm db:init        # Initialize SQLite schema
```

## Architecture

### Backend (Express + TypeScript)
- Entry: `src/backend/index.ts` - Server setup, middleware, static file serving
- Routes: `src/backend/routes/` - REST API endpoints (items, watchlist, groups, alerts, settings, monitor)
- Services: `src/backend/services/` - Business logic layer
  - `cbg.ts` - External CBG API client with rate limiting and fallback
  - `monitor.ts` - Cron-based price checking (default: 5 min intervals)
  - `alert.ts` - Price alert triggering logic
- Database: `src/backend/db/` - SQLite with better-sqlite3, WAL mode enabled

### Frontend (React + Vite)
- Entry: `src/frontend/main.tsx`
- Components: `src/frontend/components/` - Dashboard, SearchPanel, Watchlist, Settings, ItemCard
- API Client: `src/frontend/services/api.ts` - Wraps all backend API calls

### Shared Types
- `src/shared/types.ts` - Common TypeScript interfaces for API contracts

### Database Schema (SQLite)
Tables: `items`, `groups`, `watchlist`, `price_history`, `alerts`, `settings`

## Path Aliases

```typescript
"@/*"        → "./src/*"
"@backend/*" → "./src/backend/*"
"@frontend/*" → "./src/frontend/*"
"@shared/*"  → "./src/shared/*"
```

## Environment Configuration

See `.env.example` for available options:
- `PORT` - Backend server port (default: 3000)
- `DATABASE_PATH` - SQLite file location
- `CBG_BASE_URL` - External API base URL
- `CBG_REQUEST_DELAY_MS` - Rate limiting delay
- `CHECK_INTERVAL_MINUTES` - Monitoring interval

## External API Integration

The `cbg.ts` service handles communication with NetEase's CBG marketplace:
- Has fallback from aggregate API to legacy API
- Implements configurable rate limiting
- Item search across multiple categories/rarities

## Test Structure

- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests (API endpoints, database operations)
- `tests/e2e/` - Playwright E2E tests
