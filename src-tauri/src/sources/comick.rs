use async_trait::async_trait;

use crate::error::{AppError, AppResult};
use crate::library::ContentKind;
use crate::sources::{BrowseList, ChapterContent, PageImage, Source, TitleDetail, TitleSummary};

/// ComicK API base.  Historically also at api.comick.io and api.comick.fun, but those redirect
/// to the frontend; the API is now served exclusively at api.comick.dev.
const BASE: &str = "https://api.comick.dev";

/// ComicK hosts chapter images on Backblaze B2 CDN.  The b2key from /get_images is appended
/// directly to this base: `https://meo.comick.pictures/{b2key}`.
const IMAGE_BASE: &str = "https://meo.comick.pictures";

pub struct ComicK;

async fn fetch_text(url: &str) -> AppResult<String> {
    let resp = crate::http::client().get(url).send().await?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Http(format!(
            "{status} from {url}: {}",
            body.chars().take(200).collect::<String>()
        )));
    }
    Ok(resp.text().await?)
}

#[async_trait]
impl Source for ComicK {
    fn id(&self) -> &'static str {
        "comick"
    }
    fn kind(&self) -> ContentKind {
        ContentKind::Manga
    }

    async fn browse(&self, list: BrowseList, page: u32) -> AppResult<Vec<TitleSummary>> {
        let mut url = format!("{BASE}/v1.0/search?type=comic&page={}&limit=20", page + 1);
        match &list {
            BrowseList::Trending => url.push_str("&sort=follow"),
            BrowseList::Latest => url.push_str("&sort=uploaded"),
            BrowseList::Genre(name) => {
                // ComicK uses lowercase genre slugs; common names match.
                url.push_str(&format!(
                    "&sort=follow&genres={}",
                    urlencoding::encode(name)
                ));
            }
            BrowseList::Lang(_) => {
                // ComicK has its own country filter; for v1, just default to follow.
                url.push_str("&sort=follow");
            }
        }
        let body = fetch_text(&url).await?;
        parse::search_response(&body)
    }

    async fn search(&self, q: &str, page: u32) -> AppResult<Vec<TitleSummary>> {
        let q = urlencoding::encode(q);
        let url = format!(
            "{BASE}/v1.0/search?type=comic&q={q}&page={}&limit=20",
            page + 1
        );
        let body = fetch_text(&url).await?;
        parse::search_response(&body)
    }

    async fn title(&self, id: &str) -> AppResult<TitleDetail> {
        // id is the comic's hid (8-char slug like "udwf1dTf")
        let comic_url = format!("{BASE}/comic/{id}");
        let comic_body = fetch_text(&comic_url).await?;
        let mut detail = parse::comic_response(&comic_body, id)?;

        // Fetch first 200 English chapters
        let chap_url = format!("{BASE}/comic/{id}/chapters?lang=en&page=1&limit=200");
        let chap_body = fetch_text(&chap_url).await?;
        detail.chapters = parse::chapters_response(&chap_body)?;
        Ok(detail)
    }

    async fn chapter(&self, _title_id: &str, chapter_id: &str) -> AppResult<ChapterContent> {
        // chapter_id is the chapter's hid (e.g. "0zKv32_g")
        // Images live at /chapter/{hid}/get_images — a top-level JSON array of page objects.
        let url = format!("{BASE}/chapter/{chapter_id}/get_images");
        let body = fetch_text(&url).await?;
        let pages = parse::chapter_images_response(&body)?;
        if pages.is_empty() {
            return Err(AppError::NotFound(format!(
                "ComicK chapter {chapter_id} returned no images"
            )));
        }
        Ok(ChapterContent::MangaPages { pages })
    }
}

