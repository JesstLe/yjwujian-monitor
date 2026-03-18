//! Bark notification service.

use reqwest::Client;
use std::sync::LazyLock;

use crate::NotifyError;
use shared::Settings;

static HTTP: LazyLock<Client> = LazyLock::new(|| Client::new());

pub struct BarkNotifier {
    device_key: String,
}

impl BarkNotifier {
    pub fn new(device_key: &str) -> Self {
        Self { device_key: device_key.to_string() }
    }

    pub async fn send(&self, title: &str, body: &str) -> Result<(), NotifyError> {
        let url = format!("https://api.day.app/{}/", self.device_key);
        HTTP.post(&url)
            .query(&[("title", title), ("body", body)])
            .send()
            .await?
            .error_for_status()
            .map_err(|e| NotifyError::InvalidResponse(e.to_string()))?;
        Ok(())
    }
}

/// Send a Bark notification.
/// 
/// # Arguments
/// * `settings` - Application settings containing Bark configuration
/// * `message` - The message to send
/// 
/// # Returns
/// * `Ok(())` if the notification was sent successfully
/// * `Err(NotifyError)` if the notification failed
pub async fn send_notification(settings: &Settings, message: &str) -> Result<(), NotifyError> {
    if !settings.bark_enabled {
        return Err(NotifyError::MissingConfig("Bark is not enabled".to_string()));
    }

    let device_key = settings
        .bark_device_key
        .as_ref()
        .ok_or_else(|| NotifyError::MissingConfig("Bark device key is not configured".to_string()))?;

    let notifier = BarkNotifier::new(device_key);
    
    // Split message into title and body (first line as title, rest as body)
    let lines: Vec<&str> = message.lines().collect();
    let title = lines.first().unwrap_or(&"Notification");
    let body = if lines.len() > 1 { &message[title.len()..].trim() } else { "" };
    
    notifier.send(title, body).await
}
