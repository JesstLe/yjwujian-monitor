import axios, { AxiosInstance } from "axios";
import { v4 as uuidv4 } from "uuid";
import type { Item, ItemCategory, ItemRarity, StarGrid } from "@shared/types";

const CBG_BASE_URL = process.env.CBG_BASE_URL || "https://yjwujian.cbg.163.com";
const REQUEST_DELAY = parseInt(process.env.CBG_REQUEST_DELAY_MS || "1000", 10);
const MAX_LOOKUP_PAGES = 10; // Bounded search for getItemById

// New aggregate API response types
interface CBGEquipType {
  equip_type: string;
  equip_type_name: string;
  equip_type_desc: string;
  min_price: number;
  selling_count: number;
  search_type: number | string;
  equip_type_list_img_url: string; // 缩略图 URL
  equip_type_capture_url: string[]; // 3D 旋转预览图数组
  equip_type_view_url: string;
  equip_type_3d_view_url: string;
}

interface CBGAggregateResponse {
  status: number;
  equip_type_list: CBGEquipType[];
  count: number;
  is_last_page: number;
}

// Legacy item types (kept for compatibility)
interface CBGItem {
  equipid: string;
  gameid: number;
  kindid: number;
  typeid: number;
  equip_name: string;
  unit_price: number;
  serverid: string;
  seller_name: string;
  status: number;
  is_draw: number;
  collect_count: number;
  base_equip_info: {
    rarity: number;
    star_grid: number[];
    serial_num: string;
  };
  sell_time: string;
  left_sell_time: number;
}

