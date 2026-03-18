use rusqlite::{params, OptionalExtension};
use shared::AppError;
use crate::models::Item;
use crate::db;

/// Upsert an item into the database
pub fn upsert(item: &Item) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"INSERT OR REPLACE INTO items (id, name, image_url, current_price, category, rarity, last_updated)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))"#,
        params![
            item.id,
            item.name,
            item.image_url,
            item.current_price,
            item.category,
            item.rarity,
        ],
    )?;
    Ok(())
}

/// Find an item by ID
pub fn find_by_id(id: &str) -> Result<Option<Item>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, image_url, current_price, category, rarity, last_updated FROM items WHERE id = ?1"
    )?;
    
    let item = stmt.query_row([id], |row| {
        let last_updated_str: String = row.get(6)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&last_updated_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
            image_url: row.get(2)?,
            current_price: row.get(3)?,
            category: row.get(4)?,
            rarity: row.get(5)?,
            created_at,
        })
    }).optional()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(item)
}

/// Find all items
pub fn find_all() -> Result<Vec<Item>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, image_url, current_price, category, rarity, last_updated FROM items ORDER BY name"
    )?;
    
    let items = stmt.query_map([], |row| {
        let last_updated_str: String = row.get(6)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&last_updated_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
            image_url: row.get(2)?,
            current_price: row.get(3)?,
            category: row.get(4)?,
            rarity: row.get(5)?,
            created_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(items)
}

/// Delete an item by ID
pub fn delete(id: &str) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute("DELETE FROM items WHERE id = ?1", [id])?;
    Ok(())
}
