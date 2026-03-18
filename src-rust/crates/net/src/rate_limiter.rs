//! Token bucket rate limiter.

use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration};

/// Token bucket rate limiter: allows `permits` per second.
pub struct RateLimiter {
    sem: Arc<Semaphore>,
    interval_ms: u64,
}

impl RateLimiter {
    pub fn new(per_second: u64) -> Self {
        Self {
            sem: Arc::new(Semaphore::new(per_second as usize)),
            interval_ms: 1000 / per_second,
        }
    }

    /// Acquire a permit, waiting if necessary.
    pub async fn acquire(&self) {
        // Acquire 1 permit
        let permit = self.sem.acquire().await.expect("Semaphore closed");
        drop(permit);
        // Wait interval before next permit
        sleep(Duration::from_millis(self.interval_ms)).await;
    }
}
