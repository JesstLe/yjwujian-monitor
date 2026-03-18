//! CBG search functionality.

use crate::cbg::client::{CbgClient, SearchResult};
use crate::cbg::types::*;
use shared::{Item, ItemCategory};

/// Search options for CBG items.
#[derive(Debug, Clone, Default)]
pub struct SearchOptions {
    pub keyword: Option<String>,
    pub price_min: Option<i64>,
    pub price_max: Option<i64>,
    pub variation_unlock_level: Option<i64>,
}

impl CbgClient {
    /// Search items by category (kindId) using aggregate API.
    pub async fn search(
        &self,
        category: Option<ItemCategory>,
        page: i64,
        limit: i64,
        options: SearchOptions,
    ) -> Result<SearchResult, shared::error::AppError> {
        // Try cache first
        let cache_key = format!("search:{:?}:{}:{}:{:?}", category, page, limit, options);
        if let Some(cached) = self.search_cache.get(&cache_key).await {
            return Ok(cached);
        }

        self.rate_limiter.acquire().await;

        let kindid = match category {
            Some(ItemCategory::RoleSkin) => 3,
            Some(ItemCategory::WeaponSkin) => 4,
            Some(ItemCategory::Item) => 5,
            None => 3,
        };

        let url = format!("{}/cgi/api/get_aggregate_equip_type_list", self.base_url);
        let mut params = vec![
            ("client_type".to_string(), "h5".to_string()),
            ("count".to_string(), limit.to_string()),
            ("page".to_string(), page.to_string()),
            ("order_by".to_string(), "selling_time DESC".to_string()),
            ("query_onsale".to_string(), "1".to_string()),
            ("kindid".to_string(), kindid.to_string()),
            ("exter".to_string(), "direct".to_string()),
        ];

        if let Some(keyword) = options.keyword {
            params.push(("keyword".to_string(), keyword));
        }
        if let Some(min) = options.price_min {
            params.push(("price_min".to_string(), (min * 100).to_string())); // Convert to cents
        }
        if let Some(max) = options.price_max {
            params.push(("price_max".to_string(), (max * 100).to_string()));
        }
        if let Some(level) = options.variation_unlock_level {
            params.push(("variation_unlock_level".to_string(), level.to_string()));
        }

        let resp: reqwest::Response = self
            .client
            .get(&url)
            .query(&params)
            .send()
            .await
            .map_err(|e| shared::error::AppError::Network(e.to_string()))?;

        let body: CbgResponse = resp
            .json::<CbgResponse>()
            .await
            .map_err(|e| shared::error::AppError::Parse(e.to_string()))?;

        let data: AggregateListResponse = body
            .into_data()
            .map_err(|e| shared::error::AppError::Parse(e.to_string()))?
            .ok_or_else(|| shared::error::AppError::NotFound("Empty response".into()))?;

        let items: Vec<Item> = data
            .equip_type_list
            .iter()
            .map(|item| Self::transform_aggregate(item))
            .collect();

        let result = SearchResult {
            items,
            total: data.count,
            page: data.page,
            is_last_page: data.is_last_page,
        };

        // Cache the result
        self.search_cache.insert(cache_key, result.clone()).await;

        Ok(result)
    }
}
