//! Feishu webhook notification service.

use reqwest::Client;
use serde_json::json;
use std::sync::LazyLock;

use crate::NotifyError;
use shared::Settings;

static HTTP: LazyLock<Client> = LazyLock::new(|| Client::new());

pub struct FeishuNotifier {
    webhook: String,
}

impl FeishuNotifier {
    pub fn new(webhook: &str) -> Self {
        Self { webhook: webhook.to_string() }
    }

    pub async fn send(&self, title: &str, body: &str) -> Result<(), NotifyError> {
        #[derive(serde::Serialize)]
        struct Msg { msg_type: String, content: serde_json::Value }
        let payload = Msg {
            msg_type: "text".to_string(),
            content: json!({ "text": format!("{}\n{}", title, body) }),
        };
        HTTP.post(&self.webhook)
            .json(&payload)
            .send()
            .await?
            .error_for_status()
            .map_err(|e| NotifyError::InvalidResponse(e.to_string()))?;
        Ok(())
    }
}

/// Send a Feishu webhook notification.
/// 
/// # Arguments
/// * `settings` - Application settings containing Feishu configuration
/// * `message` - The message to send
/// 
/// # Returns
/// * `Ok(())` if the notification was sent successfully
/// * `Err(NotifyError)` if the notification failed
pub async fn send_notification(settings: &Settings, message: &str) -> Result<(), NotifyError> {
    let webhook = settings
        .feishu_webhook
        .as_ref()
        .ok_or_else(|| NotifyError::MissingConfig("Feishu webhook is not configured".to_string()))?;

    let notifier = FeishuNotifier::new(webhook);
    
    // Split message into title and body (first line as title, rest as body)
    let lines: Vec<&str> = message.lines().collect();
    let title = lines.first().unwrap_or(&"Notification");
    let body = if lines.len() > 1 { &message[title.len()..].trim() } else { "" };
    
    notifier.send(title, body).await
}
