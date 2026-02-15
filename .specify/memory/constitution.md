# YJWUJIAN Monitor Constitution

## Core Principles

### I. Data-First Architecture
- All functionality MUST be driven by data from the CBG API
- Data models MUST be defined before implementation
- API responses MUST be cached appropriately to reduce load
- Raw API data MUST be preserved for audit and replay

### II. Real-time Monitoring Philosophy
- Price checks MUST be scheduled with configurable intervals
- Alerts MUST be delivered within seconds of price threshold breach
- System MUST handle network failures gracefully with retry logic
- Rate limiting MUST be respected to avoid service disruption

### III. User Experience Priority
- Interface MUST be intuitive for non-technical users
- Critical alerts MUST be prominent and actionable
- Settings MUST be easy to configure without technical knowledge
- Mobile-first design for monitoring on the go

### IV. Privacy & Security
- User credentials MUST be stored securely (encrypted at rest)
- API calls MUST NOT expose sensitive user data in logs
- Session management MUST handle token expiration gracefully
- No data collection beyond what's necessary for monitoring

### V. Extensibility
- Monitor types MUST be pluggable (price, availability, status)
- Notification channels MUST be swappable (console, email, webhook)
- Data storage MUST support multiple backends (SQLite, PostgreSQL)
- API layer MUST be abstracted to support potential changes

## Technical Constraints

### Technology Stack
- Backend: Node.js with TypeScript for type safety
- Frontend: React for responsive UI
- Database: SQLite for local storage, configurable for cloud
- Notifications: Multi-channel support (console, email, webhook)

### Performance Standards
- Price checks MUST complete within 10 seconds
- UI MUST respond within 100ms for interactions
- Memory usage MUST stay under 512MB for typical workloads
- Database queries MUST use indexes for common access patterns

### Reliability Requirements
- System MUST recover from network failures automatically
- Data MUST persist across application restarts
- Alerts MUST not be lost due to system restarts
- Configuration MUST be version-controlled

## Development Workflow

### Testing Requirements
- Unit tests for all data transformation logic
- Integration tests for API interactions
- E2E tests for critical user journeys
- Mock API responses for development

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for code consistency
- No `any` types without justification
- All public APIs must be documented

## Governance

This constitution supersedes all other practices. Amendments require:
1. Documentation of the change rationale
2. Review of impact on existing features
3. Migration plan for any breaking changes

All development decisions must align with these principles. When in doubt, prioritize user experience and data integrity.

**Version**: 1.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-15
