# Tasks: Price Monitor System

**Input**: Design documents from `.specify/specs/001-price-monitor/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

---

## Phase 1: Project Setup

**Purpose**: Initialize project structure and dependencies

- [ ] T001 Create package.json with dependencies (express, vite, react, typescript, better-sqlite3, tailwindcss)
- [ ] T002 [P] Create tsconfig.json with strict mode and path aliases
- [ ] T003 [P] Create vite.config.ts for frontend build
- [ ] T004 [P] Create tailwind.config.js with custom theme
- [ ] T005 [P] Create vitest.config.ts for unit/integration tests
- [ ] T006 [P] Create playwright.config.ts for e2e tests
- [ ] T007 Create directory structure: src/backend/, src/frontend/, src/shared/, tests/
- [ ] T008 [P] Create .env.example with all environment variables
- [ ] T009 [P] Create .gitignore for Node.js project

**Checkpoint**: Project structure ready, dependencies installable

---

## Phase 2: Foundational Infrastructure

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Create SQLite schema in src/backend/db/schema.sql
- [ ] T011 Create database connection module in src/backend/db/index.ts
- [ ] T012 [P] Create shared types in src/shared/types.ts (Item, WatchlistEntry, Alert, etc.)
- [ ] T013 [P] Create Express server entry in src/backend/index.ts with middleware
- [ ] T014 [P] Create API client for CBG in src/backend/services/cbg.ts
- [ ] T015 Create rate limiter for CBG API requests
- [ ] T016 Create base API router structure in src/backend/routes/
- [ ] T017 [P] Create frontend entry point in src/frontend/main.tsx
- [ ] T018 [P] Create App.tsx with routing setup
- [ ] T019 [P] Create Layout component with navigation in src/frontend/components/Layout.tsx
- [ ] T020 Create API client for frontend in src/frontend/services/api.ts

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Price Alert (Priority: P1) 🎯 MVP

**Goal**: Users can add items to watchlist with target price and receive alerts

**Independent Test**: Add item → set target price → price drops → receive notification

### Tests for User Story 1

- [ ] T021 [P] [US1] Unit test for price comparison logic in tests/unit/services/alert.test.ts
- [ ] T022 [P] [US1] Integration test for watchlist CRUD in tests/integration/api/watchlist.test.ts

### Backend Implementation for US1

- [ ] T023 [US1] Create items router in src/backend/routes/items.ts (GET /api/items/:id)
- [ ] T024 [US1] Create watchlist router in src/backend/routes/watchlist.ts
  - GET /api/watchlist - list all
  - POST /api/watchlist - add item
  - PUT /api/watchlist/:id - update target price
  - DELETE /api/watchlist/:id - remove item
- [ ] T025 [US1] Create alert service in src/backend/services/alert.ts
  - Check if price meets target
  - Create alert record
  - Trigger notification
- [ ] T026 [US1] Create notification service in src/backend/services/notification.ts
  - Console logging (base)
  - Browser push notification support
- [ ] T027 [US1] Create monitor service in src/backend/services/monitor.ts
  - Scheduled price checking with node-cron
  - Process all watchlist items
  - Update prices and trigger alerts
- [ ] T028 [US1] Create alerts router in src/backend/routes/alerts.ts
  - GET /api/alerts - list alerts
  - PUT /api/alerts/:id/read - mark read
  - DELETE /api/alerts/:id - delete

### Frontend Implementation for US1

- [ ] T029 [P] [US1] Create useWatchlist hook in src/frontend/hooks/useWatchlist.ts
- [ ] T030 [P] [US1] Create useAlerts hook in src/frontend/hooks/useAlerts.ts
- [ ] T031 [US1] Create Watchlist component in src/frontend/components/Watchlist.tsx
  - List watchlist items with target prices
  - Add/Remove items
  - Edit target price
- [ ] T032 [US1] Create ItemCard component in src/frontend/components/ItemCard.tsx
  - Display item info, price, star grid
  - Quick add to watchlist
- [ ] T033 [US1] Create AlertConfig component in src/frontend/components/AlertConfig.tsx
  - Set target price
  - Enable/disable alerts
- [ ] T034 [US1] Create Dashboard component in src/frontend/components/Dashboard.tsx
  - Overview of watchlist
  - Recent alerts
  - Quick stats
- [ ] T035 [US1] Add dashboard route to App.tsx

**Checkpoint**: User Story 1 complete - basic price alert system working

---

## Phase 4: User Story 2 - Item Search & Discovery (Priority: P1)

**Goal**: Users can search and browse CBG items through the monitor app

**Independent Test**: Search for items → filter by category/rarity → add to watchlist

### Tests for User Story 2

- [ ] T036 [P] [US2] Integration test for item search in tests/integration/api/items.test.ts
- [ ] T037 [P] [US2] E2E test for search flow in tests/e2e/search.spec.ts

### Backend Implementation for US2

- [ ] T038 [US2] Extend items router in src/backend/routes/items.ts
  - GET /api/items/search?q=&category=&rarity=&page=
  - Cache CBG responses
- [ ] T039 [US2] Add item sync to monitor service
  - Fetch and store item details
  - Update local cache

### Frontend Implementation for US2

- [ ] T040 [P] [US2] Create useItems hook in src/frontend/hooks/useItems.ts
- [ ] T041 [US2] Create SearchPanel component in src/frontend/components/SearchPanel.tsx
  - Search input with debounce
  - Category filter (hero_skin, weapon_skin, item)
  - Rarity filter (gold, red)
  - Price range filter
- [ ] T042 [US2] Create ItemGrid component for search results
  - Paginated display
  - Click to add to watchlist
- [ ] T043 [US2] Add search route to App.tsx

**Checkpoint**: User Stories 1 AND 2 complete - search and alert working together

---

## Phase 5: User Story 3 - Price History & Trends (Priority: P2)

**Goal**: Users can view price history charts for items

**Independent Test**: View item → see price chart → hover for details

### Tests for User Story 3

- [ ] T044 [P] [US3] Integration test for price history in tests/integration/api/history.test.ts

### Backend Implementation for US3

- [ ] T045 [US3] Add price history endpoint to items router
  - GET /api/items/:id/history?days=30
  - Aggregate by day with min/max/avg
- [ ] T046 [US3] Update monitor service to save price snapshots

### Frontend Implementation for US3

- [ ] T047 [P] [US3] Create usePriceHistory hook in src/frontend/hooks/usePriceHistory.ts
- [ ] T048 [US3] Create PriceChart component in src/frontend/components/PriceChart.tsx
  - Line chart with Recharts
  - Time range selector (7/30/90 days)
  - Tooltip with price details
- [ ] T049 [US3] Create ItemDetail component showing chart
- [ ] T050 [US3] Add item detail route to App.tsx

**Checkpoint**: Price history visualization working

---

## Phase 6: User Story 4 - Watchlist Management (Priority: P2)

**Goal**: Users can organize items into groups

**Independent Test**: Create group → move items → toggle group alerts

### Tests for User Story 4

- [ ] T051 [P] [US4] Integration test for groups in tests/integration/api/groups.test.ts

### Backend Implementation for US4

- [ ] T052 [US4] Create groups router in src/backend/routes/groups.ts
  - GET /api/groups - list all
  - POST /api/groups - create
  - PUT /api/groups/:id - update
  - DELETE /api/groups/:id - delete
- [ ] T053 [US4] Update watchlist to support groups

### Frontend Implementation for US4

- [ ] T054 [P] [US4] Create useGroups hook in src/frontend/hooks/useGroups.ts
- [ ] T055 [US4] Create GroupManager component in src/frontend/components/GroupManager.tsx
  - Create/edit/delete groups
  - Color picker for group
- [ ] T056 [US4] Update Watchlist component with group display
- [ ] T057 [US4] Add drag-and-drop for moving items between groups

**Checkpoint**: Group organization working

---

## Phase 7: User Story 5 - Multi-channel Notifications (Priority: P3)

**Goal**: Users can receive alerts via browser push notifications

**Independent Test**: Enable notifications → trigger alert → receive push notification

### Tests for User Story 5

- [ ] T058 [P] [US5] E2E test for notifications in tests/e2e/notifications.spec.ts

### Implementation for US5

- [ ] T059 [US5] Add browser notification permission request
- [ ] T060 [US5] Implement Web Push API in notification service
- [ ] T061 [US5] Create Settings component in src/frontend/components/Settings.tsx
  - Notification toggle
  - Sound toggle
  - Check interval setting
- [ ] T062 [US5] Add settings router in src/backend/routes/settings.ts
- [ ] T063 [US5] Add settings route to App.tsx

**Checkpoint**: All user stories complete

---

## Phase 8: Polish & Testing

**Purpose**: Final improvements and verification

- [ ] T064 [P] Create e2e test for full user flow in tests/e2e/full-flow.spec.ts
- [ ] T065 [P] Add error boundary to React app
- [ ] T066 [P] Add loading states and skeleton screens
- [ ] T067 Add offline support with cached data
- [ ] T068 [P] Optimize bundle size (code splitting)
- [ ] T069 [P] Add proper TypeScript strict mode checks
- [ ] T070 Run quickstart.md validation
- [ ] T071 Final UI polish and responsive design check

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**: No dependencies - start immediately
2. **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
3. **US1 (Phase 3)**: Depends on Phase 2 - MVP core
4. **US2 (Phase 4)**: Depends on Phase 2 - can run parallel with US1
5. **US3 (Phase 5)**: Depends on US1 (needs watchlist)
6. **US4 (Phase 6)**: Depends on US1 (needs watchlist)
7. **US5 (Phase 7)**: Depends on US1 (needs alerts)
8. **Polish (Phase 8)**: Depends on all user stories

### Parallel Opportunities

- T002-T006: All config files can be created in parallel
- T012, T013, T014: Shared types, server entry, and CBG client
- T017-T020: All frontend foundation tasks
- T021-T022: All US1 tests
- T029-T030: All US1 hooks
- US1 and US2 can be developed in parallel after foundation

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Price Alerts)
4. **STOP and VALIDATE**: Basic monitoring works
5. Deploy MVP if desired

### Incremental Delivery

1. Setup + Foundation → Ready for development
2. US1 → MVP (search manually, add to watchlist, get alerts)
3. US2 → Enhanced (search in app)
4. US3 → Analytics (price charts)
5. US4 → Organization (groups)
6. US5 → Notifications (push alerts)

---

## Notes

- All paths use web app structure: src/backend/, src/frontend/
- SQLite database stored in ./data/monitor.db
- CBG API rate limit: 1 request/second
- Frontend runs on Vite dev server (port 5173)
- Backend runs on Express (port 3000)