/// Find a chapter on ComicK by title + chapter number.
///
/// Used as a fallback when MangaDex returns NotFound for an external chapter.  Returns `None` on
/// any error or when no matching chapter is found — this is intentionally silent so callers can
/// treat it as "not available on ComicK" rather than a hard failure.
pub async fn find_chapter_by_title_and_number(
    title: &str,
    chapter_number: f32,
) -> Option<Vec<PageImage>> {
    tracing::info!(
        "ComicK fallback: searching for title={:?} chapter={}",
        title,
        chapter_number
    );

    // Try the full title first, then individual significant words as fallbacks.
    let queries: Vec<String> = {
        let full = title.to_string();
        // Also try with just the first 3+ significant words (in case of subtitle noise)
        let words: Vec<&str> = title.split_whitespace().filter(|w| w.len() >= 3).collect();
        let short = if words.len() > 2 {
            Some(words[..words.len().min(3)].join(" "))
        } else {
            None
        };
        let mut q = vec![full];
        if let Some(s) = short {
            if s != title {
                q.push(s);
            }
        }
        q
    };

    for query in &queries {
        let encoded = urlencoding::encode(query);
        let search_url = format!("{BASE}/v1.0/search?type=comic&q={encoded}&limit=5");
        tracing::info!("ComicK fallback: trying search query={:?}", query);
        let search_body = match fetch_text(&search_url).await {
            Ok(b) => b,
            Err(e) => {
                tracing::info!("ComicK fallback: search failed: {}", e);
                continue;
            }
        };
        let summaries = match parse::search_response(&search_body) {
            Ok(s) => s,
            Err(e) => {
                tracing::info!("ComicK fallback: parse failed: {}", e);
                continue;
            }
        };

        tracing::info!(
            "ComicK fallback: got {} results for {:?}",
            summaries.len(),
            query
        );

        for s in summaries.iter().take(5) {
            // Loose title match: lowercase contains check in either direction,
            // or at least 2 words from the query appear in the result title.
            let known = s.title.to_lowercase();
            let want = title.to_lowercase();
            let loose_word_match = {
                let want_words: Vec<&str> =
                    want.split_whitespace().filter(|w| w.len() >= 3).collect();
                let match_count = want_words.iter().filter(|&&w| known.contains(w)).count();
                match_count >= 2.min(want_words.len())
            };
            if !(known.contains(&want) || want.contains(&known) || loose_word_match) {
                tracing::info!(
                    "ComicK fallback: skipping title={:?} (no match for {:?})",
                    s.title,
                    title
                );
                continue;
            }

            tracing::info!(
                "ComicK fallback: matched comic hid={} title={:?}",
                s.source_id,
                s.title
            );

            // Fetch English chapters (limit 200; enough for most series)
            let chap_url = format!(
                "{BASE}/comic/{}/chapters?lang=en&page=1&limit=200",
                s.source_id
            );
            let chap_body = match fetch_text(&chap_url).await.ok() {
                Some(b) => b,
                None => continue,
            };
            let chapters = match parse::chapters_response(&chap_body).ok() {
                Some(c) => c,
                None => continue,
            };

            // Find the chapter whose number is within 0.001 of the target
            let target = chapters.iter().find(|c| {
                c.number
                    .map(|n| (n - chapter_number).abs() < 0.001)
                    .unwrap_or(false)
            });

            let target = match target {
                Some(t) => t,
                None => {
                    tracing::info!(
                        "ComicK fallback: chapter {} not found in {} chapters for {:?}",
                        chapter_number,
                        chapters.len(),
                        s.title
                    );
                    continue;
                }
            };

            tracing::info!(
                "ComicK fallback: found chapter hid={} for number={}",
                target.chapter_id,
                chapter_number
            );

            // Fetch pages
            let pages_url = format!("{BASE}/chapter/{}/get_images", target.chapter_id);
            let pages_body = match fetch_text(&pages_url).await.ok() {
                Some(b) => b,
                None => continue,
            };
            let pages = match parse::chapter_images_response(&pages_body).ok() {
                Some(p) => p,
                None => continue,
            };
            if !pages.is_empty() {
                tracing::info!(
                    "ComicK fallback: returning {} pages for chapter {}",
                    pages.len(),
                    chapter_number
                );
                return Some(pages);
            }
        }
    }

    tracing::info!(
        "ComicK fallback: no match found for title={:?} chapter={}",
        title,
        chapter_number
    );
    None
}

