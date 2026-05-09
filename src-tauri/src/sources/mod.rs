use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;
use crate::library::ContentKind;

pub mod generic;
pub mod mangadex;
pub mod novelfire;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleSummary {
    pub source: String,
    pub source_id: String,
    pub title: String,
    pub author: Option<String>,
    pub cover_url: Option<String>,
    /// Set by the cache layer (commands.rs) after the cover has been downloaded.
    /// Sources always emit `None` here.
    pub cover_path: Option<String>,
    pub kind: ContentKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterSummary {
    pub chapter_id: String,
    pub number: Option<f32>,
    pub title: Option<String>,
    pub published_at: Option<i64>,
    pub language: Option<String>,
    pub external_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleDetail {
    pub summary: TitleSummary,
    pub synopsis: Option<String>,
    pub status: Option<String>,
    pub original_language: Option<String>,
    pub genres: Vec<String>,
    pub chapters: Vec<ChapterSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageImage {
    pub url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ChapterContent {
    MangaPages { pages: Vec<PageImage> },
    NovelText  { plain: String, paragraphs: Vec<String> },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BrowseList {
    Trending,
    Latest,
}

#[async_trait]
pub trait Source: Send + Sync {
    fn id(&self) -> &'static str;
    fn kind(&self) -> ContentKind;

    async fn browse(&self, list: BrowseList, page: u32) -> AppResult<Vec<TitleSummary>>;
    async fn search(&self, q: &str, page: u32)            -> AppResult<Vec<TitleSummary>>;
    async fn title(&self, id: &str)                       -> AppResult<TitleDetail>;
    async fn chapter(&self, title_id: &str, chapter_id: &str) -> AppResult<ChapterContent>;
}
