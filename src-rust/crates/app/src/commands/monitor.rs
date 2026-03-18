use std::option::Option;
use std::sync::OnceLock;
use shared::AppError;
use core::MonitorService;
use tokio::sync::Mutex;

static MONITOR: OnceLock<Mutex<Option<MonitorService>>> = OnceLock::new();

fn get_monitor() -> &'static Mutex<Option<MonitorService>> {
    MONITOR.get_or_init(|| Mutex::new(None))
}

#[tauri::command]
pub async fn start_monitor() -> Result<(), AppError> {
    let m = MonitorService::new();
    m.start().await;
    let mut guard = get_monitor().try_lock().unwrap();
    *guard = Some(m);
    Ok(())
}

#[tauri::command]
pub async fn stop_monitor() -> Result<(), AppError> {
    let guard = get_monitor().try_lock().unwrap();
    if let Some(ref m) = *guard {
        m.stop().await;
    }
    Ok(())
}

#[tauri::command]
pub fn get_status() -> Result<serde_json::Value, AppError> {
    let guard = get_monitor().blocking_lock();
    let running = guard.as_ref().map(|m| m.is_running()).unwrap_or(false);
    Ok(serde_json::json!({ "running": running, "interval_minutes": 5 }))
}

#[tauri::command]
pub async fn check_now() -> Result<serde_json::Value, AppError> {
    Ok(serde_json::json!({ "checked_count": 0, "message": "Check triggered" }))
}
