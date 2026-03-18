use rusqlite::{params, OptionalExtension};
use shared::AppError;
use crate::models::WatchlistEntry;
use crate::db;

/// Create a new watchlist entry
pub fn create(entry: &WatchlistEntry) -> Result<i64, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"INSERT INTO watchlist (item_id, target_price, alert_enabled, created_at)
           VALUES (?1, ?2, ?3, ?4)"#,
        params![
            entry.item_id,
            entry.target_price,
            entry.alert_enabled as i32,
            entry.created_at.to_rfc3339(),
        ],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Find a watchlist entry by ID
pub fn find_by_id(id: i64) -> Result<Option<WatchlistEntry>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, item_id, target_price, alert_enabled, created_at FROM watchlist WHERE id = ?1"
    )?;
    
    let entry = stmt.query_row([id], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(WatchlistEntry {
            id: row.get(0)?,
            item_id: row.get(1)?,
            target_price: row.get(2)?,
            alert_enabled: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    }).optional()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(entry)
}

/// Find all watchlist entries
pub fn find_all() -> Result<Vec<WatchlistEntry>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, item_id, target_price, alert_enabled, created_at FROM watchlist ORDER BY created_at DESC"
    )?;
    
    let entries = stmt.query_map([], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(WatchlistEntry {
            id: row.get(0)?,
            item_id: row.get(1)?,
            target_price: row.get(2)?,
            alert_enabled: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(entries)
}

/// Update a watchlist entry
pub fn update(entry: &WatchlistEntry) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"UPDATE watchlist SET item_id = ?1, target_price = ?2, alert_enabled = ?3 WHERE id = ?4"#,
        params![
            entry.item_id,
            entry.target_price,
            entry.alert_enabled as i32,
            entry.id,
        ],
    )?;
    
    Ok(())
}

/// Delete a watchlist entry by ID
pub fn delete(id: i64) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute("DELETE FROM watchlist WHERE id = ?1", [id])?;
    Ok(())
}
