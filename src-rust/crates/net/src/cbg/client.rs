//! CBG API HTTP client.

use std::sync::Arc;
use std::time::Duration;
use reqwest::Client;
use shared::{Item, ItemCategory, Rarity};
use super::types::*;
use crate::RateLimiter;
use crate::cache::TtlCache;

// Forward declaration for SearchResult type
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub items: Vec<Item>,
    pub total: i64,
    pub page: i64,
    pub is_last_page: bool,
}

pub struct CbgClient {
    pub client: Client,
    pub base_url: String,
    pub rate_limiter: Arc<RateLimiter>,
    /// Cache for search results
    pub(super) search_cache: Arc<TtlCache<String, SearchResult>>,
    /// Cache for item details
    pub(super) item_detail_cache: Arc<TtlCache<String, Option<Item>>>,
}

impl CbgClient {
    pub fn new(base_url: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            client,
            base_url,
            rate_limiter: Arc::new(RateLimiter::new(1)), // 1 req/sec
            search_cache: Arc::new(TtlCache::new(100, 120)), // 100 entries, 2 min TTL
            item_detail_cache: Arc::new(TtlCache::new(200, 120)), // 200 entries, 2 min TTL
        }
    }

    /// Transform CBG aggregate item to our domain Item.
    pub fn transform_aggregate(item: &AggregateItem) -> Item {
        let search_type = item.search_type.clone().unwrap_or_default();
        let category = match search_type.as_str() {
            "role_skin" | "hero_skin" => ItemCategory::RoleSkin,
            "weapon_skin" => ItemCategory::WeaponSkin,
            _ => ItemCategory::Item,
        };

        // Parse rarity from equip_type_desc (e.g., "金 | 土御门胡桃" -> Gold)
        let rarity = item.equip_type_desc.as_ref().and_then(|desc| {
            if desc.starts_with("红") {
                Some(Rarity::Red)
            } else if desc.starts_with("金") {
                Some(Rarity::Gold)
            } else {
                None
            }
        });

        Item {
            id: item.equip_type.clone(),
            name: item.equip_type_name.clone(),
            category,
            rarity,
            current_price: None,
            min_price: item.min_price,
            image_url: item.equip_type_list_img_url.clone(),
            capture_urls: item.equip_type_capture_url.clone().unwrap_or_default(),
            equip_type_desc: item.equip_type_desc.clone(),
            search_type: Some(search_type),
        }
    }
}

impl Default for CbgClient {
    fn default() -> Self {
        Self::new("https://yjwujian.cbg.163.com".to_string())
    }
}
