# API Contract: CBG Integration

**Version**: 1.0.0
**Last Updated**: 2026-02-15

## Overview

This document defines the contract for integrating with the CBG (藏宝阁) API for Naraka: Bladepoint (永劫无间).

## Base Configuration

```typescript
const CBG_CONFIG = {
  baseUrl: 'https://yjwujian.cbg.163.com',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  requestDelay: 1000, // Delay between requests (rate limiting)
};
```

## Authentication

CBG API uses session-based authentication. No API key required for public endpoints.

Session ID format: UUID v4
```
page_session_id: "019C6101-8E0D-8181-68C2-7394C683E256"
```

## Endpoints

### 1. Get Item List

**Endpoint**: `GET /cgi/api/get_aggregate_equip_type_list`

**Purpose**: Retrieve paginated list of items by category

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| client_type | string | Yes | Always "h5" |
| count | number | Yes | Items per page (1-50) |
| page | number | Yes | Page number (1-indexed) |
| order_by | string | No | Sort order (default: "selling_time DESC") |
| query_onsale | number | No | 1 = on sale, 0 = all |
| kindid | number | Yes | Category: 3=hero, 4=weapon, 5,6=items |
| exter | string | No | Always "direct" |
| page_session_id | string | Yes | UUID v4 session ID |
| traffic_trace | string | No | JSON object: {"field_id":"","content_id":""} |

**Response**:

```typescript
interface ItemListResponse {
  result: boolean;
  data: {
    equip_list: CBGItem[];
    total_count: number;
    page_count: number;
  };
}

interface CBGItem {
  equipid: string;
  gameid: number;
  kindid: number;
  typeid: number;
  equip_name: string;
  unit_price: number;      // Price in cents
  serverid: string;
  seller_name: string;
  status: number;
  is_draw: number;         // 1 = in draw period
  collect_count: number;
  base_equip_info: {
    rarity: number;        // 1=red, 2=gold
    star_grid: number[];   // [color, style, special]
    serial_num: string;
  };
  sell_time: string;
  left_sell_time: number;  // Seconds remaining
}
```

**Example**:
```bash
curl "https://yjwujian.cbg.163.com/cgi/api/get_aggregate_equip_type_list?client_type=h5&count=15&page=1&kindid=3&page_session_id=019C6101-8E0D-8181-68C2-7394C683E256"
```

---

### 2. Get Item Detail

**Endpoint**: `GET /cgi/api/get_equip_detail`

**Purpose**: Get detailed information for a specific item

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| client_type | string | Yes | Always "h5" |
| equipid | string | Yes | Item ID |
| gameid | number | Yes | Always 2 for Naraka |

**Response**:

```typescript
interface ItemDetailResponse {
  result: boolean;
  data: {
    equip: CBGItem & {
      desc: string;
      collect_score: number;
      kill_data: string;
      refine_count: number;
    };
    seller: {
      name: string;
      credit: number;
    };
    similar_items: CBGItem[];
  };
}
```

---

### 3. Search Items

**Note**: CBG doesn't have a dedicated search endpoint. Use the list endpoint with different parameters and filter client-side.

For search functionality:
1. Fetch items by category
2. Filter by name on frontend
3. Cache results for performance

---

### 4. Get Topics/Categories

**Endpoint**: `GET /cgi/api/get_auto_topics`

**Purpose**: Get available item categories and subcategories

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| client_type | string | Yes | Always "h5" |
| support_new_format | number | Yes | Always 1 |
| serverid | string | No | Server filter (empty = all) |
| page_session_id | string | Yes | UUID v4 session ID |
| traffic_trace | string | No | JSON object |

**Response**:

```typescript
interface TopicsResponse {
  result: boolean;
  data: {
    topics: {
      topic_id: number;
      topic_name: string;
      topic_icon: string;
      item_count: number;
    }[];
  };
}
```

## Error Handling

All endpoints return consistent error format:

```typescript
interface ErrorResponse {
  result: false;
  error: {
    code: number;
    message: string;
  };
}
```

Common error codes:
- `400`: Bad request (missing parameters)
- `404`: Item not found
- `429`: Rate limited
- `500`: Server error

## Rate Limiting

**Guidelines**:
- Maximum 1 request per second
- Implement exponential backoff on 429 errors
- Cache responses when possible
- Use `If-Modified-Since` header if supported

**Implementation**:

```typescript
class RateLimiter {
  private lastRequestTime = 0;
  private minDelay = 1000; // 1 second

  async waitForNextRequest(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelay) {
      await sleep(this.minDelay - elapsed);
    }
    this.lastRequestTime = Date.now();
  }
}
```

## Data Transformation

### Price Conversion
```typescript
// CBG returns price in cents (分)
// Convert to yuan (元)
function centsToYuan(cents: number): number {
  return cents / 100;
}

// Store as cents, display as yuan
```

### Rarity Mapping
```typescript
const RARITY_MAP: Record<number, string> = {
  1: 'red',   // 红
  2: 'gold',  // 金
};
```

### Category Mapping
```typescript
const CATEGORY_MAP: Record<number, string> = {
  3: 'hero_skin',
  4: 'weapon_skin',
  5: 'item',
  6: 'item',
};
```

## Mock Responses

For development and testing, use mock responses:

```typescript
// tests/mocks/cbg-responses.ts
export const mockHeroSkinList = {
  result: true,
  data: {
    equip_list: [
      {
        equipid: 'test-hero-001',
        gameid: 2,
        kindid: 3,
        typeid: 1,
        equip_name: '谪星·风之絮语',
        unit_price: 338000,
        serverid: 'all',
        seller_name: '测试卖家',
        status: 1,
        is_draw: 0,
        collect_count: 155,
        base_equip_info: {
          rarity: 2,
          star_grid: [9702, 978, 1],
          serial_num: 'Y016874',
        },
        sell_time: '2026-02-01 10:00:00',
        left_sell_time: 1209600,
      },
    ],
    total_count: 1,
    page_count: 1,
  },
};
```

## Integration Testing

```typescript
// tests/integration/cbg.test.ts
describe('CBG API', () => {
  it('should fetch hero skin list', async () => {
    const response = await cbgClient.getItemList({
      kindid: 3,
      page: 1,
      count: 15,
    });
    
    expect(response.result).toBe(true);
    expect(response.data.equip_list).toBeDefined();
    expect(response.data.equip_list.length).toBeLessThanOrEqual(15);
  });
});
```
