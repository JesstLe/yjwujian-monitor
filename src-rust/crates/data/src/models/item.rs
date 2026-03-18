use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Database model for items table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub image_url: Option<String>,
    pub current_price: i64,
    pub category: String,
    pub rarity: String,
    pub created_at: DateTime<Utc>,
}
