//! Notification adapters: Bark, Feishu, DingTalk, PushPlus, Webhook.

pub mod bark;
pub mod feishu;
pub mod dingtalk;
pub mod pushplus;
pub mod webhook;

pub use bark::BarkNotifier;
pub use feishu::FeishuNotifier;
pub use dingtalk::DingtalkNotifier;
pub use pushplus::PushplusNotifier;
pub use webhook::WebhookNotifier;

pub use bark::send_notification as send_bark_notification;
pub use feishu::send_notification as send_feishu_notification;
pub use dingtalk::send_notification as send_dingtalk_notification;
pub use pushplus::send_notification as send_pushplus_notification;
pub use webhook::send_notification as send_webhook_notification;

use shared::Settings;
use std::fmt;

/// Error type for notification operations.
#[derive(Debug)]
pub enum NotifyError {
    /// Missing configuration (e.g., API key, webhook URL)
    MissingConfig(String),
    /// Network or HTTP error
    Network(String),
    /// Invalid response from notification service
    InvalidResponse(String),
    /// Other errors
    Other(String),
}

impl fmt::Display for NotifyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NotifyError::MissingConfig(msg) => write!(f, "Missing configuration: {}", msg),
            NotifyError::Network(msg) => write!(f, "Network error: {}", msg),
            NotifyError::InvalidResponse(msg) => write!(f, "Invalid response: {}", msg),
            NotifyError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}

impl std::error::Error for NotifyError {}

impl From<reqwest::Error> for NotifyError {
    fn from(e: reqwest::Error) -> Self {
        NotifyError::Network(e.to_string())
    }
}

pub trait NotificationChannel: Send + Sync {
    fn name(&self) -> &'static str;
    fn send(&self, title: &str, body: &str) -> impl std::future::Future<Output = Result<(), NotifyError>> + Send;
}

/// Send a notification through all enabled channels.
/// This function does not fail if individual channels fail; it returns the first error encountered.
pub async fn send_notification_all(settings: &Settings, title: &str, body: &str) -> Result<(), NotifyError> {
    let mut first_error = None;

    if settings.bark_enabled {
        if let Some(ref _key) = settings.bark_device_key {
            if let Err(e) = bark::send_notification(settings, &format!("{}: {}", title, body)).await {
                first_error = Some(e);
            }
        }
    }

    if let Some(ref _webhook) = settings.feishu_webhook {
        if let Err(e) = feishu::send_notification(settings, &format!("{}: {}", title, body)).await {
            if first_error.is_none() {
                first_error = Some(e);
            }
        }
    }

    if let Some(ref _webhook) = settings.dingtalk_webhook {
        if let Err(e) = dingtalk::send_notification(settings, &format!("{}: {}", title, body)).await {
            if first_error.is_none() {
                first_error = Some(e);
            }
        }
    }

    if let Some(ref _token) = settings.pushplus_token {
        if let Err(e) = pushplus::send_notification(settings, &format!("{}: {}", title, body)).await {
            if first_error.is_none() {
                first_error = Some(e);
            }
        }
    }

    if let Some(ref _url) = settings.webhook_url {
        if let Err(e) = webhook::send_notification(settings, &format!("{}: {}", title, body)).await {
            if first_error.is_none() {
                first_error = Some(e);
            }
        }
    }

    first_error.map_or(Ok(()), Err)
}
