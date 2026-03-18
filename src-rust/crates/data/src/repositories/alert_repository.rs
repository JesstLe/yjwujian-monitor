use rusqlite::{params, OptionalExtension};
use shared::AppError;
use crate::models::Alert;
use crate::db;

/// Create a new alert
pub fn create(alert: &Alert) -> Result<i64, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"INSERT INTO alerts (watchlist_id, message, is_resolved, created_at)
           VALUES (?1, ?2, ?3, ?4)"#,
        params![
            alert.watchlist_id,
            alert.message,
            alert.is_resolved as i32,
            alert.created_at.to_rfc3339(),
        ],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Find an alert by ID
pub fn find_by_id(id: i64) -> Result<Option<Alert>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, watchlist_id, message, is_resolved, created_at FROM alerts WHERE id = ?1"
    )?;
    
    let alert = stmt.query_row([id], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Alert {
            id: row.get(0)?,
            watchlist_id: row.get(1)?,
            message: row.get(2)?,
            is_resolved: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    }).optional()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(alert)
}

/// Find all alerts
pub fn find_all() -> Result<Vec<Alert>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, watchlist_id, message, is_resolved, created_at FROM alerts ORDER BY created_at DESC"
    )?;
    
    let alerts = stmt.query_map([], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Alert {
            id: row.get(0)?,
            watchlist_id: row.get(1)?,
            message: row.get(2)?,
            is_resolved: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(alerts)
}

/// Find unresolved alerts
pub fn find_unresolved() -> Result<Vec<Alert>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, watchlist_id, message, is_resolved, created_at FROM alerts WHERE is_resolved = 0 ORDER BY created_at DESC"
    )?;
    
    let alerts = stmt.query_map([], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Alert {
            id: row.get(0)?,
            watchlist_id: row.get(1)?,
            message: row.get(2)?,
            is_resolved: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(alerts)
}

/// Update an alert
pub fn update(alert: &Alert) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"UPDATE alerts SET message = ?1, is_resolved = ?2 WHERE id = ?3"#,
        params![
            alert.message,
            alert.is_resolved as i32,
            alert.id,
        ],
    )?;
    
    Ok(())
}

/// Delete an alert by ID
pub fn delete(id: i64) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute("DELETE FROM alerts WHERE id = ?1", [id])?;
    Ok(())
}