pub mod parse {
    use serde_json::Value;

    use crate::error::{AppError, AppResult};
    use crate::library::ContentKind;
    use crate::sources::{ChapterSummary, PageImage, TitleDetail, TitleSummary};

    use super::IMAGE_BASE;

    /// ComicK search response shape:
    /// Top-level JSON array.  Each element is a comic object with at minimum:
    ///   `hid`        — 8-char unique identifier used in all further API calls
    ///   `title`      — display title (English)
    ///   `md_covers`  — array of cover objects, each with `b2key` (CDN filename)
    pub fn search_response(body: &str) -> AppResult<Vec<TitleSummary>> {
        let v: Value = serde_json::from_str(body)?;
        // The endpoint always returns a bare array; guard against any future wrapping.
        let arr = v
            .as_array()
            .cloned()
            .or_else(|| v.get("data").and_then(Value::as_array).cloned())
            .ok_or_else(|| AppError::Parse("comick search: expected top-level array".into()))?;

        let mut out = Vec::new();
        for item in &arr {
            let Some(hid) = item.get("hid").and_then(Value::as_str) else {
                continue;
            };
            // Primary title field is `title`; fall back to first entry in `md_titles`.
            let title = item.get("title").and_then(Value::as_str).or_else(|| {
                item.get("md_titles")
                    .and_then(Value::as_array)
                    .and_then(|a| a.first())
                    .and_then(|t| t.get("title"))
                    .and_then(Value::as_str)
            });
            let Some(title) = title else { continue };

            // Cover: md_covers[0].b2key → https://meo.comick.pictures/{b2key}
            // Thumbnail variant: append "-s" before the extension (e.g. "D4wyOZ-s.jpg"),
            // but use the full key for the default cover display.
            let cover_url = item
                .get("md_covers")
                .and_then(Value::as_array)
                .and_then(|a| a.first())
                .and_then(|c| c.get("b2key").and_then(Value::as_str))
                .map(|k| format!("{IMAGE_BASE}/{k}"));

            out.push(TitleSummary {
                source: "comick".into(),
                source_id: hid.to_string(),
                title: title.to_string(),
                author: None,
                cover_url,
                cover_path: None,
                kind: ContentKind::Manga,
            });
        }
        if out.is_empty() {
            return Err(AppError::Parse(
                "comick search: zero summaries parsed".into(),
            ));
        }
        Ok(out)
    }

    /// ComicK single-comic response shape:
    /// `{ comic: { hid, title, desc, md_covers: [{b2key}], md_comic_md_genres: [...] }, ... }`
    /// or flat `{ hid, title, ... }` for some endpoints.
    pub fn comic_response(body: &str, fallback_id: &str) -> AppResult<TitleDetail> {
        let v: Value = serde_json::from_str(body)?;
        // Comic detail commonly nests under `comic`; fall back to root.
        let comic = v.get("comic").unwrap_or(&v);

        let hid = comic
            .get("hid")
            .and_then(Value::as_str)
            .unwrap_or(fallback_id)
            .to_string();
        let title = comic
            .get("title")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| fallback_id.to_string());

        let synopsis = comic
            .get("desc")
            .and_then(Value::as_str)
            .map(str::to_string)
            .or_else(|| {
                comic
                    .get("description")
                    .and_then(Value::as_str)
                    .map(str::to_string)
            });

        let cover_url = comic
            .get("md_covers")
            .and_then(Value::as_array)
            .and_then(|a| a.first())
            .and_then(|c| c.get("b2key").and_then(Value::as_str))
            .map(|k| format!("{IMAGE_BASE}/{k}"));

