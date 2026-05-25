use async_trait::async_trait;
use scraper::{Html, Selector};

use crate::error::{AppError, AppResult};
use crate::library::ContentKind;
use crate::sources::{
    BrowseList, ChapterContent, ChapterSummary, PageImage, Source, TitleDetail, TitleSummary,
};

pub struct GenericNovelBody {
    pub plain: String,
    pub paragraphs: Vec<String>,
}

fn count_text_chars(html: &str) -> usize {
    let doc = Html::parse_document(html);
    let body_sel = Selector::parse("body").unwrap();
    doc.select(&body_sel)
        .next()
        .map(|b| b.text().collect::<String>().len())
        .unwrap_or(0)
}

fn count_large_images(html: &str) -> usize {
    let doc = Html::parse_document(html);
    let img_sel = Selector::parse("img").unwrap();
    doc.select(&img_sel)
        .filter(|el| {
            let w = el
                .value()
                .attr("width")
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            let h = el
                .value()
                .attr("height")
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            w >= 500
                || h >= 500
                || (w == 0
                    && h == 0
                    && el
                        .value()
                        .attr("src")
                        .map(|s| {
                            let lc = s.to_lowercase();
                            lc.ends_with(".jpg")
                                || lc.ends_with(".jpeg")
                                || lc.ends_with(".png")
                                || lc.ends_with(".webp")
                        })
                        .unwrap_or(false))
        })
        .count()
}

pub fn detect_kind(html: &str) -> ContentKind {
    let chars = count_text_chars(html) as i64;
    let imgs = count_large_images(html) as i64;
    if imgs >= 5 && chars < 3000 {
        ContentKind::Manga
    } else if chars > 1500 && imgs < 5 {
        ContentKind::Novel
    } else if chars > 0 && imgs > chars / 200 {
        ContentKind::Manga
    } else {
        ContentKind::Novel
    }
}

pub fn parse_novel(html: &str, _base_url: &str) -> AppResult<GenericNovelBody> {
    let doc = Html::parse_document(html);
    let candidate_sel = Selector::parse(
        "article, main, [role=main], .post, .article, .chapter, .content, #content, body",
    )
    .map_err(|e| AppError::Parse(format!("bad selector: {e:?}")))?;
    let p_sel = Selector::parse("p").unwrap();
    let mut best: Option<(usize, scraper::ElementRef)> = None;
    for el in doc.select(&candidate_sel) {
        let text_len: usize = el
            .select(&p_sel)
            .map(|p| p.text().collect::<String>().chars().count())
            .sum();
        match best {
            Some((cur, _)) if cur >= text_len => {}
            _ => best = Some((text_len, el)),
        }
    }
    let Some((_, container)) = best else {
        return Err(AppError::Parse(
            "no candidate content container found".into(),
        ));
    };
    let paragraphs: Vec<String> = container
        .select(&p_sel)
        .map(|p| p.text().collect::<String>().trim().to_string())
        .filter(|s| s.len() > 20)
        .collect();
    if paragraphs.is_empty() {
        return Err(AppError::Parse(
            "no paragraphs found in densest container".into(),
        ));
    }
    let plain = paragraphs.join("\n\n");
    Ok(GenericNovelBody { plain, paragraphs })
}

pub fn parse_manga(html: &str, base_url: &str) -> AppResult<Vec<PageImage>> {
    let doc = Html::parse_document(html);
    let img_sel = Selector::parse("img").unwrap();
    let pages: Vec<PageImage> = doc
        .select(&img_sel)
        .filter_map(|el| {
            let src = el
                .value()
                .attr("src")
                .or_else(|| el.value().attr("data-src"))?;
            let w = el
                .value()
                .attr("width")
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            let h = el
                .value()
                .attr("height")
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            // Skip obvious avatars / icons
            if (w > 0 && w < 200) || (h > 0 && h < 200) {
                return None;
            }
            let url = if src.starts_with("http") {
                src.to_string()
            } else if src.starts_with("//") {
                format!("https:{src}")
            } else if let Ok(base) = url::Url::parse(base_url) {
                base.join(src)
                    .ok()
                    .map(|u| u.to_string())
                    .unwrap_or_else(|| src.to_string())
            } else {
                src.to_string()
            };
            Some(PageImage {
                url,
                width: if w > 0 { Some(w) } else { None },
                height: if h > 0 { Some(h) } else { None },
            })
        })
        .collect();
    if pages.is_empty() {
        return Err(AppError::Parse("no candidate images found".into()));
    }
    Ok(pages)
}

pub fn parse_content(html: &str, base_url: &str) -> AppResult<ChapterContent> {
    match detect_kind(html) {
        ContentKind::Manga => {
            let pages = parse_manga(html, base_url)?;
            Ok(ChapterContent::MangaPages { pages })
        }
        ContentKind::Novel => {
            let body = parse_novel(html, base_url)?;
            Ok(ChapterContent::NovelText {
                plain: body.plain,
                paragraphs: body.paragraphs,
            })
        }
    }
}

pub struct Generic;

#[async_trait]
impl Source for Generic {
    fn id(&self) -> &'static str {
        "generic"
    }
    fn kind(&self) -> ContentKind {
        ContentKind::Novel
    } // placeholder; chapter() decides per-URL

    async fn browse(&self, _list: BrowseList, _page: u32) -> AppResult<Vec<TitleSummary>> {
        Err(AppError::NotFound(
            "generic source does not support browse".into(),
        ))
    }
    async fn search(&self, _q: &str, _page: u32) -> AppResult<Vec<TitleSummary>> {
        Err(AppError::NotFound(
            "generic source does not support search".into(),
        ))
    }
    async fn title(&self, id: &str) -> AppResult<TitleDetail> {
        let url = urlencoding::decode(id)
            .map_err(|e| AppError::Parse(e.to_string()))?
            .into_owned();
        let html = crate::http::get_user_html(&url).await?;
        let title_sel = Selector::parse("title").unwrap();
        let doc = Html::parse_document(&html);
        let title = doc
            .select(&title_sel)
            .next()
            .map(|t| t.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| url.clone());
        let kind = detect_kind(&html);
        Ok(TitleDetail {
            summary: TitleSummary {
                source: "generic".into(),
                source_id: id.to_string(),
                title: title.clone(),
                author: None,
                cover_url: None,
                cover_path: None,
                kind,
            },
            synopsis: None,
            status: None,
            original_language: None,
            genres: vec![],
            chapters: vec![ChapterSummary {
                chapter_id: id.to_string(),
                number: Some(1.0),
                title: Some(title),
                published_at: None,
                language: None,
                external_url: None,
            }],
        })
    }
    async fn chapter(&self, _title_id: &str, chapter_id: &str) -> AppResult<ChapterContent> {
        let url = urlencoding::decode(chapter_id)
            .map_err(|e| AppError::Parse(e.to_string()))?
            .into_owned();
        let html = crate::http::get_user_html(&url).await?;
        parse_content(&html, &url)
    }
}
