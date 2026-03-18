use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared::{Item, WatchlistEntry, Settings, SearchParams, ItemCategory, ListResponse};

/// Error type for API calls
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub message: String,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ApiError {}

impl From<JsValue> for ApiError {
    fn from(value: JsValue) -> Self {
        ApiError {
            message: format!("{:?}", value),
        }
    }
}

/// Typed wrapper for Tauri invoke
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "__TAURI__", "core"], js_name = invoke)]
    async fn invoke_inner(cmd: &str, args: JsValue) -> JsValue;
}

/// Generic invoke function with type-safe serialization/deserialization
pub async fn invoke<T>(cmd: &str, args: impl serde::Serialize) -> Result<T, ApiError>
where
    T: serde::de::DeserializeOwned,
{
    let args = serde_wasm_bindgen::to_value(&args).map_err(|e| ApiError {
        message: format!("Failed to serialize arguments: {}", e),
    })?;
    let result = invoke_inner(cmd, args).await;
    serde_wasm_bindgen::from_value(result).map_err(|e| ApiError {
        message: format!("Failed to deserialize response: {}", e),
    })
}

// ============== Search Commands ==============

/// Search for items on CBG
pub async fn search_items(params: SearchParams) -> Result<ListResponse<Item>, ApiError> {
    invoke("search_items", params).await
}

// ============== Watchlist Commands ==============

/// Get all watchlist entries
pub async fn get_watchlist() -> Result<Vec<WatchlistEntry>, ApiError> {
    invoke("get_watchlist", ()).await
}

/// Add an item to the watchlist
pub async fn add_to_watchlist(
    item_id: String,
    item_name: Option<String>,
    target_price: Option<i64>,
    group_id: Option<i64>,
) -> Result<i64, ApiError> {
    invoke("add_to_watchlist", (item_id, item_name, target_price, group_id)).await
}

/// Remove an item from the watchlist
pub async fn remove_from_watchlist(id: i64) -> Result<(), ApiError> {
    invoke("remove_from_watchlist", id).await
}

/// Update target price for a watchlist entry
pub async fn update_target_price(id: i64, target_price: Option<i64>) -> Result<(), ApiError> {
    invoke("update_target_price", (id, target_price)).await
}

// ============== Settings Commands ==============

/// Get app settings
pub async fn get_settings() -> Result<Settings, ApiError> {
    invoke("get_settings", ()).await
}

/// Save app settings
pub async fn save_settings(settings: Settings) -> Result<(), ApiError> {
    invoke("save_settings", settings).await
}

// ============== Monitor Commands ==============

/// Start the price monitor
pub async fn start_monitor() -> Result<(), ApiError> {
    invoke("start_monitor", ()).await
}

/// Stop the price monitor
pub async fn stop_monitor() -> Result<(), ApiError> {
    invoke("stop_monitor", ()).await
}

/// Get monitor status
pub async fn get_monitor_status() -> Result<serde_json::Value, ApiError> {
    invoke("get_status", ()).await
}

/// Trigger an immediate check
pub async fn check_now() -> Result<serde_json::Value, ApiError> {
    invoke("check_now", ()).await
}
