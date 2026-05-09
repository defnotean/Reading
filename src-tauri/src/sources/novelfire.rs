pub mod parse {
    use scraper::{Html, Selector};

    use crate::error::{AppError, AppResult};
    use crate::library::ContentKind;
    use crate::sources::{ChapterSummary, TitleDetail, TitleSummary};

    pub struct NovelChapterBody {
        pub plain: String,
        pub paragraphs: Vec<String>,
    }

    fn sel(s: &str) -> AppResult<Selector> {
        Selector::parse(s)
            .map_err(|e| AppError::Parse(format!("bad selector `{s}`: {e:?}")))
    }

    /// Extract a slug from a NovelFire book href like `/book/shadow-slave` or
    /// `/book/shadow-slave/chapter-1`.
    fn slug_from_href(href: &str) -> Option<String> {
        // Strip leading slash then strip "book/" prefix
        let path = href.trim_start_matches('/');
        let rest = path.strip_prefix("book/")?;
        // The slug is the first path segment after "book/"
        let slug = rest.split('/').next().unwrap_or(rest);
        if slug.is_empty() { None } else { Some(slug.to_string()) }
    }

    fn absolute(href: &str) -> String {
        if href.starts_with("http") {
            href.to_string()
        } else if href.starts_with("//") {
            format!("https:{href}")
        } else {
            let path = if href.starts_with('/') {
                href.to_string()
            } else {
                format!("/{href}")
            };
            format!("https://novelfire.net{path}")
        }
    }

    // -----------------------------------------------------------------------
    // Browse page
    // -----------------------------------------------------------------------

    /// Parse the NovelFire browse/ranking/listing page.
    ///
    /// Markup (confirmed against fixture):
    ///   `ul.novel-list > li.novel-item > a[href="/book/{slug}"] > figure.novel-cover > img[data-src]`
    ///   `ul.novel-list > li.novel-item > a > h4.novel-title` (text = title)
    pub fn browse_page(html: &str) -> AppResult<Vec<TitleSummary>> {
        let doc = Html::parse_document(html);

        // li.novel-item — confirmed selector
        let card_sel  = sel("li.novel-item")?;
        // The title lives in h4.novel-title inside the card
        let title_sel = sel("h4.novel-title")?;
        // The anchor wrapping the card carries the href
        let link_sel  = sel("a")?;
        let img_sel   = sel("img")?;

        let mut out = Vec::new();
        for card in doc.select(&card_sel) {
            // Title text
            let title = match card.select(&title_sel).next() {
                Some(el) => el.text().collect::<String>().trim().to_string(),
                None => continue,
            };
            if title.is_empty() { continue }

            // Href from the first anchor that has a /book/ href
            let href = card
                .select(&link_sel)
                .filter_map(|a| a.value().attr("href"))
                .find(|h| h.contains("/book/"))
                .unwrap_or_default();

            let slug = match slug_from_href(href) {
                Some(s) => s,
                None => continue,
            };

            // Cover: img uses data-src (lazy-loaded)
            let cover_url = card
                .select(&img_sel)
                .next()
                .and_then(|img| {
                    img.value().attr("data-src")
                        .or_else(|| img.value().attr("src"))
                })
                .map(absolute);

            out.push(TitleSummary {
                source: "novelfire".into(),
                source_id: slug,
                title,
                author: None,
                cover_url,
                cover_path: None,
                kind: ContentKind::Novel,
            });
        }

        if out.is_empty() {
            return Err(AppError::Parse(
                "browse_page: no novel cards found; inspect fixture for markup changes".into(),
            ));
        }
        Ok(out)
    }

    // -----------------------------------------------------------------------
    // Title / detail page
    // -----------------------------------------------------------------------

    /// Parse the NovelFire book detail page.
    ///
    /// Confirmed selectors:
    ///   - Title:    `h1.novel-title`
    ///   - Author:   `span[itemprop="author"]`
    ///   - Cover:    `div.cover img` (uses plain `src`, not data-src)
    ///   - Synopsis: `div.summary div.content` (collect inner `<p>` text)
    ///   - Chapters: any `<a>` whose href contains `/chapter-`
    pub fn title_page(html: &str, slug: &str) -> AppResult<TitleDetail> {
        let doc = Html::parse_document(html);

        // Title
        let title_sel = sel("h1.novel-title")?;
        let title = doc
            .select(&title_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
            .ok_or_else(|| AppError::Parse("title_page: missing <h1.novel-title>".into()))?;

        // Author — itemprop attribute is reliable
        let author_sel = sel("span[itemprop=\"author\"]")?;
        let author = doc
            .select(&author_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty());

        // Cover — div.cover img uses `src` (not lazy-loaded on the title page)
        let cover_sel = sel("div.cover img")?;
        let cover_url = doc
            .select(&cover_sel)
            .next()
            .and_then(|img| {
                img.value()
                    .attr("src")
                    .or_else(|| img.value().attr("data-src"))
            })
            .map(absolute);

        // Synopsis — div.summary div.content paragraphs joined
        let synopsis_container_sel = sel("div.summary div.content")?;
        let p_sel = sel("p")?;
        let synopsis = doc
            .select(&synopsis_container_sel)
            .next()
            .map(|container| {
                let parts: Vec<String> = container
                    .select(&p_sel)
                    .map(|p| p.text().collect::<String>().trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                parts.join(" ")
            })
            .filter(|s| !s.is_empty());

        // Chapters — extract every <a> whose href contains /chapter-
        let a_sel = sel("a")?;
        let mut chapters: Vec<ChapterSummary> = doc
            .select(&a_sel)
            .filter_map(|el| {
                let href = el.value().attr("href")?;
                if !href.contains("/chapter-") { return None; }
                // chapter_id = last path segment of href
                let chapter_id = href
                    .trim_end_matches('/')
                    .rsplit('/')
                    .next()
                    .unwrap_or(href)
                    .to_string();
                // Parse number from e.g. "chapter-42" or "chapter-42-title-slug"
                let number = chapter_id
                    .strip_prefix("chapter-")
                    .and_then(|rest| rest.split(|c: char| !c.is_ascii_digit() && c != '.').next())
                    .and_then(|s| s.parse::<f32>().ok());
                let title_text = el.text().collect::<String>().trim().to_string();
                Some(ChapterSummary {
                    chapter_id,
                    number,
                    title: if title_text.is_empty() { None } else { Some(title_text) },
                    published_at: None,
                    language: Some("en".into()),
                })
            })
            .collect();

        // Deduplicate (some page templates render each row twice)
        chapters.sort_by(|a, b| a.chapter_id.cmp(&b.chapter_id));
        chapters.dedup_by(|a, b| a.chapter_id == b.chapter_id);
        // Re-sort by chapter number for stable ordering
        chapters.sort_by(|a, b| {
            a.number
                .partial_cmp(&b.number)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let summary = TitleSummary {
            source: "novelfire".into(),
            source_id: slug.to_string(),
            title,
            author,
            cover_url,
            cover_path: None,
            kind: ContentKind::Novel,
        };

        Ok(TitleDetail {
            summary,
            synopsis,
            status: None,
            original_language: Some("en".into()),
            genres: vec![],
            chapters,
        })
    }

    // -----------------------------------------------------------------------
    // Chapter page
    // -----------------------------------------------------------------------

    /// Parse a NovelFire chapter page.
    ///
    /// Confirmed from Task 1: body text lives in `div#content` (~96 `<p>` tags).
    pub fn chapter_page(html: &str) -> AppResult<NovelChapterBody> {
        let doc = Html::parse_document(html);

        let content_sel = sel("#content")?;
        let p_sel = sel("p")?;

        let body = doc
            .select(&content_sel)
            .next()
            .ok_or_else(|| AppError::Parse("chapter_page: no #content element found".into()))?;

        let paragraphs: Vec<String> = body
            .select(&p_sel)
            .map(|p| p.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
            // Filter common injected boilerplate
            .filter(|s| !s.to_lowercase().contains("subscribe to our newsletter"))
            .filter(|s| !s.to_lowercase().contains("read on novelfire"))
            .filter(|s| !s.to_lowercase().contains("advertisement"))
            .collect();

        let plain = paragraphs.join("\n\n");

        if plain.len() < 100 {
            return Err(AppError::Parse(format!(
                "chapter_page: body too short ({} chars) — selector may be wrong",
                plain.len()
            )));
        }

        Ok(NovelChapterBody { plain, paragraphs })
    }
}
