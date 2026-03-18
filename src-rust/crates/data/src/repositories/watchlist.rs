use rusqlite::params;
use shared::{AppError, WatchlistEntry, WatchlistGroup};
use crate::db;

pub fn add_entry(entry: &WatchlistEntry) -> Result<i64, AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    conn.execute(
        "INSERT INTO watchlist (user_id, item_id, item_name, target_price, alert_enabled, notes, group_id) VALUES ('dev-user', ?1, ?2, ?3, ?4, ?5, ?6)",
        params![entry.item_id, entry.item_name, entry.target_price, entry.alert_enabled, entry.notes, entry.group_id],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_all_entries() -> Result<Vec<WatchlistEntry>, AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    let mut stmt = conn.prepare("SELECT id, item_id, item_name, target_price, alert_enabled, notes, group_id, created_at FROM watchlist WHERE user_id = 'dev-user' ORDER BY created_at DESC")?;
    let entries = stmt.query_map([], |row: &rusqlite::Row| {
        Ok(WatchlistEntry {
            id: row.get(0)?,
            item_id: row.get(1)?,
            item_name: row.get(2)?,
            target_price: row.get(3)?,
            alert_enabled: row.get::<_, i64>(4)? != 0,
            notes: row.get(5)?,
            group_id: row.get(6)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?).unwrap_or_default().with_timezone(&chrono::Utc),
        })
    })?.collect::<Result<Vec<_>, _>>()
        .map_err(|e: rusqlite::Error| AppError::Database(e.to_string()))?;
    Ok(entries)
}

pub fn update_target_price(id: i64, target_price: Option<i64>) -> Result<(), AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    conn.execute("UPDATE watchlist SET target_price = ?1 WHERE id = ?2", params![target_price, id])?;
    Ok(())
}

pub fn delete_entry(id: i64) -> Result<(), AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    conn.execute("DELETE FROM watchlist WHERE id = ?1", [id])?;
    Ok(())
}

pub fn get_all_groups() -> Result<Vec<WatchlistGroup>, AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    let mut stmt = conn.prepare("SELECT id, name, color, alert_enabled FROM groups WHERE user_id = 'dev-user' ORDER BY name")?;
    let groups = stmt.query_map([], |row: &rusqlite::Row| {
        Ok(WatchlistGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            alert_enabled: row.get::<_, i64>(3)? != 0,
        })
    })?.collect::<Result<Vec<_>, _>>()
        .map_err(|e: rusqlite::Error| AppError::Database(e.to_string()))?;
    Ok(groups)
}
