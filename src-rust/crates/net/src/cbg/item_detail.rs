//! CBG item detail and sub-item listing functionality.

use crate::cbg::client::CbgClient;
use crate::cbg::types::*;
use shared::{Item, ItemCategory, ItemRarity, StarGrid, VariationInfo, VariationAttribute};
use serde::Deserialize;

/// Filters for sub-item listings.
#[derive(Debug, Clone, Default)]
pub struct ListingFilters {
    pub variation_unlock_level: Option<i64>,
    pub slot_index: Option<i64>,
    pub target_value: Option<i64>,
    pub min_value: Option<i64>,
    pub max_value: Option<i64>,
}

impl CbgClient {
    /// Get item detail by equip ID.
    pub async fn get_item_detail(
        &self,
        equip_id: &str,
        ordersn: Option<&str>,
    ) -> Result<Option<Item>, shared::error::AppError> {
        // Try cache first
        let cache_key = format!("item_detail:{}:{}", equip_id, ordersn.unwrap_or(""));
        if let Some(cached) = self.item_detail_cache.get(&cache_key).await {
            return Ok(cached);
        }

        self.rate_limiter.acquire().await;

        let url = format!("{}/cgi/api/get_equip_detail", self.base_url);
        let mut params = vec![
            ("client_type".to_string(), "h5".to_string()),
            ("equipid".to_string(), equip_id.to_string()),
            ("gameid".to_string(), "2".to_string()),
        ];

        if let Some(sn) = ordersn {
            params.push(("ordersn".to_string(), sn.to_string()));
        }

        #[derive(Deserialize)]
        struct DetailResponse {
            result: bool,
            data: Option<DetailData>,
        }

        #[derive(Deserialize)]
        struct DetailData {
            equip: Option<LegacyItem>,
        }

        let resp: reqwest::Response = self
            .client
            .get(&url)
            .query(&params)
            .send()
            .await
            .map_err(|e| shared::error::AppError::Network(e.to_string()))?;

        let body: DetailResponse = resp
            .json()
            .await
            .map_err(|e| shared::error::AppError::Parse(e.to_string()))?;

        if !body.result || body.data.is_none() || body.data.as_ref().and_then(|d| d.equip.as_ref()).is_none() {
            self.item_detail_cache.insert(cache_key, None).await;
            return Ok(None);
        }

        let legacy_item = body.data.unwrap().equip.unwrap();
        let item = self.transform_legacy_item(&legacy_item);

        self.item_detail_cache.insert(cache_key, Some(item.clone())).await;

        Ok(Some(item))
    }

    /// Get sub-item listings for a specific equip type.
    pub async fn get_sub_items(
        &self,
        equip_type: &str,
        search_type: &str,
        page: i64,
        count: i64,
        order_by: &str,
        filters: Option<ListingFilters>,
        parent_rarity: Option<ItemRarity>,
    ) -> Result<SubItemsResult, shared::error::AppError> {
        self.rate_limiter.acquire().await;

        let url = format!("{}/cgi-bin/recommend.py", self.base_url);

        let mut form_params = vec![
            ("client_type".to_string(), "h5".to_string()),
            ("act".to_string(), "recommd_by_role".to_string()),
            ("equip_type".to_string(), equip_type.to_string()),
            ("search_type".to_string(), search_type.to_string()),
            ("page".to_string(), page.to_string()),
            ("count".to_string(), count.to_string()),
            ("order_by".to_string(), order_by.to_string()),
        ];

        if let Some(ref filters) = filters {
            if let Some(level) = filters.variation_unlock_level {
                form_params.push(("variation_unlock_level".to_string(), level.to_string()));
            }
        }

        let resp: reqwest::Response = self
            .client
            .post(&url)
            .form(&form_params)
            .send()
            .await
            .map_err(|e| shared::error::AppError::Network(e.to_string()))?;

        #[derive(Deserialize)]
        struct RecommendResponse {
            status: i32,
            status_code: Option<String>,
            result: Vec<RecommendItem>,
            paging: Paging,
        }

        #[derive(Deserialize)]
        struct Paging {
            is_last_page: bool,
        }

        let body: RecommendResponse = resp
            .json()
            .await
            .map_err(|e| shared::error::AppError::Parse(e.to_string()))?;

        if body.status != 1 {
            if body.status_code.as_deref() == Some("SESSION_TIMEOUT") {
                return Err(shared::error::AppError::Validation("CAPTCHA_AUTH_REQUIRED".into()));
            }
            return Err(shared::error::AppError::Internal(format!(
                "API Error: {}",
                body.status_code.unwrap_or_else(|| "UNKNOWN".into())
            )));
        }

        // Filter items by slot criteria if provided
        let items: Vec<Item> = body
            .result
            .into_iter()
            .filter(|item| {
                if let Some(ref filters) = filters {
                    self.matches_slot_filter(item, filters)
                } else {
                    true
                }
            })
            .map(|item| self.transform_recommend_item(item, search_type, parent_rarity))
            .collect();

        Ok(SubItemsResult {
            items,
            is_last_page: body.paging.is_last_page,
        })
    }

