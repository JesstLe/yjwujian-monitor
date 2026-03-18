use serde::{Deserialize, Serialize};

/// Database model for settings table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub key: String,
    pub value: String,
}
