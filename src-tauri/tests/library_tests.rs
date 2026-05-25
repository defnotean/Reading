use reading_lib::db::Db;
use reading_lib::library::{ContentKind, Library, TitleRecord};

fn sample(source: &str, id: &str) -> TitleRecord {
    TitleRecord {
        source: source.into(),
        source_id: id.into(),
        kind: ContentKind::Manga,
        title: format!("Title {id}"),
        author: Some("Aiko".into()),
        cover_path: None,
        synopsis: None,
        status: None,
        original_lang: Some("ja".into()),
        genres: vec!["action".into(), "fantasy".into()],
    }
}

#[test]
fn upsert_and_star_round_trip() {
    let db = Db::open_in_memory().unwrap();
    let lib = Library::new(db);

    lib.upsert_title(&sample("mangadex", "abc")).unwrap();
    assert!(!lib.is_starred("mangadex", "abc").unwrap());

    lib.set_starred("mangadex", "abc", true).unwrap();
    assert!(lib.is_starred("mangadex", "abc").unwrap());

    let starred = lib.list_starred().unwrap();
    assert_eq!(starred.len(), 1);
    assert_eq!(starred[0].source_id, "abc");
    assert_eq!(starred[0].genres, vec!["action", "fantasy"]);
}

#[test]
fn record_progress_keeps_only_latest() {
    let db = Db::open_in_memory().unwrap();
    let lib = Library::new(db);

    lib.upsert_title(&sample("mangadex", "abc")).unwrap();
    lib.record_progress("mangadex", "abc", "ch1", 0.20).unwrap();
    lib.record_progress("mangadex", "abc", "ch2", 0.50).unwrap();

    let recents = lib.continue_reading(10).unwrap();
    assert_eq!(recents.len(), 1);
    assert_eq!(recents[0].chapter_id, "ch2");
    assert!((recents[0].position_pct - 0.50).abs() < 1e-6);
}
