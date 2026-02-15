export type ItemCategory = 'hero_skin' | 'weapon_skin' | 'item';
export type ItemRarity = 'gold' | 'red';
export type ItemStatus = 'normal' | 'draw' | 'sold' | 'delisted';

export interface StarGrid {
  color: number;
  style: number;
  special?: number;
}

export interface Item {
  id: string;
  name: string;
  serialNum: string | null;
  category: ItemCategory;
  rarity: ItemRarity;
  hero: string | null;
  weapon: string | null;
  starGrid: StarGrid;
  currentPrice: number;
  sellerName: string | null;
  status: ItemStatus;
  collectCount: number;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistGroup {
  id: number;
  name: string;
  color: string;
  alertEnabled: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface WatchlistEntry {
  id: number;
  itemId: string;
  item?: Item;
  groupId: number;
  group?: WatchlistGroup;
  targetPrice: number | null;
  alertEnabled: boolean;
  notes: string | null;
  addedAt: Date;
}

export interface PriceSnapshot {
  id: number;
  itemId: string;
  price: number;
  status: ItemStatus | null;
  checkedAt: Date;
}

export interface Alert {
  id: number;
  watchlistId: number;
  itemId: string;
  item?: Item;
  triggeredPrice: number;
  targetPrice: number;
  triggeredAt: Date;
  isRead: boolean;
  isResolved: boolean;
}

export interface Settings {
  checkIntervalMinutes: number;
  notificationEnabled: boolean;
  notificationSound: boolean;
}

export interface SearchParams {
  query?: string;
  category?: ItemCategory;
  rarity?: ItemRarity;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface PriceHistoryPoint {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
    cached?: boolean;
  };
}

export const KIND_ID_MAP: Record<ItemCategory, number | number[]> = {
  hero_skin: 3,
  weapon_skin: 4,
  item: [5, 6],
};

export const RARITY_MAP: Record<number, ItemRarity> = {
  1: 'red',
  2: 'gold',
};

export const RARITY_TO_NUMBER: Record<ItemRarity, number> = {
  red: 1,
  gold: 2,
};
