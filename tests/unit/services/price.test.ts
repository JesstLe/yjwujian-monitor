import { describe, it, expect } from 'vitest';

describe('Price Utilities', () => {
  const formatPrice = (cents: number): string => {
    return `¥${(cents / 100).toFixed(2)}`;
  };

  const parsePrice = (yuan: string): number => {
    return Math.round(parseFloat(yuan) * 100);
  };

  it('should format price from cents to yuan', () => {
    expect(formatPrice(338000)).toBe('¥3380.00');
    expect(formatPrice(6)).toBe('¥0.06');
    expect(formatPrice(100)).toBe('¥1.00');
  });

  it('should parse price from yuan to cents', () => {
    expect(parsePrice('3380.00')).toBe(338000);
    expect(parsePrice('0.06')).toBe(6);
    expect(parsePrice('1.00')).toBe(100);
  });

  it('should handle decimal prices', () => {
    expect(formatPrice(99)).toBe('¥0.99');
    expect(parsePrice('0.99')).toBe(99);
  });
});

describe('Alert Logic', () => {
  const shouldTriggerAlert = (currentPrice: number, targetPrice: number | null, alertEnabled: boolean): boolean => {
    if (!targetPrice || !alertEnabled) return false;
    return currentPrice <= targetPrice;
  };

  it('should trigger when price is at or below target', () => {
    expect(shouldTriggerAlert(90000, 100000, true)).toBe(true);
    expect(shouldTriggerAlert(100000, 100000, true)).toBe(true);
    expect(shouldTriggerAlert(110000, 100000, true)).toBe(false);
  });

  it('should not trigger when alert is disabled', () => {
    expect(shouldTriggerAlert(90000, 100000, false)).toBe(false);
  });

  it('should not trigger when target price is not set', () => {
    expect(shouldTriggerAlert(90000, null, true)).toBe(false);
  });
});

describe('Star Grid', () => {
  interface StarGrid {
    color: number;
    style: number;
    special?: number;
  }

  const parseStarGrid = (values: number[]): StarGrid => {
    return {
      color: values[0] ?? 0,
      style: values[1] ?? 0,
      special: values[2],
    };
  };

  it('should parse star grid values', () => {
    const grid = parseStarGrid([9702, 978, 1]);
    expect(grid.color).toBe(9702);
    expect(grid.style).toBe(978);
    expect(grid.special).toBe(1);
  });

  it('should handle missing values', () => {
    const grid = parseStarGrid([100, 200]);
    expect(grid.color).toBe(100);
    expect(grid.style).toBe(200);
    expect(grid.special).toBeUndefined();
  });

  it('should handle empty values', () => {
    const grid = parseStarGrid([]);
    expect(grid.color).toBe(0);
    expect(grid.style).toBe(0);
    expect(grid.special).toBeUndefined();
  });
});
