use std::path::{Path, PathBuf};

use reqwest::header::CONTENT_TYPE;

use crate::error::{AppError, AppResult};
use crate::http::client;

pub const MAX_COVER_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Clone)]
pub struct CoverCache {
    root: PathBuf,
}

impl CoverCache {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        let root = root.into();
        let _ = std::fs::create_dir_all(&root);
        Self { root }
    }

    pub fn path_for(&self, source: &str, id: &str) -> PathBuf {
        let safe = sanitize(id);
        self.root.join(format!("{source}_{safe}.jpg"))
    }

    pub async fn ensure(&self, source: &str, id: &str, url: &str) -> AppResult<PathBuf> {
        let path = self.path_for(source, id);
        if path.exists() {
            return Ok(path);
        }
        let response = client().get(url).send().await?;
        let status = response.status();
        if !status.is_success() {
            let body = crate::http::error_body_capped(response).await;
            return Err(AppError::Http(format!("{status} {url}: {body}")));
        }
        if let Some(content_type) = response.headers().get(CONTENT_TYPE) {
            let content_type = content_type
                .to_str()
                .unwrap_or_default()
                .to_ascii_lowercase();
            if !content_type.starts_with("image/") {
                return Err(AppError::Blocked(format!(
                    "cover response is not an image: {content_type}"
                )));
            }
        }
        if let Some(len) = response.content_length() {
            if len > MAX_COVER_BYTES {
                return Err(AppError::Blocked(format!(
                    "cover exceeds {MAX_COVER_BYTES} bytes"
                )));
            }
        }
        let bytes = crate::http::read_response_capped(response, MAX_COVER_BYTES).await?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&path, &bytes)?;
        Ok(path)
    }
}

fn sanitize(id: &str) -> String {
    id.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

pub fn covers_dir(app_data_root: &Path) -> PathBuf {
    app_data_root.join("cache").join("covers")
}