    fn matches_slot_filter(&self, item: &RecommendItem, filters: &ListingFilters) -> bool {
        let slot_index = match filters.slot_index {
            Some(idx) if idx >= 1 && idx <= 4 => idx as usize - 1,
            _ => return true,
        };

        let quality_str = item
            .other_info
            .as_ref()
            .and_then(|o| o.variation_info.as_ref())
            .and_then(|v| v.variation_quality.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("");
        
        let qualities: Vec<Option<i64>> = quality_str
            .split('-')
            .map(|s: &str| s.parse().ok())
            .collect();

        let slot_value = match slot_index {
            0 if qualities.len() > 0 => qualities[0],
            1 if qualities.len() > 1 => qualities[1],
            2 if qualities.len() > 2 => qualities[2],
            3 if qualities.len() > 3 => qualities[3],
            _ => return false,
        };

        let value = match slot_value {
            Some(v) => v,
            None => return false,
        };

        if let Some(target) = filters.target_value {
            if value != target {
                return false;
            }
        }

        if let Some(min) = filters.min_value {
            if value < min {
                return false;
            }
        }

        if let Some(max) = filters.max_value {
            if value > max {
                return false;
            }
        }

        true
    }

    fn transform_recommend_item(
        &self,
        item: RecommendItem,
        search_type: &str,
        parent_rarity: Option<ItemRarity>,
    ) -> Item {
        let _serial_num = item
            .other_info
            .as_ref()
            .and_then(|o| o.basic_attrs.as_ref())
            .and_then(|attrs| attrs.iter().find(|a| a.contains("编号")))
            .and_then(|attr| attr.split(':').nth(1).map(|s| s.trim().to_string()));

        let _variation_info = item
            .other_info
            .as_ref()
            .and_then(|o| o.variation_info.as_ref())
            .and_then(|v| self.parse_variation_info(v));

        // Parse star grid from variation_quality
        let quality_str = item
            .other_info
            .as_ref()
            .and_then(|o| o.variation_info.as_ref())
            .and_then(|v| v.variation_quality.as_ref())
            .map(|s: &String| s.as_str())
            .unwrap_or("");
        
        let slots: [Option<i64>; 4] = {
            let qualities: Vec<Option<i64>> = quality_str
                .split('-')
                .map(|s: &str| s.parse().ok())
                .collect();
            [
                qualities.get(0).copied().flatten(),
                qualities.get(1).copied().flatten(),
                qualities.get(2).copied().flatten(),
                qualities.get(3).copied().flatten(),
            ]
        };

        let _star_grid = StarGrid { slots };

        // Map search_type to ItemCategory
        let category = match search_type {
            "role_skin" | "hero_skin" => ItemCategory::RoleSkin,
            "weapon_skin" => ItemCategory::WeaponSkin,
            _ => ItemCategory::Item,
        };

        // Sub-items inherit parent rarity
        let rarity = parent_rarity.unwrap_or(ItemRarity::Gold);

        let image_url = item
            .other_info
            .as_ref()
            .and_then(|o| o.capture_url.as_ref())
            .and_then(|urls| urls.first().cloned());

        let capture_urls = item
            .other_info
            .as_ref()
            .and_then(|o| o.capture_url.clone())
            .unwrap_or_default();

        Item {
            id: item.equipid.to_string(),
            name: item.format_equip_name.clone().unwrap_or_default(),
            category,
            rarity: Some(rarity),
            current_price: Some(item.price),
            min_price: None,
            image_url,
            capture_urls,
            equip_type_desc: None,
            search_type: Some(search_type.to_string()),
        }
    }

    fn parse_variation_info(&self, info: &VariationInfo) -> Option<VariationInfo> {
        let name_parts: Vec<&str> = info.variation_name.as_ref()?.split('-').collect();
        let quality_parts: Vec<&str> = info.variation_quality.as_ref()?.split('-').collect();

        let attributes: Vec<VariationAttribute> = name_parts
            .iter()
            .zip(quality_parts.iter())
            .filter_map(|(name, quality)| {
                let quality_val = quality.parse::<i64>().ok()?;
                Some(VariationAttribute {
                    name: name.to_string(),
                    quality: quality_val,
                })
            })
            .collect();

        Some(VariationInfo {
            variation_id: info.variation_id.clone(),
            variation_name: info.variation_name.clone(),
            variation_quality: info.variation_quality.clone(),
            variation_unlock: info.variation_unlock.clone(),
            variation_unlock_num: info.variation_unlock_num,
            red_star_num: info.red_star_num,
            attributes,
        })
    }

    fn transform_legacy_item(&self, item: &LegacyItem) -> Item {
        let _slots: [Option<i64>; 4] = {
            let star_grid = item.base_equip_info.as_ref().map(|b| &b.star_grid).unwrap();
            [
                star_grid.get(0).copied(),
                star_grid.get(1).copied(),
                star_grid.get(2).copied(),
                star_grid.get(3).copied(),
            ]
        };

        let rarity = match item.base_equip_info.as_ref().and_then(|b| b.rarity) {
            Some(1) => ItemRarity::Red,
            _ => ItemRarity::Gold,
        };

        let category = match item.kindid {
            3 => ItemCategory::RoleSkin,
            4 => ItemCategory::WeaponSkin,
            _ => ItemCategory::Item,
        };

        Item {
            id: item.equipid.clone(),
            name: item.equip_name.clone(),
            category,
            rarity: Some(rarity),
            current_price: Some(item.unit_price),
            min_price: None,
            image_url: None,
            capture_urls: vec![],
            equip_type_desc: None,
            search_type: None,
        }
    }
}

/// Sub-items listing result.
#[derive(Debug, Clone)]
pub struct SubItemsResult {
    pub items: Vec<Item>,
    pub is_last_page: bool,
}
