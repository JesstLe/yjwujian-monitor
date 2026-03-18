use shared::{AppError, Settings};
use core::SettingsService;

#[tauri::command]
pub fn get_settings() -> Result<Settings, AppError> {
    SettingsService::new().get()
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), AppError> {
    SettingsService::new().save(&settings)
}
