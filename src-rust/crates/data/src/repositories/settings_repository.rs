use rusqlite::{params, OptionalExtension};
use shared::AppError;
use crate::models::Settings;
use crate::db;

/// Create or update a setting
pub fn upsert(key: &str, value: &str) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"INSERT INTO settings (key, value) VALUES (?1, ?2)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value"#,
        params![key, value],
    )?;
    
    Ok(())
}

/// Find a setting by key
pub fn find_by_key(key: &str) -> Result<Option<String>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    
    let value = stmt.query_row([key], |row| row.get(0))
        .optional()
        .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(value)
}

/// Find all settings
pub fn find_all() -> Result<Vec<Settings>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare("SELECT key, value FROM settings ORDER BY key")?;
    
    let settings = stmt.query_map([], |row| {
        Ok(Settings {
            key: row.get(0)?,
            value: row.get(1)?,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(settings)
}

/// Delete a setting by key
pub fn delete(key: &str) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute("DELETE FROM settings WHERE key = ?1", [key])?;
    Ok(())
}
