use std::sync::Arc;

use scraper::{Html, Selector};
use tauri::{AppHandle, Manager, State};

use crate::cache::{covers_dir, CoverCache};
use crate::db::Db;
use crate::error::AppError;
use crate::library::{ContentKind, Library, ProgressRecord, TitleRecord};
use crate::sources::{
    mangadex::MangaDex, BrowseList, ChapterContent, Source, TitleDetail, TitleSummary,
};

pub struct AppState {
    pub db: Db,
    pub library: Library,
    pub covers: CoverCache,
    pub mangadex: Arc<dyn Source>,
    pub novelfire: Arc<dyn Source>,
    pub generic: Arc<dyn Source>,
    pub comick: Arc<dyn Source>,
}

impl AppState {
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let db_path = app_data.join("metadata").join("library.sqlite");
        let db = Db::open(&db_path).map_err(|e| e.to_string())?;
        let library = Library::new(db.clone());
        let covers = CoverCache::new(covers_dir(&app_data));
        let mangadex:  Arc<dyn Source> = Arc::new(MangaDex);
        let novelfire: Arc<dyn Source> = Arc::new(crate::sources::novelfire::NovelFire);
        let generic:   Arc<dyn Source> = Arc::new(crate::sources::generic::Generic);
        let comick:    Arc<dyn Source> = Arc::new(crate::sources::comick::ComicK);
        Ok(Self { db, library, covers, mangadex, novelfire, generic, comick })
    }
}

fn pick_source<'a>(state: &'a AppState, id: &str) -> Result<&'a Arc<dyn Source>, String> {
    match id {
        "mangadex"  => Ok(&state.mangadex),
        "novelfire" => Ok(&state.novelfire),
        "generic"   => Ok(&state.generic),
        "comick"    => Ok(&state.comick),
        other => Err(format!("unknown source: {other}")),
    }
}

async fn enrich_with_cover_path(state: &AppState, mut s: TitleSummary) -> TitleSummary {
    if let Some(url) = s.cover_url.as_deref() {
        if let Ok(p) = state.covers.ensure(&s.source, &s.source_id, url).await {
            s.cover_path = Some(p.to_string_lossy().into_owned());
        }
    }
    s
}

#[tauri::command]
pub async fn browse(
    source: String, list: BrowseList, page: u32, state: State<'_, AppState>,
) -> Result<Vec<TitleSummary>, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    let summaries = src.browse(list, page).await?;
    let mut out = Vec::with_capacity(summaries.len());
    for s in summaries {
        out.push(enrich_with_cover_path(state.inner(), s).await);
    }
    Ok(out)
}

#[tauri::command]
pub async fn search(
    source: String, q: String, page: u32, state: State<'_, AppState>,
) -> Result<Vec<TitleSummary>, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    let summaries = src.search(&q, page).await?;
    let mut out = Vec::with_capacity(summaries.len());
    for s in summaries {
        out.push(enrich_with_cover_path(state.inner(), s).await);
    }
    Ok(out)
}

#[tauri::command]
pub async fn get_title(
    source: String, id: String, state: State<'_, AppState>,
) -> Result<TitleDetail, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    let mut detail = src.title(&id).await?;
    detail.summary = enrich_with_cover_path(state.inner(), detail.summary).await;

    // Mirror into the library so it survives across launches and is browsable
    // from the Library screen even before being starred.
    let title_record = TitleRecord {
        source:        detail.summary.source.clone(),
        source_id:     detail.summary.source_id.clone(),
        kind:          src.kind(),
        title:         detail.summary.title.clone(),
        author:        detail.summary.author.clone(),
        cover_path:    detail.summary.cover_path.clone(),
        synopsis:      detail.synopsis.clone(),
        status:        detail.status.clone(),
        original_lang: detail.original_language.clone(),
        genres:        detail.genres.clone(),
    };
    let _ = state.library.upsert_title(&title_record);

    Ok(detail)
}

#[tauri::command]
pub async fn get_chapter(
    source: String, title_id: String, chapter_id: String, state: State<'_, AppState>,
) -> Result<ChapterContent, AppError> {
    let src = pick_source(state.inner(), &source).map_err(AppError::Internal)?;
    match src.chapter(&title_id, &chapter_id).await {
        Ok(content) => Ok(content),
        Err(AppError::NotFound(msg)) if source == "mangadex" => {
            // MangaDex returned NotFound — the chapter may be hosted externally.
            // Try ComicK as a fallback: look up the title's text + chapter number.
            let detail = src
                .title(&title_id)
                .await
                .map_err(|_| AppError::NotFound(msg.clone()))?;
            let chapter_meta = detail
                .chapters
                .iter()
                .find(|c| c.chapter_id == chapter_id);
            let chap_num = chapter_meta.and_then(|c| c.number);
            let external_url = chapter_meta
                .and_then(|c| c.external_url.as_deref())
                .map(str::to_string);
            let title_text = &detail.summary.title;
            if let Some(num) = chap_num {
                if let Some(pages) =
                    crate::sources::comick::find_chapter_by_title_and_number(title_text, num).await
                {
                    tracing::info!(
                        "MangaDex external chapter — found on ComicK fallback \
                         (title={}, chapter={})",
                        title_text,
                        num
                    );
                    return Ok(ChapterContent::MangaPages { pages });
                }
            }
            // Propagate the external URL in the error message so the frontend can offer
            // "Open on publisher's site" when ComicK also fails.
            if let Some(ext) = external_url {
                Err(AppError::NotFound(format!(
                    "{msg}\nexternal_url={ext}"
                )))
            } else {
                Err(AppError::NotFound(msg))
            }
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn library_list(state: State<'_, AppState>) -> Result<Vec<TitleRecord>, AppError> {
    state.library.list_starred()
}

#[tauri::command]
pub fn library_set_starred(
    source: String, id: String, starred: bool, state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.library.set_starred(&source, &id, starred)
}

#[tauri::command]
pub fn library_is_starred(
    source: String, id: String, state: State<'_, AppState>,
) -> Result<bool, AppError> {
    state.library.is_starred(&source, &id)
}

#[tauri::command]
pub fn continue_reading(
    state: State<'_, AppState>, limit: Option<u32>,
) -> Result<Vec<ProgressRecord>, AppError> {
    state.library.continue_reading(limit.unwrap_or(10))
}

#[tauri::command]
pub fn record_progress(
    source: String, id: String, chapter_id: String, position_pct: f64,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.library.record_progress(&source, &id, &chapter_id, position_pct)
}

#[derive(serde::Serialize)]
pub struct GenericRouteHint {
    pub source: String,
    pub source_id: String,
    pub kind: ContentKind,
    pub title: String,
    pub chapter_id: String,
}

#[tauri::command]
pub async fn from_url(url: String, _state: State<'_, AppState>) -> Result<GenericRouteHint, AppError> {
    let html = crate::http::client().get(&url).send().await?.text().await?;
    let kind = crate::sources::generic::detect_kind(&html);
    let doc = Html::parse_document(&html);
    let title_sel = Selector::parse("title").map_err(|e| AppError::Parse(format!("{e:?}")))?;
    let title = doc.select(&title_sel).next()
        .map(|t| t.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| url.clone());
    let encoded = urlencoding::encode(&url).to_string();
    Ok(GenericRouteHint {
        source: "generic".into(),
        source_id: encoded.clone(),
        kind,
        title,
        chapter_id: encoded,
    })
}
