use rusqlite::{params, OptionalExtension};
use shared::{AppError, Item, ItemCategory, Rarity};
use crate::db;

pub fn upsert(item: &Item) -> Result<(), AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    conn.execute(
        r#"INSERT INTO items (id, name, category, rarity, current_price, min_price, image_url, capture_urls, equip_type_desc, search_type)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
           ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, category=excluded.category, rarity=excluded.rarity,
               current_price=excluded.current_price, min_price=excluded.min_price,
               image_url=excluded.image_url, capture_urls=excluded.capture_urls,
               equip_type_desc=excluded.equip_type_desc, search_type=excluded.search_type,
               last_updated=datetime('now')"#,
        params![
            item.id,
            item.name,
            serde_json::to_string(&item.category).ok(),
            item.rarity.as_ref().and_then(|r| serde_json::to_string(r).ok()),
            item.current_price,
            item.min_price,
            item.image_url,
            serde_json::to_string(&item.capture_urls).ok(),
            item.equip_type_desc,
            item.search_type,
        ],
    )?;
    Ok(())
}

pub fn find_by_id(id: &str) -> Result<Option<Item>, AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    let mut stmt = conn.prepare("SELECT * FROM items WHERE id = ?1")?;
    let item = stmt.query_row([id], |row: &rusqlite::Row| {
        let category_str: String = row.get(2)?;
        let category: ItemCategory = serde_json::from_str(&category_str).unwrap_or(ItemCategory::Item);
        let rarity_str: Option<String> = row.get(3)?;
        let rarity: Option<Rarity> = rarity_str.and_then(|s| serde_json::from_str(&s).ok());
        let capture_urls_str: Option<String> = row.get(8)?;
        let capture_urls: Vec<String> = capture_urls_str.and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default();
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
            category,
            rarity,
            current_price: row.get(4)?,
            min_price: row.get(5)?,
            image_url: row.get(6)?,
            capture_urls,
            equip_type_desc: row.get(9)?,
            search_type: row.get(10)?,
        })
    }).optional()
    .map_err(|e: rusqlite::Error| AppError::Database(e.to_string()))?;
    Ok(item)
}