        // Genres live in `md_comic_md_genres[].md_genres.name` or `genres[]` (id-only).
        let genres = comic
            .get("md_comic_md_genres")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|g| {
                        g.get("md_genres")
                            .and_then(|x| x.get("name"))
                            .and_then(Value::as_str)
                            .or_else(|| g.get("name").and_then(Value::as_str))
                            .map(str::to_string)
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(TitleDetail {
            summary: TitleSummary {
                source: "comick".into(),
                source_id: hid,
                title,
                author: None,
                cover_url,
                cover_path: None,
                kind: ContentKind::Manga,
            },
            synopsis,
            status: None,
            original_language: None,
            genres,
            chapters: vec![],
        })
    }

    /// ComicK chapters response shape:
    /// `{ chapters: [{ hid, chap, title, vol, lang, created_at, publish_at }], total, ... }`
    pub fn chapters_response(body: &str) -> AppResult<Vec<ChapterSummary>> {
        let v: Value = serde_json::from_str(body)?;
        let arr = v
            .get("chapters")
            .and_then(Value::as_array)
            .cloned()
            .or_else(|| v.as_array().cloned())
            .ok_or_else(|| AppError::Parse("comick chapters: no .chapters array".into()))?;

        let mut chapters: Vec<ChapterSummary> = arr
            .iter()
            .filter_map(|item| {
                let hid = item.get("hid").and_then(Value::as_str)?.to_string();
                let number = item
                    .get("chap")
                    .and_then(Value::as_str)
                    .and_then(|s| s.parse::<f32>().ok());
                let title = item
                    .get("title")
                    .and_then(Value::as_str)
                    .filter(|s| !s.is_empty())
                    .map(str::to_string);
                let lang = item.get("lang").and_then(Value::as_str).map(str::to_string);
                // Prefer publish_at; fall back to created_at
                let published_at = item
                    .get("publish_at")
                    .and_then(Value::as_str)
                    .or_else(|| item.get("created_at").and_then(Value::as_str))
                    .and_then(|s| {
                        chrono::DateTime::parse_from_rfc3339(s)
                            .ok()
                            .map(|d| d.timestamp())
                    });
                Some(ChapterSummary {
                    chapter_id: hid,
                    number,
                    title,
                    published_at,
                    language: lang,
                    external_url: None,
                })
            })
            .collect();

        chapters.sort_by(|a, b| {
            a.number
                .partial_cmp(&b.number)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        Ok(chapters)
    }

    /// ComicK chapter images response shape:
    /// Top-level JSON array from `/chapter/{hid}/get_images`.
    /// Each element: `{ b2key: "o2f5PLj-6.jpg", w: 640, h: 904, name: "...", s: <size>, optimized: null }`
    /// Full image URL: `https://meo.comick.pictures/{b2key}`
    pub fn chapter_images_response(body: &str) -> AppResult<Vec<PageImage>> {
        let v: Value = serde_json::from_str(body)?;
        // Response is always a bare array from /get_images.
        let arr = v.as_array().ok_or_else(|| {
            AppError::Parse("comick chapter images: expected top-level array".into())
        })?;

        let pages: Vec<PageImage> = arr
            .iter()
            .filter_map(|img| {
                let b2key = img
                    .get("b2key")
                    .and_then(Value::as_str)
                    .or_else(|| img.get("name").and_then(Value::as_str))?;

                let url = if b2key.starts_with("http") {
                    b2key.to_string()
                } else {
                    format!("{IMAGE_BASE}/{b2key}")
                };

                let width = img.get("w").and_then(Value::as_u64).map(|n| n as u32);
                let height = img.get("h").and_then(Value::as_u64).map(|n| n as u32);

                Some(PageImage { url, width, height })
            })
            .collect();

        Ok(pages)
    }
}
