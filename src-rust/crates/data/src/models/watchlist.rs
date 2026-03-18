use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Database model for watchlist table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchlistEntry {
    pub id: i64,
    pub item_id: String,
    pub target_price: Option<i64>,
    pub alert_enabled: bool,
    pub created_at: DateTime<Utc>,
}