interface CBGListResponse {
  result: boolean;
  data: {
    equip_list: CBGItem[];
    total_count: number;
    page_count: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

// Recommend API response types (Sub-item listings)
export interface CBGRecommendItem {
  serverid: number;
  equipid: number;
  eid: string;
  game_ordersn: string;
  price: number; // Unit: cents
  collect_num: number;
  server_name: string;
  kindid: number;
  status: number;
  selling_time: string;
  equip_type: string;
  format_equip_name: string;
  other_info: {
    basic_attrs: string[]; // e.g. ["编号: Y001573"]
    capture_url?: string[];
    variation_info?: {
      variation_id: string;
      variation_name: string;
      variation_quality: string; // e.g. "5-5-3-1"
      variation_unlock: string;
      variation_unlock_num: number;
      red_star_num: number;
    };
  };
}

interface CBGRecommendResponse {
  status: number;
  status_code: string;
  result: CBGRecommendItem[];
  paging: {
    is_last_page: boolean;
  };
}

// Category mapping based on search_type (string or number) and kindId
const SEARCH_TYPE_MAP: Record<string, ItemCategory> = {
  "1": "hero_skin",
  role_skin: "hero_skin",
  hero: "hero_skin",
  "2": "weapon_skin",
  weapon_skin: "weapon_skin",
  weapon: "weapon_skin",
  "3": "item",
  "4": "item",
  "5": "item",
  "6": "item",
  daoju: "item",
  item: "item",
};

function parseEquipTypeDesc(desc: string): {
  rarity: ItemRarity;
  hero: string | null;
  weapon: string | null;
} {
  const parts = desc
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  let rarity: ItemRarity = "gold";
  let hero: string | null = null;
  let weapon: string | null = null;

  // Check for rarity indicators - check ALL parts
  const fullDesc = desc.toLowerCase();
  if (
    fullDesc.includes("红") ||
    fullDesc.includes("红武") ||
    fullDesc.includes("红色")
  ) {
    rarity = "red";
  } else if (
    fullDesc.includes("金") ||
    fullDesc.includes("金色") ||
    fullDesc.includes("金武")
  ) {
    rarity = "gold";
  }

  // Parse hero/weapon from pipe-separated parts
  // Pattern: "红 | 殷紫萍" means rarity=red, hero=殷紫萍
  // Pattern: "金 | 武器名" means rarity=gold, weapon=武器名
  if (parts.length >= 1) {
    const firstPart = parts[0];
    // If first part is just a rarity indicator (红/金), skip it
    const isRarityOnly =
      firstPart === "红" ||
      firstPart === "金" ||
      firstPart === "红色" ||
      firstPart === "金色";

    if (isRarityOnly && parts.length >= 2) {
      // Second part is the actual hero/weapon
      const secondPart = parts[1];
      if (secondPart.length >= 2 && !secondPart.includes("武器")) {
        hero = secondPart;
      } else {
        weapon = secondPart;
      }
    } else if (!isRarityOnly) {
      // First part might be hero
      if (
        firstPart.length >= 2 &&
        !firstPart.includes("武器") &&
        !firstPart.includes("剑") &&
        !firstPart.includes("刀")
      ) {
        hero = firstPart;
      }
    }
  }

  if (parts.length >= 2) {
    const secondPart = parts[1];
    // If we didn't set hero from above, check if second part is weapon
    if (!weapon && !hero) {
      if (
        secondPart.includes("武器") ||
        secondPart.includes("剑") ||
        secondPart.includes("刀")
      ) {
        weapon = secondPart;
      }
    }
  }

  return { rarity, hero, weapon };
}

// Map kindId to category
function getCategoryFromKindId(kindId: number): ItemCategory {
  switch (kindId) {
    case 3:
      return "hero_skin";
    case 4:
      return "weapon_skin";
    case 5:
    case 6:
      return "item";
    default:
      return "item";
  }
}

class CBGClient {
  private client: AxiosInstance;
  private lastRequestTime = 0;

  constructor() {
    this.client = axios.create({
      baseURL: CBG_BASE_URL,
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < REQUEST_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, REQUEST_DELAY - elapsed),
      );
    }
    this.lastRequestTime = Date.now();
  }

  private generateSessionId(): string {
    return uuidv4().toUpperCase();
  }

  /**
   * Transform aggregate equip type to Item
   */
  private transformAggregateItem(
    equipType: CBGEquipType,
    requestedKindId?: number,
  ): Item {
    const { rarity, hero, weapon } = parseEquipTypeDesc(
      equipType.equip_type_desc,
    );

    // Determine category from search_type or requested kindId
    let category: ItemCategory;
    if (requestedKindId) {
      category = getCategoryFromKindId(requestedKindId);
    } else {
      const searchKey = String(equipType.search_type);
      category = SEARCH_TYPE_MAP[searchKey] || "item";
    }

    // Generate starGrid (placeholder for aggregate data)
    const starGrid: StarGrid = {
      slots: [null, null, null, null],
    };

    return {
      id: equipType.equip_type,
      name: equipType.equip_type_name,
      imageUrl: equipType.equip_type_list_img_url || null,
      captureUrls: equipType.equip_type_capture_url || [],
      serialNum: null,
      category,
      rarity,
      hero,
      weapon,
      starGrid,
      currentPrice: equipType.min_price, // 单位：分
      sellerName: null,
      status: "normal",
      collectCount: equipType.selling_count,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      gameOrdersn: null,
      rawDesc: null,
    };
  }

  /**
   * Transform legacy CBG item to Item (kept for compatibility)
   */
  private transformLegacyItem(item: CBGItem): Item {
    const starGrid: StarGrid = {
      slots: [
        item.base_equip_info?.star_grid?.[0] ?? null,
        item.base_equip_info?.star_grid?.[1] ?? null,
        item.base_equip_info?.star_grid?.[2] ?? null,
        item.base_equip_info?.star_grid?.[3] ?? null,
      ],
    };

    let rawDesc = null;
    try {
      // equip_desc is sometimes a JSON string in other_info or directly on item in detail response
      const desc = (item as any).equip_desc;
      if (desc && typeof desc === "string") {
        const parsed = JSON.parse(desc);
        if (parsed.raw_content) {
          rawDesc = parsed.raw_content;
        }
      }
    } catch (e) {
      console.error("Failed to parse equip_desc", e);
    }

    return {
      id: item.equipid,
      name: item.equip_name,
      imageUrl: null,
      captureUrls: [],
      serialNum: item.base_equip_info?.serial_num ?? null,
      category: getCategoryFromKindId(item.kindid),
      rarity: item.base_equip_info?.rarity === 1 ? "red" : "gold",
      hero: null,
      weapon: null,
      starGrid,
      currentPrice: item.unit_price,
      sellerName: item.seller_name,
      status: item.is_draw === 1 ? "draw" : "normal",
      collectCount: item.collect_count ?? 0,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      gameOrdersn: (item as any).game_ordersn || null,
      rawDesc,
    };
  }

  /**
   * Get items by category (kindId) using aggregate API
   */
  async getItemsByCategory(
    kindId: number,
    page: number = 1,
    count: number = 15,
    filters?: {
      keyword?: string;
      priceMin?: number;
      priceMax?: number;
    },
  ): Promise<{ items: Item[]; total: number; pageCount: number }> {
    await this.waitForRateLimit();

    const params: Record<string, any> = {
      client_type: "h5",
      count,
      page,
      order_by: "selling_time DESC",
      query_onsale: 1,
      kindid: kindId,
      exter: "direct",
      page_session_id: this.generateSessionId(),
      traffic_trace: JSON.stringify({ field_id: "", content_id: "" }),
    };

    if (filters?.keyword) params.keyword = filters.keyword;
    if (filters?.priceMin) params.price_min = filters.priceMin * 100; // Convert to cents
    if (filters?.priceMax) params.price_max = filters.priceMax * 100;

    try {
      // Try aggregate API first
      const response = await this.client.get<CBGAggregateResponse>(
        "/cgi/api/get_aggregate_equip_type_list",
        { params },
      );

      if (
        response.data.status !== 0 &&
        response.data.status !== 1 &&
        response.data.status !== 200
      ) {
        // Try legacy API as fallback
        return this.getItemsByCategoryLegacy(kindId, page, count);
      }

      const items = response.data.equip_type_list.map((equipType) =>
        this.transformAggregateItem(equipType, kindId),
      );

      return {
        items,
        total: response.data.count,
        pageCount: response.data.is_last_page ? page : page + 1,
      };
    } catch {
      // Try legacy API on error
      return this.getItemsByCategoryLegacy(kindId, page, count);
    }
  }

  /**
   * Legacy fallback for item list
   */
  private async getItemsByCategoryLegacy(
    kindId: number,
    page: number,
    count: number,
  ): Promise<{ items: Item[]; total: number; pageCount: number }> {
    await this.waitForRateLimit();

    const params = {
      client_type: "h5",
      count,
      page,
      order_by: "selling_time DESC",
      query_onsale: 1,
      kindid: kindId,
      exter: "direct",
      page_session_id: this.generateSessionId(),
      traffic_trace: JSON.stringify({ field_id: "", content_id: "" }),
    };

    const response = await this.client.get<CBGListResponse>(
      "/cgi/api/get_aggregate_equip_type_list",
      { params },
    );

    if (!response.data.result) {
      throw new Error(response.data.error?.message || "Failed to fetch items");
    }

    const items = response.data.data.equip_list.map((item) =>
      this.transformLegacyItem(item),
    );

    return {
      items,
      total: response.data.data.total_count,
      pageCount: response.data.data.page_count,
    };
  }

  /**
   * Get item by ID with bounded search across categories/pages
   * Used for watchlist monitoring - resolves equip_type across categories
   */
  async getItemById(equipType: string): Promise<Item | null> {
    // First, try to get detail directly (if that endpoint exists)
    const detailItem = await this.getItemDetail(equipType);
    if (detailItem) {
      return detailItem;
    }

    // Bounded search across categories and pages
    const categories: ItemCategory[] = ["hero_skin", "weapon_skin", "item"];
    const kindIdMap: Record<ItemCategory, number> = {
      hero_skin: 3,
      weapon_skin: 4,
      item: 5, // Try 5 first, then 6
    };

    for (const category of categories) {
      const kindId = kindIdMap[category];

      // Search multiple pages per category (bounded)
      for (let page = 1; page <= MAX_LOOKUP_PAGES; page++) {
        try {
          const result = await this.getItemsByCategory(kindId, page, 20);

          const found = result.items.find((item) => item.id === equipType);
          if (found) {
            return found;
          }

          // Stop if we've reached the last page
          if (page >= result.pageCount) {
            break;
          }
        } catch {
          // Continue to next category on error
          break;
        }
      }

      // For 'item' category, also try kindId 6
      if (category === "item") {
        for (let page = 1; page <= MAX_LOOKUP_PAGES; page++) {
          try {
            const result = await this.getItemsByCategory(6, page, 20);

            const found = result.items.find((item) => item.id === equipType);
            if (found) {
              return found;
            }

            if (page >= result.pageCount) {
              break;
            }
          } catch {
            break;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get sub-item listings for a specific equip type
   * @param equipType The aggregate item type ID (e.g. 3402116 for 通天狐妖)
   * @param searchType The search type string (e.g. 'role_skin')
   */
  async getEquipListByType(
    equipType: string,
    searchType: string,
    page: number = 1,
    count: number = 15,
    orderBy: string = "price ASC",
  ): Promise<{ items: Item[]; isLastPage: boolean }> {
    await this.waitForRateLimit();

    const params = new URLSearchParams();
    params.append("client_type", "h5");
    params.append("act", "recommd_by_role");
    params.append("equip_type", equipType);
    params.append("search_type", searchType);
    params.append("page", page.toString());
    params.append("count", count.toString());
    params.append("order_by", orderBy);

    try {
      const response = await this.client.post<CBGRecommendResponse>(
        "/cgi-bin/recommend.py",
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (response.data.status !== 1) {
        throw new Error(`API Error: ${response.data.status_code}`);
      }

      const items = response.data.result.map((item) =>
        this.transformRecommendItem(item, searchType),
      );

      return {
        items,
        isLastPage: response.data.paging.is_last_page,
      };
    } catch (error) {
      console.error("Failed to fetch sub-item list:", error);
      throw error;
    }
  }

  private transformRecommendItem(
    item: CBGRecommendItem,
    searchType: string,
  ): Item {
    // Extract serial number from basic_attrs
    let serialNum: string | null = null;
    if (item.other_info.basic_attrs) {
      const serialAttr = item.other_info.basic_attrs.find((attr) =>
        attr.includes("编号"),
      );
      if (serialAttr) {
        serialNum = serialAttr.split(":")[1]?.trim() || null;
      }
    }

    // Parse star grid from variation_quality
    // quality string format: "5-5-3-1" -> [5, 5, 3, 1]
    const qualityStr = item.other_info?.variation_info?.variation_quality || "";
    const qualities = qualityStr.split("-").map(Number);
    const starGrid: StarGrid = {
      slots: [
        qualities[0] || null,
        qualities[1] || null,
        qualities[2] || null,
        qualities[3] || null,
      ],
    };

    return {
      id: item.equipid.toString(), // Individual item ID
      name: item.format_equip_name,
      imageUrl: item.other_info.capture_url?.[0] || null,
      captureUrls: item.other_info.capture_url || [],
      serialNum,
      category: SEARCH_TYPE_MAP[searchType] || "item",
      rarity: item.other_info?.variation_info?.red_star_num ? "red" : "gold", // Heuristic: has red stars -> red rarity
      hero: null, // Listings don't always have this info easily accessible, relies on aggregate context
      weapon: null,
      starGrid,
      currentPrice: item.price, // Unit: cents
      sellerName: null, // Not in listing response
      status: item.status === 2 ? "normal" : "sold",
      collectCount: item.collect_num,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      gameOrdersn: item.game_ordersn || null, // Capture ordersn for detail fetching
      rawDesc: null, // Detail not present in recommend list
    };
  }

  /**
   * Try to get item detail directly (for more info)
   */
  async getItemDetail(equipId: string, ordersn?: string): Promise<Item | null> {
    await this.waitForRateLimit();

    const params: any = {
      client_type: "h5",
      equipid: equipId,
      gameid: 2,
    };
    if (ordersn) {
      params.ordersn = ordersn;
    }

    try {
      const response = await this.client.get<{
        result: boolean;
        data?: { equip?: CBGItem };
      }>("/cgi/api/get_equip_detail", { params });
      if (!response.data.result || !response.data.data?.equip) {
        return null;
      }
      return this.transformLegacyItem(response.data.data.equip);
    } catch {
      return null;
    }
  }
}

export const cbgClient = new CBGClient();
export default cbgClient;
