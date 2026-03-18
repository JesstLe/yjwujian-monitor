//! Shared domain types (DTOs transferred across the Tauri command boundary).

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Item category matching CBG kindid.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ItemCategory {
    RoleSkin,   // kindid = 3
    WeaponSkin, // kindid = 4
    Item,       // kindid = 5 or 6
}

/// Rarity level.
#[derive(Debug, Clone, Serialize, Deserialize, Copy)]
#[serde(rename_all = "snake_case")]
pub enum Rarity {
    Red = 1,  // 红色
    Gold = 2, // 金色
}

/// Type alias for Rarity (for consistency with TypeScript naming).
pub type ItemRarity = Rarity;

/// Star grid attributes (4 slots for item attributes).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StarGrid {
    pub slots: [Option<i64>; 4],
}

/// Variation attribute (谪星物品变体属性).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariationAttribute {
    pub name: String,
    pub quality: i64,
}

/// Variation info (谪星物品变体信息).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariationInfo {
    #[serde(default)]
    pub variation_id: Option<String>,
    #[serde(default)]
    pub variation_name: Option<String>,
    #[serde(default)]
    pub variation_quality: Option<String>,
    #[serde(default)]
    pub variation_unlock: Option<String>,
    #[serde(default)]
    pub variation_unlock_num: Option<i64>,
    #[serde(default)]
    pub red_star_num: Option<i64>,
    #[serde(default)]
    pub attributes: Vec<VariationAttribute>,
}

/// A single CBG item (search result).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub category: ItemCategory,
    pub rarity: Option<Rarity>,
    pub current_price: Option<i64>, // in cents
    pub min_price: Option<i64>,
    pub image_url: Option<String>,
    pub capture_urls: Vec<String>,
    pub equip_type_desc: Option<String>,
    pub search_type: Option<String>,
}

/// Watchlist entry with price target.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchlistEntry {
    pub id: i64,
    pub item_id: String,
    pub item_name: Option<String>,
    pub target_price: Option<i64>,
    pub alert_enabled: bool,
    pub notes: Option<String>,
    pub group_id: Option<i64>,
    pub created_at: DateTime<Utc>,
}

/// Watchlist group.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchlistGroup {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub alert_enabled: bool,
}

/// Price history point.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceHistoryPoint {
    pub timestamp: DateTime<Utc>,
    pub price: i64,
}

/// Alert record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: i64,
    pub watchlist_id: i64,
    pub message: String,
    pub is_resolved: bool,
    pub created_at: DateTime<Utc>,
}

/// App settings.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub check_interval_minutes: i64,
    pub notification_enabled: bool,
    pub bark_enabled: bool,
    pub bark_device_key: Option<String>,
    pub feishu_webhook: Option<String>,
    pub dingtalk_webhook: Option<String>,
    pub pushplus_token: Option<String>,
    pub webhook_url: Option<String>,
}
