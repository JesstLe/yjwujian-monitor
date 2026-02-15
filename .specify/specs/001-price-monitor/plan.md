# Implementation Plan: Price Monitor System

**Branch**: `001-price-monitor` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/specs/001-price-monitor/spec.md`

## Summary

Build a stock-like price monitoring system for 永劫无间藏宝阁 (Naraka: Bladepoint CBG). The system will track item prices, set alerts when prices drop below targets, and display price history charts. Core approach: Node.js + TypeScript backend with scheduled price polling, React frontend for dashboard, SQLite for local persistence.

## Technical Context

**Language/Version**: Node.js 20+ / TypeScript 5.x  
**Primary Dependencies**: 
- Backend: Express.js, node-cron, axios, better-sqlite3
- Frontend: React 18, Vite, TailwindCSS, Recharts, TanStack Query
**Storage**: SQLite (via better-sqlite3) - local file-based, zero-config
**Testing**: Vitest (unit + integration), Playwright (e2e)
**Target Platform**: Desktop browser (Chrome/Firefox/Safari), responsive for mobile
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 
- Price check < 10s for 100 items
- UI response < 100ms
- Dashboard load < 2s
**Constraints**: 
- Memory < 512MB typical
- No external cloud services required
- Works offline with cached data
**Scale/Scope**: 
- Single user, local deployment
- Support 100+ watchlist items
- 90 days price history per item

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Data-First Architecture | ✅ Pass | SQLite schema defined, API layer abstracted |
| II. Real-time Monitoring | ✅ Pass | node-cron for scheduling, retry logic included |
| III. User Experience Priority | ✅ Pass | React dashboard, responsive design |
| IV. Privacy & Security | ✅ Pass | Local-only, no external data collection |
| V. Extensibility | ✅ Pass | Plugin architecture for monitors/notifiers |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/001-price-monitor/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # API research notes
├── data-model.md        # Database schema
├── quickstart.md        # Development guide
└── contracts/           # API contracts
    └── cbg-api.md       # CBG API documentation
```

### Source Code (repository root)

```text
src/
├── backend/
│   ├── index.ts              # Express server entry
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema.sql        # SQLite schema
│   │   └── migrations/       # Schema migrations
│   ├── services/
│   │   ├── cbg.ts            # CBG API client
│   │   ├── monitor.ts        # Price monitoring service
│   │   ├── alert.ts          # Alert trigger service
│   │   └── notification.ts   # Notification dispatcher
│   ├── routes/
│   │   ├── items.ts          # Item search/list routes
│   │   ├── watchlist.ts      # Watchlist CRUD routes
│   │   ├── alerts.ts         # Alert management routes
│   │   └── settings.ts       # User settings routes
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── frontend/
│   ├── index.html
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Root component
│   ├── components/
│   │   ├── Layout.tsx        # App layout
│   │   ├── Dashboard.tsx     # Main dashboard
│   │   ├── SearchPanel.tsx   # Item search
│   │   ├── Watchlist.tsx     # Watchlist view
│   │   ├── ItemCard.tsx      # Item display card
│   │   ├── PriceChart.tsx    # Price history chart
│   │   ├── AlertConfig.tsx   # Alert configuration
│   │   └── Settings.tsx      # User settings
│   ├── hooks/
│   │   ├── useItems.ts       # Item data hook
│   │   ├── useWatchlist.ts   # Watchlist hook
│   │   └── useAlerts.ts      # Alerts hook
│   ├── services/
│   │   └── api.ts            # API client
│   └── styles/
│       └── index.css         # TailwindCSS entry
└── shared/
    └── types.ts              # Shared types between FE/BE

tests/
├── unit/
│   ├── services/
│   │   ├── cbg.test.ts
│   │   ├── monitor.test.ts
│   │   └── alert.test.ts
│   └── utils/
│       └── price.test.ts
├── integration/
│   ├── api/
│   │   ├── items.test.ts
│   │   └── watchlist.test.ts
│   └── db/
│       └── queries.test.ts
└── e2e/
    ├── search.spec.ts
    ├── watchlist.spec.ts
    └── alerts.spec.ts

package.json
tsconfig.json
vite.config.ts
tailwind.config.js
vitest.config.ts
playwright.config.ts
```

**Structure Decision**: Web application with frontend/backend separation under `src/`. Backend serves API, frontend is SPA built with Vite. Shared types in `src/shared/` for type safety across the stack.

## Implementation Phases

### Phase 1: Foundation (Day 1)
1. Project setup (package.json, TypeScript, Vite, TailwindCSS)
2. Database schema and migrations
3. CBG API client with mock responses
4. Basic Express server with health check

### Phase 2: Core Backend (Day 1-2)
1. Item search/list API endpoints
2. Watchlist CRUD operations
3. Price monitoring service (scheduled polling)
4. Alert trigger logic

### Phase 3: Frontend Core (Day 2-3)
1. Dashboard layout with navigation
2. Search panel with filters
3. Watchlist view with add/remove
4. Item card with price display

### Phase 4: Advanced Features (Day 3-4)
1. Price history charts
2. Alert configuration UI
3. Notification system (browser push)
4. Settings page

### Phase 5: Polish & Testing (Day 4-5)
1. E2E tests with Playwright
2. Error handling and edge cases
3. Performance optimization
4. Documentation

## Complexity Tracking

No constitution violations. All design decisions align with stated principles.
