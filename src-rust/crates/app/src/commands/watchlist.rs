use std::option::Option;
use shared::{AppError, WatchlistEntry};
use core::WatchlistService;

#[tauri::command]
pub fn get_watchlist() -> Result<Vec<WatchlistEntry>, AppError> {
    WatchlistService::new().list_entries()
}

#[tauri::command]
pub fn add_to_watchlist(item_id: String, item_name: Option<String>, target_price: Option<i64>, group_id: Option<i64>) -> Result<i64, AppError> {
    WatchlistService::new().add_item(item_id, item_name, target_price, group_id)
}

#[tauri::command]
pub fn remove_from_watchlist(id: i64) -> Result<(), AppError> {
    WatchlistService::new().remove_entry(id)
}

#[tauri::command]
pub fn update_target_price(id: i64, target_price: Option<i64>) -> Result<(), AppError> {
    WatchlistService::new().update_price(id, target_price)
}
