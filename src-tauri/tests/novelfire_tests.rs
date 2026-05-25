use reading_lib::sources::novelfire::parse;

#[test]
fn parses_browse_into_summaries() {
    let raw = std::fs::read_to_string("fixtures/novelfire_browse.html").unwrap();
    let summaries = parse::browse_page(&raw).unwrap();
    assert!(!summaries.is_empty(), "should have at least one summary");
    let first = &summaries[0];
    assert_eq!(first.source, "novelfire");
    assert!(!first.title.is_empty());
    assert!(
        first.source_id.len() > 1,
        "source_id should be a non-trivial slug"
    );
    assert!(
        first.cover_url.is_some(),
        "expected a cover URL on the browse card"
    );
}

#[test]
fn parses_title_into_detail() {
    let raw = std::fs::read_to_string("fixtures/novelfire_title.html").unwrap();
    let detail = parse::title_page(&raw, "shadow-slave").unwrap();
    assert!(!detail.summary.title.is_empty());
    assert!(
        detail.synopsis.as_ref().map(|s| s.len()).unwrap_or(0) > 50,
        "expected non-trivial synopsis"
    );
    assert!(!detail.chapters.is_empty(), "expected at least one chapter");
}

#[test]
fn parses_chapter_into_paragraphs() {
    let raw = std::fs::read_to_string("fixtures/novelfire_chapter.html").unwrap();
    let body = parse::chapter_page(&raw).unwrap();
    assert!(
        body.paragraphs.len() >= 5,
        "expected several paragraphs of body text"
    );
    assert!(body.plain.len() > 500, "plain text should be non-trivial");
    assert!(!body
        .plain
        .to_lowercase()
        .contains("subscribe to our newsletter"));
}
