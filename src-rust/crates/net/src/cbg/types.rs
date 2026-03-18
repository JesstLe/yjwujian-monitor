//! CBG API response types (raw from network).

use serde::Deserialize;
use serde_json::Value;
use shared::{VariationInfo};

// Generic CBG response wrapper
#[derive(Debug, Deserialize)]
pub struct CbgResponse {
    pub status: i32,
    #[serde(rename = "status_code")]
    pub status_code: Option<String>,
    #[serde(default)]
    pub data: Option<Value>,
}

impl CbgResponse {
    pub fn into_data<T: for<'de> Deserialize<'de>>(self) -> Result<Option<T>, serde_json::Error> {
        match self.data {
            Some(v) => serde_json::from_value(v).map(Some),
            None => Ok(None),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AggregateListResponse {
    pub count: i64,
    pub page: i64,
    #[serde(rename = "is_last_page")]
    pub is_last_page: bool,
    #[serde(rename = "equip_type_list")]
    pub equip_type_list: Vec<AggregateItem>,
}

#[derive(Debug, Deserialize)]
pub struct AggregateItem {
    pub equip_type: String,
    pub equip_type_name: String,
    #[serde(rename = "equip_type_desc")]
    pub equip_type_desc: Option<String>,
    #[serde(rename = "search_type")]
    pub search_type: Option<String>,
    #[serde(rename = "min_price")]
    pub min_price: Option<i64>,
    #[serde(rename = "selling_count")]
    pub selling_count: Option<String>,
    #[serde(rename = "equip_type_list_img_url")]
    pub equip_type_list_img_url: Option<String>,
    #[serde(rename = "equip_type_view_url")]
    pub equip_type_view_url: Option<String>,
    #[serde(rename = "equip_type_3d_view_url")]
    pub equip_type_3d_view_url: Option<String>,
    #[serde(rename = "equip_type_capture_url")]
    pub equip_type_capture_url: Option<Vec<String>>,
}

/// Legacy item type from detail API.
#[derive(Debug, Deserialize)]
pub struct LegacyItem {
    pub equipid: String,
    pub equip_name: String,
    pub unit_price: i64,
    pub kindid: i64,
    pub seller_name: Option<String>,
    pub status: i64,
    pub collect_count: Option<i64>,
    #[serde(rename = "base_equip_info")]
    pub base_equip_info: Option<BaseEquipInfo>,
}

#[derive(Debug, Deserialize)]
pub struct BaseEquipInfo {
    pub rarity: Option<i64>,
    #[serde(rename = "star_grid")]
    pub star_grid: Vec<i64>,
    #[serde(rename = "serial_num")]
    pub serial_num: Option<String>,
}

/// Recommend API item type (sub-item listings).
#[derive(Debug, Deserialize)]
pub struct RecommendItem {
    pub serverid: Option<i64>,
    pub equipid: i64,
    pub eid: Option<String>,
    #[serde(rename = "game_ordersn")]
    pub game_ordersn: Option<String>,
    pub price: i64,
    #[serde(rename = "collect_num")]
    pub collect_num: Option<i64>,
    pub server_name: Option<String>,
    pub kindid: Option<i64>,
    pub status: i64,
    #[serde(rename = "selling_time")]
    pub selling_time: Option<String>,
    pub equip_type: Option<String>,
    #[serde(rename = "format_equip_name")]
    pub format_equip_name: Option<String>,
    #[serde(rename = "other_info")]
    pub other_info: Option<SubItemOtherInfo>,
}

#[derive(Debug, Deserialize)]
pub struct SubItemOtherInfo {
    #[serde(rename = "basic_attrs")]
    pub basic_attrs: Option<Vec<String>>,
    #[serde(rename = "capture_url")]
    pub capture_url: Option<Vec<String>>,
    #[serde(rename = "variation_info")]
    pub variation_info: Option<VariationInfo>,
}
