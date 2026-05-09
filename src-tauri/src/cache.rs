use std::path::{Path, PathBuf};

use crate::error::AppResult;
use crate::http::client;

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
        let bytes = client().get(url).send().await?.bytes().await?;
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
