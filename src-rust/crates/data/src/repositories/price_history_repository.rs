use rusqlite::{params, OptionalExtension};
use shared::AppError;
use crate::models::PriceHistory;
use crate::db;

/// Create a new price history entry
pub fn create(history: &PriceHistory) -> Result<i64, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"INSERT INTO price_history (item_id, price, recorded_at)
           VALUES (?1, ?2, ?3)"#,
        params![
            history.item_id,
            history.price,
            history.recorded_at.to_rfc3339(),
        ],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Find a price history entry by ID
pub fn find_by_id(id: i64) -> Result<Option<PriceHistory>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, item_id, price, recorded_at FROM price_history WHERE id = ?1"
    )?;
    
    let history = stmt.query_row([id], |row| {
        let recorded_at_str: String = row.get(3)?;
        let recorded_at = chrono::DateTime::parse_from_rfc3339(&recorded_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(PriceHistory {
            id: row.get(0)?,
            item_id: row.get(1)?,
            price: row.get(2)?,
            recorded_at,
        })
    }).optional()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(history)
}

/// Find all price history entries
pub fn find_all() -> Result<Vec<PriceHistory>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, item_id, price, recorded_at FROM price_history ORDER BY recorded_at DESC"
    )?;
    
    let history = stmt.query_map([], |row| {
        let recorded_at_str: String = row.get(3)?;
        let recorded_at = chrono::DateTime::parse_from_rfc3339(&recorded_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(PriceHistory {
            id: row.get(0)?,
            item_id: row.get(1)?,
            price: row.get(2)?,
            recorded_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(history)
}

/// Find price history for a specific item
pub fn find_by_item_id(item_id: &str) -> Result<Vec<PriceHistory>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, item_id, price, recorded_at FROM price_history WHERE item_id = ?1 ORDER BY recorded_at DESC"
    )?;
    
    let history = stmt.query_map([item_id], |row| {
        let recorded_at_str: String = row.get(3)?;
        let recorded_at = chrono::DateTime::parse_from_rfc3339(&recorded_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(PriceHistory {
            id: row.get(0)?,
            item_id: row.get(1)?,
            price: row.get(2)?,
            recorded_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(history)
}

/// Delete a price history entry by ID
pub fn delete(id: i64) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute("DELETE FROM price_history WHERE id = ?1", [id])?;
    Ok(())
}
