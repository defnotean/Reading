use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::db::Db;
use crate::error::AppResult;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ContentKind {
    Manga,
    Novel,
}

impl ContentKind {
    fn as_str(&self) -> &'static str {
        match self {
            ContentKind::Manga => "manga",
            ContentKind::Novel => "novel",
        }
    }
    fn parse(s: &str) -> Self {
        match s {
            "novel" => ContentKind::Novel,
            _ => ContentKind::Manga,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TitleRecord {
    pub source: String,
    pub source_id: String,
    pub kind: ContentKind,
    pub title: String,
    pub author: Option<String>,
    pub cover_path: Option<String>,
    pub synopsis: Option<String>,
    pub status: Option<String>,
    pub original_lang: Option<String>,
    pub genres: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressRecord {
    pub source: String,
    pub source_id: String,
    pub chapter_id: String,
    pub position_pct: f64,
    pub updated_at: i64,
    /// Joined from `titles` table — nullable when the title hasn't been seen yet.
    pub title: Option<String>,
    /// Joined from `titles` table — `None` if no cover has been cached.
    pub cover_path: Option<String>,
}

#[derive(Clone)]
pub struct Library {
    db: Db,
}

impl Library {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn upsert_title(&self, t: &TitleRecord) -> AppResult<()> {
        let conn = self.db.conn();
        let genres_json = serde_json::to_string(&t.genres)?;
        let now = Utc::now().timestamp();
        conn.execute(
            r#"
            INSERT INTO titles
                (source, source_id, kind, title, author, cover_path, synopsis,
                 status, original_lang, genres_json, added_at, starred)
            VALUES (?,?,?,?,?,?,?,?,?,?,?, COALESCE(
                (SELECT starred FROM titles WHERE source=? AND source_id=?), 0))
            ON CONFLICT(source, source_id) DO UPDATE SET
                kind          = excluded.kind,
                title         = excluded.title,
                author        = excluded.author,
                cover_path    = excluded.cover_path,
                synopsis      = excluded.synopsis,
                status        = excluded.status,
                original_lang = excluded.original_lang,
                genres_json   = excluded.genres_json
            "#,
            rusqlite::params![
                t.source,
                t.source_id,
                t.kind.as_str(),
                t.title,
                t.author,
                t.cover_path,
                t.synopsis,
                t.status,
                t.original_lang,
                genres_json,
                now,
                t.source,
                t.source_id
            ],
        )?;
        Ok(())
    }

    pub fn set_starred(&self, source: &str, id: &str, starred: bool) -> AppResult<()> {
        let conn = self.db.conn();
        conn.execute(
            "UPDATE titles SET starred=? WHERE source=? AND source_id=?",
            rusqlite::params![starred as i64, source, id],
        )?;
        Ok(())
    }

    pub fn is_starred(&self, source: &str, id: &str) -> AppResult<bool> {
        let conn = self.db.conn();
        let v: Option<i64> = conn
            .query_row(
                "SELECT starred FROM titles WHERE source=? AND source_id=?",
                rusqlite::params![source, id],
                |r| r.get(0),
            )
            .ok();
        Ok(v.unwrap_or(0) != 0)
    }

    pub fn list_starred(&self) -> AppResult<Vec<TitleRecord>> {
        let conn = self.db.conn();
        let mut stmt = conn.prepare(
            "SELECT source, source_id, kind, title, author, cover_path, synopsis,
                    status, original_lang, genres_json
             FROM titles WHERE starred=1
             ORDER BY added_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let genres_json: Option<String> = row.get(9)?;
            let genres: Vec<String> = genres_json
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();
            Ok(TitleRecord {
                source: row.get(0)?,
                source_id: row.get(1)?,
                kind: ContentKind::parse(&row.get::<_, String>(2)?),
                title: row.get(3)?,
                author: row.get(4)?,
                cover_path: row.get(5)?,
                synopsis: row.get(6)?,
                status: row.get(7)?,
                original_lang: row.get(8)?,
                genres,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn record_progress(
        &self,
        source: &str,
        id: &str,
        chapter_id: &str,
        position_pct: f64,
    ) -> AppResult<()> {
        let conn = self.db.conn();
        conn.execute(
            r#"
            INSERT INTO progress (source, source_id, chapter_id, position_pct, updated_at)
            VALUES (?,?,?,?,?)
            ON CONFLICT(source, source_id) DO UPDATE SET
                chapter_id   = excluded.chapter_id,
                position_pct = excluded.position_pct,
                updated_at   = excluded.updated_at
            "#,
            rusqlite::params![source, id, chapter_id, position_pct, Utc::now().timestamp()],
        )?;
        Ok(())
    }

    pub fn continue_reading(&self, limit: u32) -> AppResult<Vec<ProgressRecord>> {
        let conn = self.db.conn();
        let mut stmt = conn.prepare(
            "SELECT p.source, p.source_id, p.chapter_id, p.position_pct, p.updated_at,
                    t.title, t.cover_path
             FROM progress p
             LEFT JOIN titles t ON t.source = p.source AND t.source_id = p.source_id
             ORDER BY p.updated_at DESC LIMIT ?",
        )?;
        let rows = stmt.query_map([limit as i64], |r| {
            Ok(ProgressRecord {
                source: r.get(0)?,
                source_id: r.get(1)?,
                chapter_id: r.get(2)?,
                position_pct: r.get(3)?,
                updated_at: r.get(4)?,
                title: r.get(5)?,
                cover_path: r.get(6)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }
}
