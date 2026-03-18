//! Tauri command parameter types.

use serde::{Deserialize, Serialize};
use crate::types::{ItemCategory, Rarity};

/// Parameters for item search.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchParams {
    pub q: Option<String>,
    pub category: Option<ItemCategory>,
    pub rarity: Option<Rarity>,
    pub min_price: Option<i64>,
    pub max_price: Option<i64>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

/// Response envelope for list endpoints.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
