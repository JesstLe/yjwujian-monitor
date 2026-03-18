use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use data::repositories::watchlist as wl_repo;
use data::repositories::item as item_repo;
use tracing::{info, warn};

pub struct MonitorService {
    running: Arc<RwLock<bool>>,
    interval_minutes: Arc<RwLock<i64>>,
    handle: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
}

impl MonitorService {
    pub fn new() -> Self {
        Self {
            running: Arc::new(RwLock::new(false)),
            interval_minutes: Arc::new(RwLock::new(5)),
            handle: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn start(&self) {
        {
            let mut r = self.running.write().await;
            if *r { return; }
            *r = true;
        }

        let running = self.running.clone();
        let interval_minutes = self.interval_minutes.clone();
        let handle = tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(60));
            loop {
                ticker.tick().await;
                if !*running.read().await { break; }
                let mins = *interval_minutes.read().await;
                if mins > 0 {
                    Self::check_prices().await;
                }
            }
        });

        *self.handle.write().await = Some(handle);
        info!("Monitor service started");
    }

    pub async fn stop(&self) {
        *self.running.write().await = false;
        if let Some(h) = self.handle.write().await.take() {
            h.abort();
        }
        info!("Monitor service stopped");
    }

    pub async fn set_interval(&self, minutes: i64) {
        *self.interval_minutes.write().await = minutes;
    }

    pub fn is_running(&self) -> bool {
        self.running.try_read().map(|r| *r).unwrap_or(false)
    }

    async fn check_prices() {
        info!("Running price check...");
        let entries = match wl_repo::get_all_entries() {
            Ok(e) => e,
            Err(e) => { warn!("Failed to load watchlist: {}", e); return; }
        };

        let entry_count = entries.len();
        let mut triggered = 0;

        for entry in entries {
            if !entry.alert_enabled { continue; }

            if let Ok(Some(item)) = item_repo::find_by_id(&entry.item_id) {
                if let Some(current_price) = item.current_price {
                    if let Some(target) = entry.target_price {
                        if current_price <= target {
                            triggered += 1;
                            info!("Price alert: {} ({}) now {} <= target {}",
                                entry.item_name.as_deref().unwrap_or("?"),
                                entry.item_id, current_price, target);
                        }
                    }
                }
            }
        }

        info!("Price check complete. Checked {}, triggered {}", entry_count, triggered);
    }
}

impl Default for MonitorService {
    fn default() -> Self {
        Self::new()
    }
}
