//! TTL cache using moka.

use moka::future::Cache;
use std::hash::Hash;
use std::time::Duration;

/// Generic TTL cache with automatic expiration.
pub struct TtlCache<K, V>
where
    K: Hash + Eq + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    cache: Cache<K, V>,
}

impl<K, V> TtlCache<K, V>
where
    K: Hash + Eq + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    /// Create a new TTL cache with specified max capacity and time-to-live.
    pub fn new(max_capacity: u64, ttl_secs: u64) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_capacity)
            .time_to_live(Duration::from_secs(ttl_secs))
            .build();

        Self { cache }
    }

    /// Get a value from cache, returns None if not found or expired.
    pub async fn get(&self, key: &K) -> Option<V> {
        self.cache.get(key).await
    }

    /// Insert a value into cache with the configured TTL.
    pub async fn insert(&self, key: K, value: V) {
        self.cache.insert(key, value).await;
    }

    /// Invalidate a specific key.
    pub async fn invalidate(&self, key: &K) {
        self.cache.invalidate(key).await;
    }

    /// Invalidate all entries.
    pub async fn invalidate_all(&self) {
        self.cache.invalidate_all();
    }

    /// Get the number of entries currently in cache.
    pub fn entry_count(&self) -> u64 {
        self.cache.entry_count()
    }
}
