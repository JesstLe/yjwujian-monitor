//! Image download and caching to local disk.

use std::path::PathBuf;
use anyhow::Result;
use reqwest::Client;
use std::sync::LazyLock;

static HTTP_CLIENT: LazyLock<Client> = LazyLock::new(|| {
    Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .build()
        .unwrap()
});

pub struct ImageCache {
    cache_dir: PathBuf,
}

impl ImageCache {
    pub fn new(cache_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&cache_dir).ok();
        Self { cache_dir }
    }

    /// Download an image URL and cache it locally.
    /// Returns the local file path.
    pub async fn get(&self, url: &str) -> Result<PathBuf> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        // Generate cache filename from URL hash
        let mut hasher = DefaultHasher::new();
        url.hash(&mut hasher);
        let hash = hasher.finish();
        let ext = url.rsplit('/').next().unwrap_or("img").split('.').last().unwrap_or("png");
        let local_path = self.cache_dir.join(format!("{:016x}.{}", hash, ext));

        if local_path.exists() {
            return Ok(local_path);
        }

        // Download
        let bytes = HTTP_CLIENT.get(url).send().await?.bytes().await?;
        tokio::fs::write(&local_path, &bytes).await?;

        Ok(local_path)
    }
}
