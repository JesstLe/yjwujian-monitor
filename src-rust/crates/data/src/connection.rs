use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;
use shared::AppError;

static DB: std::sync::OnceLock<Mutex<Connection>> = std::sync::OnceLock::new();

pub fn init_database(db_path: PathBuf) -> Result<(), AppError> {
    let conn = Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    crate::migrations::run_migrations(&conn)?;
    DB.set(Mutex::new(conn))
        .map_err(|_| AppError::Internal("Database already initialized".into()))?;
    Ok(())
}

pub fn db() -> &'static Mutex<Connection> {
    DB.get().expect("Database not initialized. Call init_database() first.")
}

pub fn default_db_path() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| dirs::data_dir().unwrap_or_else(|| PathBuf::from(".")));
    base.join("yjwujian-monitor").join("monitor.db")
}
