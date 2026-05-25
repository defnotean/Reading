use reading_lib::db::Db;
use tempfile::tempdir;

#[test]
fn db_runs_migrations_on_open() {
    let tmp = tempdir().unwrap();
    let path = tmp.path().join("reading.sqlite");
    let db = Db::open(&path).unwrap();

    let count: i64 = db
        .conn()
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='titles'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1, "titles table should exist after open()");
}

#[test]
fn db_migration_is_idempotent() {
    let tmp = tempdir().unwrap();
    let path = tmp.path().join("reading.sqlite");
    let _ = Db::open(&path).unwrap();
    let _ = Db::open(&path).unwrap(); // open twice, must not fail
}
