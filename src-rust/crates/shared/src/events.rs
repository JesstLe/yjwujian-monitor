//! Tauri event payload types (push from Rust → UI).

use serde::{Deserialize, Serialize};
use crate::types::Alert;

/// Monitor check completed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorCheckEvent {
    pub checked_count: i64,
    pub triggered_alerts: i64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Alert triggered.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertTriggeredEvent {
    pub alert: Alert,
}
