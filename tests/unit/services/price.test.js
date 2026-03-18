"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Price Utilities', () => {
    const formatPrice = (cents) => {
        return `¥${(cents / 100).toFixed(2)}`;
    };
    const parsePrice = (yuan) => {
        return Math.round(parseFloat(yuan) * 100);
    };
    (0, vitest_1.it)('should format price from cents to yuan', () => {
        (0, vitest_1.expect)(formatPrice(338000)).toBe('¥3380.00');
        (0, vitest_1.expect)(formatPrice(6)).toBe('¥0.06');
        (0, vitest_1.expect)(formatPrice(100)).toBe('¥1.00');
    });
    (0, vitest_1.it)('should parse price from yuan to cents', () => {
        (0, vitest_1.expect)(parsePrice('3380.00')).toBe(338000);
        (0, vitest_1.expect)(parsePrice('0.06')).toBe(6);
        (0, vitest_1.expect)(parsePrice('1.00')).toBe(100);
    });
    (0, vitest_1.it)('should handle decimal prices', () => {
        (0, vitest_1.expect)(formatPrice(99)).toBe('¥0.99');
        (0, vitest_1.expect)(parsePrice('0.99')).toBe(99);
    });
});
(0, vitest_1.describe)('Alert Logic', () => {
    const shouldTriggerAlert = (currentPrice, targetPrice, alertEnabled) => {
        if (!targetPrice || !alertEnabled)
            return false;
        return currentPrice <= targetPrice;
    };
    (0, vitest_1.it)('should trigger when price is at or below target', () => {
        (0, vitest_1.expect)(shouldTriggerAlert(90000, 100000, true)).toBe(true);
        (0, vitest_1.expect)(shouldTriggerAlert(100000, 100000, true)).toBe(true);
        (0, vitest_1.expect)(shouldTriggerAlert(110000, 100000, true)).toBe(false);
    });
    (0, vitest_1.it)('should not trigger when alert is disabled', () => {
        (0, vitest_1.expect)(shouldTriggerAlert(90000, 100000, false)).toBe(false);
    });
    (0, vitest_1.it)('should not trigger when target price is not set', () => {
        (0, vitest_1.expect)(shouldTriggerAlert(90000, null, true)).toBe(false);
    });
});
(0, vitest_1.describe)('Star Grid', () => {
    const parseStarGrid = (values) => {
        return {
            color: values[0] ?? 0,
            style: values[1] ?? 0,
            special: values[2],
        };
    };
    (0, vitest_1.it)('should parse star grid values', () => {
        const grid = parseStarGrid([9702, 978, 1]);
        (0, vitest_1.expect)(grid.color).toBe(9702);
        (0, vitest_1.expect)(grid.style).toBe(978);
        (0, vitest_1.expect)(grid.special).toBe(1);
    });
    (0, vitest_1.it)('should handle missing values', () => {
        const grid = parseStarGrid([100, 200]);
        (0, vitest_1.expect)(grid.color).toBe(100);
        (0, vitest_1.expect)(grid.style).toBe(200);
        (0, vitest_1.expect)(grid.special).toBeUndefined();
    });
    (0, vitest_1.it)('should handle empty values', () => {
        const grid = parseStarGrid([]);
        (0, vitest_1.expect)(grid.color).toBe(0);
        (0, vitest_1.expect)(grid.style).toBe(0);
        (0, vitest_1.expect)(grid.special).toBeUndefined();
    });
});
