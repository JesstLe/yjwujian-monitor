use std::option::Option;
use shared::{AppError, Item, SearchParams, ListResponse, ItemCategory};
use core::SearchService;

#[tauri::command]
pub async fn search_items(
    q: Option<String>,
    category: Option<String>,
    page: Option<i64>,
    limit: Option<i64>,
) -> Result<ListResponse<Item>, AppError> {
    let cat = match category.as_deref() {
        Some("role_skin") => Some(ItemCategory::RoleSkin),
        Some("weapon_skin") => Some(ItemCategory::WeaponSkin),
        Some("item") => Some(ItemCategory::Item),
        _ => None,
    };
    let params = SearchParams { q, category: cat, rarity: None, min_price: None, max_price: None, page, limit };
    let service = SearchService::new();
    service.search(params).await
}
