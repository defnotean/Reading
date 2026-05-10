use async_trait::async_trait;

use crate::error::AppResult;
use crate::library::ContentKind;
use crate::sources::{
    BrowseList, ChapterContent, Source, TitleDetail, TitleSummary,
};

const BASE: &str = "https://api.mangadex.org";

// MangaDex tag UUIDs (from /manga/tag — these IDs are stable).
const GENRE_TAG_UUIDS: &[(&str, &str)] = &[
    ("action",        "391b0423-d847-456f-aff0-8b0cfc03066b"),
    ("adventure",     "87cc87cd-a395-47af-b27a-93258283bbc6"),
    ("comedy",        "4d32cc48-9f00-4cca-9b5a-a839f0764984"),
    ("drama",         "b9af3a63-f058-46de-a9a0-e0c13906197a"),
    ("fantasy",       "cdc58593-87dd-415e-bbc0-2ec27bf404cc"),
    ("horror",        "cdad7e68-1419-41dd-bdce-27753074a640"),
    ("isekai",        "ace04997-f6bd-436e-b261-779182193d3d"),
    ("mystery",       "ee968100-4191-4968-93d3-f82d72be7e46"),
    ("romance",       "423e2eae-a7a2-4a8b-ac03-a8351462d71d"),
    ("sci-fi",        "256c8bd9-4904-4360-bf4f-508a76d67183"),
    ("slice-of-life", "e5301a23-ebd9-49dd-a0cb-2add944c7fe9"),
    ("supernatural",  "eabc5b4c-6aff-42f3-b657-3e90cbd00b75"),
    ("sports",        "69964a64-2f90-4d33-beeb-f3ed2875eb4c"),
    ("tragedy",       "f8f62932-27da-4fe4-8ee1-6779a8c5edba"),
];

fn tag_uuid_for(name: &str) -> Option<&'static str> {
    let key = name.to_ascii_lowercase().replace('_', "-");
    GENRE_TAG_UUIDS.iter().find(|(n, _)| *n == key).map(|(_, id)| *id)
}

pub struct MangaDex;

#[async_trait]
impl Source for MangaDex {
    fn id(&self) -> &'static str { "mangadex" }
    fn kind(&self) -> ContentKind { ContentKind::Manga }

    async fn browse(&self, list: BrowseList, page: u32) -> AppResult<Vec<TitleSummary>> {
        let offset = page.saturating_mul(20);
        let mut query = format!(
            "limit=20&offset={offset}\
             &availableTranslatedLanguage%5B%5D=en\
             &contentRating%5B%5D=safe&contentRating%5B%5D=suggestive\
             &includes%5B%5D=author&includes%5B%5D=cover_art"
        );
        match &list {
            BrowseList::Trending => {
                query.push_str("&order%5BfollowedCount%5D=desc");
            }
            BrowseList::Latest => {
                query.push_str("&order%5BlatestUploadedChapter%5D=desc");
            }
            BrowseList::Genre(name) => {
                if let Some(uuid) = tag_uuid_for(name) {
                    query.push_str(&format!("&order%5BfollowedCount%5D=desc&includedTags%5B%5D={uuid}"));
                } else {
                    // Unknown genre — fall back to trending
                    query.push_str("&order%5BfollowedCount%5D=desc");
                }
            }
            BrowseList::Lang(code) => {
                query.push_str(&format!("&order%5BfollowedCount%5D=desc&originalLanguage%5B%5D={code}"));
            }
        }
        let url = format!("{BASE}/manga?{query}");
        let body = crate::http::client().get(&url).send().await?.text().await?;
        parse::browse_response(&body)
    }

    async fn search(&self, q: &str, page: u32) -> AppResult<Vec<TitleSummary>> {
        let offset = page.saturating_mul(20);
        let q = urlencoding::encode(q);
        let url = format!(
            "{BASE}/manga?limit=20&offset={offset}&title={q}\
             &availableTranslatedLanguage%5B%5D=en\
             &contentRating%5B%5D=safe&contentRating%5B%5D=suggestive\
             &includes%5B%5D=author&includes%5B%5D=cover_art"
        );
        let body = crate::http::client().get(&url).send().await?.text().await?;
        parse::browse_response(&body)
    }

    async fn title(&self, id: &str) -> AppResult<TitleDetail> {
        let url = format!(
            "{BASE}/manga/{id}?includes%5B%5D=author&includes%5B%5D=artist&includes%5B%5D=cover_art"
        );
        let body = crate::http::client().get(&url).send().await?.text().await?;
        let mut detail = parse::title_response(&body)?;

        let feed_url = format!(
            "{BASE}/manga/{id}/feed?limit=500&translatedLanguage%5B%5D=en&order%5Bchapter%5D=asc"
        );
        let feed_body = crate::http::client().get(&feed_url).send().await?.text().await?;
        detail.chapters = parse::feed_response(&feed_body)?;
        Ok(detail)
    }

    async fn chapter(&self, _title_id: &str, chapter_id: &str) -> AppResult<ChapterContent> {
        let url = format!("{BASE}/at-home/server/{chapter_id}");
        let resp = crate::http::client().get(&url).send().await?;
        let status = resp.status();
        let body = resp.text().await?;
        if !status.is_success() {
            return Err(crate::error::AppError::Http(format!(
                "{status} from MangaDex at-home for chapter {chapter_id}: {}",
                body.chars().take(200).collect::<String>()
            )));
        }
        let pages = parse::at_home_response(&body, "data")?;
        if pages.is_empty() {
            return Err(crate::error::AppError::NotFound(format!(
                "chapter {chapter_id} returned no images — it may be hosted externally"
            )));
        }
        Ok(ChapterContent::MangaPages { pages })
    }
}

