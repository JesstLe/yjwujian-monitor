//! Custom webhook notification service.

use reqwest::Client;
use serde_json::json;
use std::sync::LazyLock;

use crate::NotifyError;
use shared::Settings;

static HTTP: LazyLock<Client> = LazyLock::new(|| Client::new());

pub struct WebhookNotifier {
    url: String,
}

impl WebhookNotifier {
    pub fn new(url: &str) -> Self {
        Self { url: url.to_string() }
    }

    pub async fn send(&self, title: &str, body: &str) -> Result<(), NotifyError> {
        let payload = json!({ "title": title, "body": body });
        HTTP.post(&self.url)
            .json(&payload)
            .send()
            .await?
            .error_for_status()
            .map_err(|e| NotifyError::InvalidResponse(e.to_string()))?;
        Ok(())
    }
}

/// Send a custom webhook notification.
/// 
/// # Arguments
/// * `settings` - Application settings containing webhook configuration
/// * `message` - The message to send
/// 
/// # Returns
/// * `Ok(())` if the notification was sent successfully
/// * `Err(NotifyError)` if the notification failed
pub async fn send_notification(settings: &Settings, message: &str) -> Result<(), NotifyError> {
    let url = settings
        .webhook_url
        .as_ref()
        .ok_or_else(|| NotifyError::MissingConfig("Webhook URL is not configured".to_string()))?;

    let notifier = WebhookNotifier::new(url);
    
    // Split message into title and body (first line as title, rest as body)
    let lines: Vec<&str> = message.lines().collect();
    let title = lines.first().unwrap_or(&"Notification");
    let body = if lines.len() > 1 { &message[title.len()..].trim() } else { "" };
    
    notifier.send(title, body).await
}
