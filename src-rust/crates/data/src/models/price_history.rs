use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Database model for price_history table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceHistory {
    pub id: i64,
    pub item_id: String,
    pub price: i64,
    pub recorded_at: DateTime<Utc>,
}
