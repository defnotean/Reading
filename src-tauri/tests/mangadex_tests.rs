use reading_lib::sources::mangadex::parse;

#[test]
fn parses_browse_response_to_summaries() {
    let raw = std::fs::read_to_string("fixtures/mangadex_browse.json").unwrap();
    let summaries = parse::browse_response(&raw).unwrap();
    assert!(!summaries.is_empty(), "should have at least one summary");
    let first = &summaries[0];
    assert_eq!(first.source, "mangadex");
    assert!(!first.title.is_empty());
    assert!(first.cover_url.as_ref().unwrap().contains("uploads.mangadex.org"));
}

#[test]
fn parses_title_detail() {
    let raw = std::fs::read_to_string("fixtures/mangadex_title.json").unwrap();
    let detail = parse::title_response(&raw).unwrap();
    assert!(!detail.summary.title.is_empty());
}

#[test]
fn parses_feed_into_chapter_summaries() {
    let raw = std::fs::read_to_string("fixtures/mangadex_feed.json").unwrap();
    let chapters = parse::feed_response(&raw).unwrap();
    assert!(!chapters.is_empty());
    assert!(chapters.iter().any(|c| c.number.is_some()));
}

#[test]
fn parses_at_home_into_page_urls() {
    let raw = std::fs::read_to_string("fixtures/mangadex_at_home.json").unwrap();
    let pages = parse::at_home_response(&raw, "data").unwrap();
    assert!(!pages.is_empty(), "at-home response should yield page urls");
    assert!(pages[0].url.starts_with("https://"));
}
