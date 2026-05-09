use std::sync::Arc;

use tauri::{AppHandle, Manager, State};

use crate::cache::{covers_dir, CoverCache};
use crate::db::Db;
use crate::error::AppError;
use crate::library::{Library, ProgressRecord, TitleRecord};
use crate::sources::{
    mangadex::MangaDex, BrowseList, ChapterContent, Source, TitleDetail, TitleSummary,
};

pub struct AppState {
    pub db: Db,
    pub library: Library,
    pub covers: CoverCache,
    pub mangadex: Arc<dyn Source>,
    pub novelfire: Arc<dyn Source>,
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
        Ok(Self { db, library, covers, mangadex, novelfire })
    }
}

fn pick_source<'a>(state: &'a AppState, id: &str) -> Result<&'a Arc<dyn Source>, String> {
    match id {
        "mangadex"  => Ok(&state.mangadex),
        "novelfire" => Ok(&state.novelfire),
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
    src.chapter(&title_id, &chapter_id).await
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
