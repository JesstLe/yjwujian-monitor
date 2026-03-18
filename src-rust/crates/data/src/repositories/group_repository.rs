use rusqlite::{params, OptionalExtension};
use shared::AppError;
use crate::models::Group;
use crate::db;

/// Create a new group
pub fn create(group: &Group) -> Result<i64, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"INSERT INTO groups (name, color, alert_enabled, created_at)
           VALUES (?1, ?2, ?3, ?4)"#,
        params![
            group.name,
            group.color,
            group.alert_enabled as i32,
            group.created_at.to_rfc3339(),
        ],
    )?;
    
    Ok(conn.last_insert_rowid())
}

/// Find a group by ID
pub fn find_by_id(id: i64) -> Result<Option<Group>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, color, alert_enabled, created_at FROM groups WHERE id = ?1"
    )?;
    
    let group = stmt.query_row([id], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Group {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            alert_enabled: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    }).optional()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(group)
}

/// Find all groups
pub fn find_all() -> Result<Vec<Group>, AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, color, alert_enabled, created_at FROM groups ORDER BY name"
    )?;
    
    let groups = stmt.query_map([], |row| {
        let created_at_str: String = row.get(4)?;
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        Ok(Group {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            alert_enabled: row.get::<_, i32>(3)? == 1,
            created_at,
        })
    })
    .map_err(|e| AppError::Database(e.to_string()))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    Ok(groups)
}

/// Update a group
pub fn update(group: &Group) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute(
        r#"UPDATE groups SET name = ?1, color = ?2, alert_enabled = ?3 WHERE id = ?4"#,
        params![
            group.name,
            group.color,
            group.alert_enabled as i32,
            group.id,
        ],
    )?;
    
    Ok(())
}

/// Delete a group by ID
pub fn delete(id: i64) -> Result<(), AppError> {
    let conn = db().lock()
        .map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    
    conn.execute("DELETE FROM groups WHERE id = ?1", [id])?;
    Ok(())
}
