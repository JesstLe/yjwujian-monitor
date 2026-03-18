use shared::{AppError, Item, WatchlistEntry, WatchlistGroup};
use data::repositories::watchlist as wl_repo;
use data::repositories::item as item_repo;

pub struct WatchlistService;

impl WatchlistService {
    pub fn new() -> Self {
        Self
    }

    pub fn add_item(&self, item_id: String, item_name: Option<String>, target_price: Option<i64>, group_id: Option<i64>) -> Result<i64, AppError> {
        let entry = WatchlistEntry {
            id: 0,
            item_id,
            item_name,
            target_price,
            alert_enabled: true,
            notes: None,
            group_id,
            created_at: chrono::Utc::now(),
        };
        wl_repo::add_entry(&entry)
    }

    pub fn list_entries(&self) -> Result<Vec<WatchlistEntry>, AppError> {
        wl_repo::get_all_entries()
    }

    pub fn update_price(&self, id: i64, target_price: Option<i64>) -> Result<(), AppError> {
        wl_repo::update_target_price(id, target_price)
    }

    pub fn remove_entry(&self, id: i64) -> Result<(), AppError> {
        wl_repo::delete_entry(id)
    }

    pub fn list_groups(&self) -> Result<Vec<WatchlistGroup>, AppError> {
        wl_repo::get_all_groups()
    }

    pub fn get_item(&self, id: &str) -> Result<Option<Item>, AppError> {
        item_repo::find_by_id(id)
    }
}

impl Default for WatchlistService {
    fn default() -> Self {
        Self::new()
    }
}
