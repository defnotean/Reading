use std::path::Path;
use std::sync::Arc;

use parking_lot::Mutex;
use rusqlite::Connection;

use crate::error::{AppError, AppResult};

const MIGRATIONS: &[&str] = &[
    // 0001 — initial schema
    r#"
    CREATE TABLE IF NOT EXISTS titles (
        source         TEXT NOT NULL,
        source_id      TEXT NOT NULL,
        kind           TEXT NOT NULL,
        title          TEXT NOT NULL,
        author         TEXT,
        cover_path     TEXT,
        synopsis       TEXT,
        status         TEXT,
        original_lang  TEXT,
        genres_json    TEXT,
        added_at       INTEGER NOT NULL,
        starred        INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (source, source_id)
    );

    CREATE TABLE IF NOT EXISTS chapters (
        source         TEXT NOT NULL,
        source_id      TEXT NOT NULL,
        chapter_id     TEXT NOT NULL,
        number         REAL,
        title          TEXT,
        published_at   INTEGER,
        PRIMARY KEY (source, source_id, chapter_id)
    );

    CREATE TABLE IF NOT EXISTS progress (
        source         TEXT NOT NULL,
        source_id      TEXT NOT NULL,
        chapter_id     TEXT NOT NULL,
        position_pct   REAL NOT NULL,
        updated_at     INTEGER NOT NULL,
        PRIMARY KEY (source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_progress_updated ON progress(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_titles_starred  ON titles(starred);

    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
    );
    "#,
];

#[derive(Clone)]
pub struct Db {
    inner: Arc<Mutex<Connection>>,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;

        let db = Db {
            inner: Arc::new(Mutex::new(conn)),
        };
        db.run_migrations()?;
        Ok(db)
    }

    pub fn open_in_memory() -> AppResult<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Db {
            inner: Arc::new(Mutex::new(conn)),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> AppResult<()> {
        let conn = self.inner.lock();
        for sql in MIGRATIONS {
            conn.execute_batch(sql).map_err(AppError::from)?;
        }
        let current: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if (current as usize) < MIGRATIONS.len() {
            conn.execute(
                "INSERT INTO schema_version(version) VALUES (?)",
                [MIGRATIONS.len() as i64],
            )?;
        }
        Ok(())
    }

    pub fn conn(&self) -> parking_lot::MutexGuard<'_, Connection> {
        self.inner.lock()
    }
}