pub mod parse {
    use serde_json::Value;

    use crate::error::{AppError, AppResult};
    use crate::library::ContentKind;
    use crate::sources::{ChapterSummary, PageImage, TitleDetail, TitleSummary};

    fn local(value: &Value) -> Option<String> {
        let m = value.as_object()?;
        m.get("en")
            .or_else(|| m.values().next())
            .and_then(|v| v.as_str())
            .map(str::to_string)
    }

    fn relationship<'a>(rels: &'a [Value], kind: &str) -> Option<&'a Value> {
        rels.iter().find(|r| r.get("type").and_then(Value::as_str) == Some(kind))
    }

    fn cover_url(manga_id: &str, rels: &[Value]) -> Option<String> {
        let cover = relationship(rels, "cover_art")?;
        let filename = cover.get("attributes")?.get("fileName")?.as_str()?;
        Some(format!("https://uploads.mangadex.org/covers/{manga_id}/{filename}.512.jpg"))
    }

    fn author_name(rels: &[Value]) -> Option<String> {
        let author = relationship(rels, "author")?;
        author.get("attributes")?.get("name")?.as_str().map(str::to_string)
    }

    fn manga_to_summary(item: &Value) -> Option<TitleSummary> {
        let id = item.get("id")?.as_str()?;
        let attrs = item.get("attributes")?;
        let title = local(attrs.get("title")?)?;
        let rels = item.get("relationships")?.as_array()?;
        Some(TitleSummary {
            source: "mangadex".into(),
            source_id: id.to_string(),
            title,
            author: author_name(rels),
            cover_url: cover_url(id, rels),
            cover_path: None,
            kind: ContentKind::Manga,
        })
    }

    pub fn browse_response(body: &str) -> AppResult<Vec<TitleSummary>> {
        let v: Value = serde_json::from_str(body)?;
        let data = v.get("data")
            .and_then(Value::as_array)
            .ok_or_else(|| AppError::Parse("missing data array".into()))?;
        Ok(data.iter().filter_map(manga_to_summary).collect())
    }

    pub fn title_response(body: &str) -> AppResult<TitleDetail> {
        let v: Value = serde_json::from_str(body)?;
        let data = v.get("data")
            .ok_or_else(|| AppError::Parse("missing data".into()))?;
        let summary = manga_to_summary(data)
            .ok_or_else(|| AppError::Parse("title summary parse failed".into()))?;
        let attrs = data.get("attributes").cloned().unwrap_or(Value::Null);

        let synopsis = attrs.get("description").and_then(local);
        let status   = attrs.get("status").and_then(Value::as_str).map(str::to_string);
        let orig     = attrs.get("originalLanguage").and_then(Value::as_str).map(str::to_string);

        let genres = attrs.get("tags")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|t| t.get("attributes")?.get("name").and_then(local))
                    .collect()
            })
            .unwrap_or_default();

        Ok(TitleDetail {
            summary,
            synopsis,
            status,
            original_language: orig,
            genres,
            chapters: vec![],
        })
    }

    pub fn feed_response(body: &str) -> AppResult<Vec<ChapterSummary>> {
        let v: Value = serde_json::from_str(body)?;
        let data = v.get("data")
            .and_then(Value::as_array)
            .ok_or_else(|| AppError::Parse("missing data array".into()))?;
        let mut chapters: Vec<ChapterSummary> = data.iter().filter_map(|item| {
            let id = item.get("id")?.as_str()?.to_string();
            let attrs = item.get("attributes")?;
            let number = attrs.get("chapter").and_then(Value::as_str).and_then(|s| s.parse().ok());
            let title  = attrs.get("title").and_then(Value::as_str).map(str::to_string);
            let published_at = attrs.get("publishAt").and_then(Value::as_str).and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.timestamp())
            });
            let language = attrs.get("translatedLanguage").and_then(Value::as_str).map(str::to_string);
            // externalUrl is a string when the chapter lives on an external site, null otherwise
            let external_url = attrs.get("externalUrl")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .map(str::to_string);
            Some(ChapterSummary { chapter_id: id, number, title, published_at, language, external_url })
        }).collect();
        chapters.sort_by(|a, b| a.number.partial_cmp(&b.number).unwrap_or(std::cmp::Ordering::Equal));
        Ok(chapters)
    }

    pub fn at_home_response(body: &str, quality: &str) -> AppResult<Vec<PageImage>> {
        let v: Value = serde_json::from_str(body)?;
        let base   = v.get("baseUrl").and_then(Value::as_str)
            .ok_or_else(|| AppError::Parse("missing baseUrl".into()))?;
        let chapter = v.get("chapter")
            .ok_or_else(|| AppError::Parse("missing chapter".into()))?;
        let hash   = chapter.get("hash").and_then(Value::as_str)
            .ok_or_else(|| AppError::Parse("missing hash".into()))?;
        let key = if quality == "data-saver" { "dataSaver" } else { "data" };
        let segment = if quality == "data-saver" { "data-saver" } else { "data" };
        let pages = chapter.get(key).and_then(Value::as_array).cloned().unwrap_or_default();
        Ok(pages.iter().filter_map(|p| {
            let f = p.as_str()?;
            Some(PageImage {
                url: format!("{base}/{segment}/{hash}/{f}"),
                width: None,
                height: None,
            })
        }).collect())
    }
}
