use shared::{AppError, Settings};
use data::repositories::settings as settings_repo;

pub struct SettingsService;

impl SettingsService {
    pub fn new() -> Self {
        Self
    }

    pub fn get(&self) -> Result<Settings, AppError> {
        settings_repo::get_settings()
    }

    pub fn save(&self, settings: &Settings) -> Result<(), AppError> {
        settings_repo::save_settings(settings)
    }
}

impl Default for SettingsService {
    fn default() -> Self {
        Self::new()
    }
}
