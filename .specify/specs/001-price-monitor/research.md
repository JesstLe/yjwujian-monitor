# Research: CBG API

**Date**: 2026-02-15
**Feature**: 001-price-monitor

## API Endpoints

### Base URL
```
https://yjwujian.cbg.163.com
```

### 1. Get Item List
```
GET /cgi/api/get_aggregate_equip_type_list

Query Parameters:
- client_type: "h5"
- count: number (items per page, max ~50)
- page: number (1-indexed)
- order_by: string (e.g., "selling_time DESC", "unit_price ASC")
- query_onsale: 0 | 1
- kindid: number (3=hero skins, 4=weapon skins, 5,6=items)
- exter: "direct"
- page_session_id: string (UUID format)
- traffic_trace: JSON string {"field_id":"","content_id":""}

Response Structure:
{
  "result": boolean,
  "data": {
    "equip_list": [
      {
        "equipid": string,          // Unique item ID
        "gameid": number,           // Game ID (2 for Naraka)
        "kindid": number,           // Category ID
        "typeid": number,           // Type ID within category
        "equip_name": string,       // Item name
        "unit_price": number,       // Price in cents (divide by 100)
        "serverid": string,         // Server ID
        "seller_name": string,      // Seller name
        "status": number,           // Status code
        "is_draw": number,          // 1 if in draw period
        "collect_count": number,    // Favorite count
        "base_equip_info": {
          "rarity": number,         // Rarity level
          "star_grid": number[],    // Star grid values [color, style, special]
          "serial_num": string      // Serial number (e.g., "Y016874")
        },
        "sell_time": string,        // Listing time
        "left_sell_time": number    // Remaining time in seconds
      }
    ],
    "total_count": number,
    "page_count": number
  }
}
```

### 2. Get Login Info
```
GET /cgi/api/get_login_info

Query Parameters:
- client_type: "h5"
- page_session_id: string

Response Structure:
{
  "result": boolean,
  "data": {
    "is_login": boolean,
    "username": string | null,
    "userid": string | null
  }
}
```

### 3. Get Item Detail
```
GET /cgi/api/get_equip_detail

Query Parameters:
- client_type: "h5"
- equipid: string (item ID)
- gameid: number (2)

Response Structure:
{
  "result": boolean,
  "data": {
    "equip": {
      // Same as list item, plus additional fields:
      "desc": string,              // Item description
      "collect_score": number,     // Collection score
      "kill_data": string,         // Kill/usage statistics
      "refine_count": number       // Refinement count
    },
    "seller": {
      "name": string,
      "credit": number
    },
    "similar_items": [...]         // Similar items for recommendation
  }
}
```

### 4. Get Topics/Categories
```
GET /cgi/api/get_auto_topics

Query Parameters:
- client_type: "h5"
- support_new_format: 1
- serverid: string (empty for all)
- page_session_id: string
- traffic_trace: JSON string

Response Structure:
{
  "result": boolean,
  "data": {
    "topics": [
      {
        "topic_id": number,
        "topic_name": string,
        "topic_icon": string,
        "item_count": number
      }
    ]
  }
}
```

## Rate Limits

Based on testing:
- No explicit rate limiting observed
- Recommended: 1 request per second maximum
- Use page_session_id for session tracking
- Cache responses when possible

## Error Handling

Common error responses:
```json
{
  "result": false,
  "error": {
    "code": number,
    "message": string
  }
}
```

## Notes

1. All prices are in Chinese Yuan (CNY), stored as cents (multiply by 100)
2. Session IDs should be UUID v4 format
3. `star_grid` array typically has 3 values: [color, style, special]
4. `is_draw: 1` means item is in lottery/draw period (抽签期)
5. API may return gzipped responses
