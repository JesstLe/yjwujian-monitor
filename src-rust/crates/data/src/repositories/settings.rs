use shared::{AppError, Settings};
use crate::db;

const DEFAULT_INTERVAL: i64 = 5;

pub fn get_settings() -> Result<Settings, AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows: Vec<(String, String)> = stmt.query_map([], |row: &rusqlite::Row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?.collect::<Result<Vec<(String, String)>, _>>()
        .map_err(|e: rusqlite::Error| AppError::Database(e.to_string()))?;

    let mut settings = Settings {
        check_interval_minutes: DEFAULT_INTERVAL,
        ..Default::default()
    };

    for (key, value) in rows {
        match key.as_str() {
            "check_interval_minutes" => settings.check_interval_minutes = value.parse().unwrap_or(DEFAULT_INTERVAL),
            "notification_enabled" => settings.notification_enabled = value == "true",
            "bark_enabled" => settings.bark_enabled = value == "true",
            "bark_device_key" => settings.bark_device_key = Some(value),
            "feishu_webhook" => settings.feishu_webhook = Some(value),
            "dingtalk_webhook" => settings.dingtalk_webhook = Some(value),
            "pushplus_token" => settings.pushplus_token = Some(value),
            "webhook_url" => settings.webhook_url = Some(value),
            _ => {}
        }
    }

    Ok(settings)
}

pub fn save_settings(settings: &Settings) -> Result<(), AppError> {
    let conn = db().lock().map_err(|e: std::sync::PoisonError<_>| AppError::Database(e.to_string()))?;
    let upsert = |key: &str, value: &str| -> Result<(), AppError> {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [key, value],
        )?;
        Ok(())
    };
    upsert("check_interval_minutes", &settings.check_interval_minutes.to_string())?;
    upsert("notification_enabled", &settings.notification_enabled.to_string())?;
    upsert("bark_enabled", &settings.bark_enabled.to_string())?;
    if let Some(ref v) = settings.bark_device_key { upsert("bark_device_key", v)?; }
    if let Some(ref v) = settings.feishu_webhook { upsert("feishu_webhook", v)?; }
    if let Some(ref v) = settings.dingtalk_webhook { upsert("dingtalk_webhook", v)?; }
    if let Some(ref v) = settings.pushplus_token { upsert("pushplus_token", v)?; }
    if let Some(ref v) = settings.webhook_url { upsert("webhook_url", v)?; }
    Ok(())
}
