//! PushPlus notification service.

use reqwest::Client;
use std::sync::LazyLock;

use crate::NotifyError;
use shared::Settings;

static HTTP: LazyLock<Client> = LazyLock::new(|| Client::new());

pub struct PushplusNotifier {
    token: String,
}

impl PushplusNotifier {
    pub fn new(token: &str) -> Self {
        Self { token: token.to_string() }
    }

    pub async fn send(&self, title: &str, body: &str) -> Result<(), NotifyError> {
        let url = "https://www.pushplus.plus/send";
        HTTP.post(url)
            .query(&[("token", self.token.as_str()), ("title", &title.to_string()), ("content", &body.to_string())])
            .send()
            .await?
            .error_for_status()
            .map_err(|e| NotifyError::InvalidResponse(e.to_string()))?;
        Ok(())
    }
}

/// Send a PushPlus notification.
/// 
/// # Arguments
/// * `settings` - Application settings containing PushPlus configuration
/// * `message` - The message to send
/// 
/// # Returns
/// * `Ok(())` if the notification was sent successfully
/// * `Err(NotifyError)` if the notification failed
pub async fn send_notification(settings: &Settings, message: &str) -> Result<(), NotifyError> {
    let token = settings
        .pushplus_token
        .as_ref()
        .ok_or_else(|| NotifyError::MissingConfig("PushPlus token is not configured".to_string()))?;

    let notifier = PushplusNotifier::new(token);
    
    // Split message into title and body (first line as title, rest as body)
    let lines: Vec<&str> = message.lines().collect();
    let title = lines.first().unwrap_or(&"Notification");
    let body = if lines.len() > 1 { &message[title.len()..].trim() } else { "" };
    
    notifier.send(title, body).await
}
