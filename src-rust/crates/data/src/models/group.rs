use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Database model for groups table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub alert_enabled: bool,
    pub created_at: DateTime<Utc>,
}
