use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Database model for alerts table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: i64,
    pub watchlist_id: i64,
    pub message: String,
    pub is_resolved: bool,
    pub created_at: DateTime<Utc>,
}
