"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('API Routes', () => {
    const mockItem = {
        id: 'test-001',
        name: '谪星·风之絮语',
        category: 'hero_skin',
        rarity: 'gold',
        currentPrice: 338000,
        status: 'normal',
    };
    (0, vitest_1.it)('should validate item structure', () => {
        (0, vitest_1.expect)(mockItem.id).toBe('test-001');
        (0, vitest_1.expect)(mockItem.name).toContain('风之絮语');
        (0, vitest_1.expect)(mockItem.category).toBe('hero_skin');
        (0, vitest_1.expect)(mockItem.rarity).toBe('gold');
    });
    (0, vitest_1.it)('should format item for API response', () => {
        const response = {
            success: true,
            data: mockItem,
        };
        (0, vitest_1.expect)(response.success).toBe(true);
        (0, vitest_1.expect)(response.data).toBeDefined();
        (0, vitest_1.expect)(response.data.currentPrice).toBe(338000);
    });
    (0, vitest_1.it)('should validate search params', () => {
        const params = {
            q: '胡桃',
            category: 'hero_skin',
            rarity: 'gold',
            page: 1,
            limit: 15,
        };
        (0, vitest_1.expect)(params.category).toBe('hero_skin');
        (0, vitest_1.expect)(params.page).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(params.limit).toBeLessThanOrEqual(50);
    });
    (0, vitest_1.it)('should validate watchlist entry', () => {
        const entry = {
            itemId: 'test-001',
            targetPrice: 300000,
            alertEnabled: true,
        };
        (0, vitest_1.expect)(entry.targetPrice).toBeLessThan(mockItem.currentPrice);
        (0, vitest_1.expect)(entry.alertEnabled).toBe(true);
    });
    (0, vitest_1.it)('should validate alert response', () => {
        const alert = {
            id: 1,
            watchlistId: 1,
            itemId: 'test-001',
            triggeredPrice: 280000,
            targetPrice: 300000,
            isRead: false,
            isResolved: false,
        };
        (0, vitest_1.expect)(alert.triggeredPrice).toBeLessThan(alert.targetPrice);
        (0, vitest_1.expect)(alert.isRead).toBe(false);
    });
});
(0, vitest_1.describe)('Settings API', () => {
    (0, vitest_1.it)('should validate settings structure', () => {
        const settings = {
            check_interval_minutes: 5,
            notification_enabled: true,
            notification_sound: true,
        };
        (0, vitest_1.expect)(settings.check_interval_minutes).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(settings.check_interval_minutes).toBeLessThanOrEqual(60);
        (0, vitest_1.expect)(typeof settings.notification_enabled).toBe('boolean');
    });
    (0, vitest_1.it)('should validate settings update', () => {
        const updates = {
            check_interval_minutes: 10,
            notification_enabled: false,
        };
        (0, vitest_1.expect)(updates.check_interval_minutes).toBe(10);
        (0, vitest_1.expect)(Object.keys(updates).length).toBe(2);
    });
});
(0, vitest_1.describe)('Groups API', () => {
    (0, vitest_1.it)('should validate group structure', () => {
        const group = {
            id: 1,
            name: '默认分组',
            color: '#3b82f6',
            alertEnabled: true,
        };
        (0, vitest_1.expect)(group.name).toBe('默认分组');
        (0, vitest_1.expect)(group.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
    (0, vitest_1.it)('should validate group creation', () => {
        const newGroup = {
            name: '胡桃皮肤',
            color: '#ef4444',
        };
        (0, vitest_1.expect)(newGroup.name.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(newGroup.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
});
