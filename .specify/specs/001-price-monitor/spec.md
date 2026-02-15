# Feature Specification: Price Monitor System

**Feature Branch**: `001-price-monitor`  
**Created**: 2026-02-15  
**Status**: Draft  
**Input**: Build a stock-like monitoring system for 永劫无间藏宝阁 (Naraka: Bladepoint CBG) to track item prices, set alerts, and analyze market trends.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Price Alert (Priority: P1)

As a player, I want to set a price alert for a specific skin so that I can be notified when the price drops below my target.

**Why this priority**: Core value proposition - users primarily want to buy at good prices. Without alerts, manual checking is tedious.

**Independent Test**: Can be fully tested by adding a single item to watchlist, setting a target price, and receiving notification when threshold is met.

**Acceptance Scenarios**:

1. **Given** I'm on the monitor page, **When** I search for "谪星·风之絮语" and add it to my watchlist with target price ¥3000, **Then** the system saves this alert and shows it in my watchlist.
2. **Given** I have a watchlist item with target price ¥3000, **When** the item's current price drops to ¥2800, **Then** I receive a notification within 30 seconds.
3. **Given** I have multiple alerts configured, **When** I view the dashboard, **Then** I see all alerts sorted by urgency (price closest to target first).

---

### User Story 2 - Item Search & Discovery (Priority: P1)

As a player, I want to search and browse items on CBG through the monitor app so that I can find items to track.

**Why this priority**: Users need to find items before they can track them. Essential for onboarding.

**Independent Test**: Can be fully tested by searching for items by name, category, or filters without any alerts configured.

**Acceptance Scenarios**:

1. **Given** I'm on the search page, **When** I search for "胡桃", **Then** I see all items related to 土御门胡桃 including skins.
2. **Given** I'm browsing hero skins, **When** I filter by "红" rarity, **Then** I only see red-tier skins.
3. **Given** I found an item I like, **When** I click "Add to Watchlist", **Then** the item is saved to my watchlist.

---

### User Story 3 - Price History & Trends (Priority: P2)

As a player, I want to see price history charts for items so that I can make informed decisions about when to buy.

**Why this priority**: Analytics enhance user decisions but core monitoring works without it.

**Independent Test**: Can be fully tested by viewing charts for any watched item with historical data.

**Acceptance Scenarios**:

1. **Given** I'm viewing a watched item, **When** I click "Price History", **Then** I see a chart showing price changes over the last 7/30/90 days.
2. **Given** I'm viewing price history, **When** I hover over a data point, **Then** I see the exact price and timestamp.
3. **Given** I'm on the dashboard, **When** I view the market overview, **Then** I see trending items (biggest price changes).

---

### User Story 4 - Watchlist Management (Priority: P2)

As a player, I want to organize my watched items into groups so that I can manage many items efficiently.

**Why this priority**: Quality of life feature - essential for power users but not required for basic usage.

**Independent Test**: Can be fully tested by creating groups, moving items between groups, without any alerts.

**Acceptance Scenarios**:

1. **Given** I'm on the watchlist page, **When** I create a new group named "胡桃 skins", **Then** I can add items to this group.
2. **Given** I have items in my watchlist, **When** I drag an item to a different group, **Then** the item moves to that group.
3. **Given** I have multiple groups, **When** I enable/disable alerts for a group, **Then** all items in that group have their alerts updated.

---

### User Story 5 - Multi-channel Notifications (Priority: P3)

As a player, I want to receive alerts through multiple channels (browser, email, webhook) so that I don't miss important price changes.

**Why this priority**: Extended functionality - basic in-app notifications are sufficient for most users.

**Independent Test**: Can be fully tested by configuring notification channels and receiving test alerts.

**Acceptance Scenarios**:

1. **Given** I'm in settings, **When** I enable browser notifications and grant permission, **Then** I receive browser push notifications for alerts.
2. **Given** I configured email notifications, **When** an alert triggers, **Then** I receive an email with item details and current price.
3. **Given** I configured a webhook, **When** an alert triggers, **Then** the system sends a POST request to my webhook URL.

---

### Edge Cases

- What happens when the CBG API is unavailable? → Show cached data with "last updated" timestamp, queue alerts for retry
- How does the system handle items that are sold or delisted? → Mark as "unavailable" in watchlist, preserve historical data
- What happens if two users watch the same item? → Each user has independent watchlist and alert settings
- How to handle items with no price history? → Show "insufficient data" message, start collecting from now
- What if price changes rapidly (flash sale)? → Configurable alert cooldown to prevent notification spam

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to search items by name, category (英雄皮肤/兵器皮肤/道具), rarity (金/红), and price range
- **FR-002**: System MUST fetch item details including name, price, 星格 (star grid attributes), rarity, and status
- **FR-003**: System MUST allow users to add items to a watchlist with configurable target price
- **FR-004**: System MUST periodically check prices for all watched items (configurable interval, default 5 minutes)
- **FR-005**: System MUST trigger alerts when item price meets or falls below target price
- **FR-006**: System MUST store price history for all tracked items
- **FR-007**: System MUST display price trend charts with configurable time ranges
- **FR-008**: System MUST support multiple watchlist groups for organization
- **FR-009**: System MUST persist all user data locally (watchlist, settings, history)
- **FR-010**: System MUST provide dashboard with overview of all tracked items and alerts

### Key Entities

- **Item**: Represents a CBG item with attributes: id, name, category, rarity, currentPrice, starGrid (颜色/式样/特殊), seller, status (抽签期/正常), lastUpdated
- **WatchlistEntry**: User's tracking entry with: itemId, targetPrice, alertEnabled, addedAt, group
- **PriceSnapshot**: Historical price record with: itemId, price, timestamp
- **Alert**: Triggered notification with: watchlistEntryId, triggeredPrice, triggeredAt, isRead, isResolved
- **WatchlistGroup**: User-defined category with: name, color, alertEnabled

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add an item to watchlist within 30 seconds of finding it
- **SC-002**: Price alerts are triggered within 30 seconds of price change detection
- **SC-003**: Dashboard loads in under 2 seconds with 100+ tracked items
- **SC-004**: Price history chart renders in under 500ms for 90-day data
- **SC-005**: System maintains 99.5% uptime for price monitoring (excluding CBG outages)
- **SC-006**: All user data persists correctly across application restarts
