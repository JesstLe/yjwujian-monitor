export type ItemCategory = "hero_skin" | "weapon_skin" | "item";
export type ItemRarity = "gold" | "red";
export type ItemStatus = "normal" | "draw" | "sold" | "delisted";

export interface StarGrid {
  slots: (number | null)[]; // [槽位1, 槽位2, 槽位3, 槽位4]
}

/**
 * 谪星物品的变体属性
 * 每个属性包含名称和对应的品质值
 * 例如: { name: "颜色", quality: 5 } 表示颜色属性品质为5
 */
export interface VariationAttribute {
  name: string; // 属性名称，如"颜色"、"狐尾"、"纹样"等
  quality: number; // 品质值，通常1-5
}

/**
 * 谪星物品的变体信息
 * 包含物品的所有变体属性详情
 */
export interface VariationInfo {
  variationId: string; // 变体ID，如"973-996-185-0"
  variationName: string; // 原始属性名称字符串，如"颜色-狐尾-裙纹-天狐"
  variationQuality: string; // 原始品质字符串，如"5-5-3-1"
  variationUnlock: string; // 解锁状态，如"1-1-1-0"
  variationUnlockNum: number; // 已解锁数量
  redStarNum: number; // 红星数量
  attributes: VariationAttribute[]; // 解析后的属性数组
}

export interface StarGridFilters {
  starLevel?: number;
  slot1Min?: number;
  slot1Max?: number;
  slot2Min?: number;
  slot2Max?: number;
  slot3Min?: number;
  slot3Max?: number;
  slot4Min?: number;
  slot4Max?: number;
}

export interface Item {
  id: string;
  name: string;
  imageUrl: string | null; // 缩略图 URL
  captureUrls: string[]; // 3D 旋转预览图数组（最多32张）
  serialNum: string | null;
  category: ItemCategory;
  rarity: ItemRarity;
  hero: string | null;
  weapon: string | null;
  starGrid: StarGrid;
  variationInfo: VariationInfo | null; // 谪星物品的变体信息（颜色、狐尾等）
  currentPrice: number;
  sellerName: string | null;
  status: ItemStatus;
  collectCount: number;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  gameOrdersn: string | null;
  rawDesc?: {
    variation_id?: string;
    variation_quality?: string;
    counter_value?: number;
    washed_count?: number;
    collection_score?: number;
    // Add other fields from equip_desc if needed
  } | null;
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
    isLastPage?: boolean;
  };
}

export const KIND_ID_MAP: Record<ItemCategory, number | number[]> = {
  hero_skin: 3,
  weapon_skin: 4,
  item: [5, 6],
};

export const RARITY_MAP: Record<number, ItemRarity> = {
  1: "red",
  2: "gold",
};

export const RARITY_TO_NUMBER: Record<ItemRarity, number> = {
  red: 1,
  gold: 2,
};
