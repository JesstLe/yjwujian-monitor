import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { Item, ItemCategory, ItemRarity, StarGrid } from '@shared/types';

const CBG_BASE_URL = process.env.CBG_BASE_URL || 'https://yjwujian.cbg.163.com';
const REQUEST_DELAY = parseInt(process.env.CBG_REQUEST_DELAY_MS || '1000', 10);
const MAX_LOOKUP_PAGES = 10; // Bounded search for getItemById

// New aggregate API response types
interface CBGEquipType {
  equip_type: string;
  equip_type_name: string;
  equip_type_desc: string;
  min_price: number;
  selling_count: number;
  search_type: number | string;
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

// Category mapping based on search_type (string or number) and kindId
const SEARCH_TYPE_MAP: Record<string, ItemCategory> = {
  '1': 'hero_skin',
  'role_skin': 'hero_skin',
  'hero': 'hero_skin',
  '2': 'weapon_skin',
  'weapon_skin': 'weapon_skin',
  'weapon': 'weapon_skin',
  '3': 'item',
  '4': 'item',
  '5': 'item',
  '6': 'item',
  'daoju': 'item',
  'item': 'item',
};

function parseEquipTypeDesc(desc: string): {
  rarity: ItemRarity;
  hero: string | null;
  weapon: string | null;
} {
  const parts = desc.split('|').map(p => p.trim()).filter(Boolean);
  
  let rarity: ItemRarity = 'gold';
  let hero: string | null = null;
  let weapon: string | null = null;
  
  // Check for rarity indicators - check ALL parts
  const fullDesc = desc.toLowerCase();
  if (fullDesc.includes('红') || fullDesc.includes('红武') || fullDesc.includes('红色')) {
    rarity = 'red';
  } else if (fullDesc.includes('金') || fullDesc.includes('金色') || fullDesc.includes('金武')) {
    rarity = 'gold';
  }
  
  // Parse hero/weapon from pipe-separated parts
  // Pattern: "红 | 殷紫萍" means rarity=red, hero=殷紫萍
  // Pattern: "金 | 武器名" means rarity=gold, weapon=武器名
  if (parts.length >= 1) {
    const firstPart = parts[0];
    // If first part is just a rarity indicator (红/金), skip it
    const isRarityOnly = firstPart === '红' || firstPart === '金' || firstPart === '红色' || firstPart === '金色';
    
    if (isRarityOnly && parts.length >= 2) {
      // Second part is the actual hero/weapon
      const secondPart = parts[1];
      if (secondPart.length >= 2 && !secondPart.includes('武器')) {
        hero = secondPart;
      } else {
        weapon = secondPart;
      }
    } else if (!isRarityOnly) {
      // First part might be hero
      if (firstPart.length >= 2 && !firstPart.includes('武器') && !firstPart.includes('剑') && !firstPart.includes('刀')) {
        hero = firstPart;
      }
    }
  }
  
  if (parts.length >= 2) {
    const secondPart = parts[1];
    // If we didn't set hero from above, check if second part is weapon
    if (!weapon && !hero) {
      if (secondPart.includes('武器') || secondPart.includes('剑') || secondPart.includes('刀')) {
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
      return 'hero_skin';
    case 4:
      return 'weapon_skin';
    case 5:
    case 6:
      return 'item';
    default:
      return 'item';
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < REQUEST_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private generateSessionId(): string {
    return uuidv4().toUpperCase();
  }

  /**
   * Transform aggregate equip type to Item
   */
  private transformAggregateItem(equipType: CBGEquipType, requestedKindId?: number): Item {
    const { rarity, hero, weapon } = parseEquipTypeDesc(equipType.equip_type_desc);
    
    // Determine category from search_type or requested kindId
    let category: ItemCategory;
    if (requestedKindId) {
      category = getCategoryFromKindId(requestedKindId);
    } else {
      const searchKey = String(equipType.search_type);
      category = SEARCH_TYPE_MAP[searchKey] || 'item';
    }

    // Generate starGrid (placeholder for aggregate data)
    const starGrid: StarGrid = {
      color: 0,
      style: 0,
    };

    return {
      id: equipType.equip_type,
      name: equipType.equip_type_name,
      serialNum: null,
      category,
      rarity,
      hero,
      weapon,
      starGrid,
      currentPrice: equipType.min_price, // Already in cents
      sellerName: null,
      status: 'normal',
      collectCount: equipType.selling_count,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Transform legacy CBG item to Item (kept for compatibility)
   */
  private transformLegacyItem(item: CBGItem): Item {
    const starGrid: StarGrid = {
      color: item.base_equip_info?.star_grid?.[0] ?? 0,
      style: item.base_equip_info?.star_grid?.[1] ?? 0,
      special: item.base_equip_info?.star_grid?.[2],
    };

    return {
      id: item.equipid,
      name: item.equip_name,
      serialNum: item.base_equip_info?.serial_num ?? null,
      category: getCategoryFromKindId(item.kindid),
      rarity: item.base_equip_info?.rarity === 1 ? 'red' : 'gold',
      hero: null,
      weapon: null,
      starGrid,
      currentPrice: item.unit_price,
      sellerName: item.seller_name,
      status: item.is_draw === 1 ? 'draw' : 'normal',
      collectCount: item.collect_count ?? 0,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get items by category (kindId) using aggregate API
   */
  async getItemsByCategory(
    kindId: number,
    page: number = 1,
    count: number = 15
  ): Promise<{ items: Item[]; total: number; pageCount: number }> {
    await this.waitForRateLimit();

    const params = {
      client_type: 'h5',
      count,
      page,
      order_by: 'selling_time DESC',
      query_onsale: 1,
      kindid: kindId,
      exter: 'direct',
      page_session_id: this.generateSessionId(),
      traffic_trace: JSON.stringify({ field_id: '', content_id: '' }),
    };

    try {
      // Try aggregate API first
      const response = await this.client.get<CBGAggregateResponse>('/cgi/api/get_aggregate_equip_type_list', { params });

      if (response.data.status !== 0 && response.data.status !== 1 && response.data.status !== 200) {
        // Try legacy API as fallback
        return this.getItemsByCategoryLegacy(kindId, page, count);
      }

      const items = response.data.equip_type_list.map((equipType) => 
        this.transformAggregateItem(equipType, kindId)
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
    count: number
  ): Promise<{ items: Item[]; total: number; pageCount: number }> {
    await this.waitForRateLimit();

    const params = {
      client_type: 'h5',
      count,
      page,
      order_by: 'selling_time DESC',
      query_onsale: 1,
      kindid: kindId,
      exter: 'direct',
      page_session_id: this.generateSessionId(),
      traffic_trace: JSON.stringify({ field_id: '', content_id: '' }),
    };

    const response = await this.client.get<CBGListResponse>('/cgi/api/get_aggregate_equip_type_list', { params });

    if (!response.data.result) {
      throw new Error(response.data.error?.message || 'Failed to fetch items');
    }

    const items = response.data.data.equip_list.map((item) => this.transformLegacyItem(item));

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
    const detailItem = await this.getItemDetailById(equipType);
    if (detailItem) {
      return detailItem;
    }

    // Bounded search across categories and pages
    const categories: ItemCategory[] = ['hero_skin', 'weapon_skin', 'item'];
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
      if (category === 'item') {
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
   * Try to get item detail directly (for more info)
   */
  private async getItemDetailById(equipId: string): Promise<Item | null> {
    await this.waitForRateLimit();

    const params = {
      client_type: 'h5',
      equipid: equipId,
      gameid: 2,
    };

    try {
      const response = await this.client.get<{ result: boolean; data?: { equip?: CBGItem } }>('/cgi/api/get_equip_detail', { params });
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
