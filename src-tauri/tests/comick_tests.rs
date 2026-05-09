use reading_lib::sources::comick::parse;

#[test]
fn parses_search_into_summaries() {
    let raw = std::fs::read_to_string("fixtures/comick_search.json").unwrap();
    let summaries = parse::search_response(&raw).unwrap();
    assert!(!summaries.is_empty(), "search should return at least one comic");
    let first = &summaries[0];
    assert_eq!(first.source, "comick");
    assert!(!first.title.is_empty());
    assert!(!first.source_id.is_empty(), "source_id should be the comic hid");
    // Cover URL should point to the ComicK CDN
    if let Some(url) = &first.cover_url {
        assert!(
            url.contains("meo.comick.pictures"),
            "cover_url should use meo.comick.pictures CDN, got: {url}"
        );
    }
}

#[test]
fn parses_chapters_into_chapter_summaries() {
    let raw = std::fs::read_to_string("fixtures/comick_chapters.json").unwrap();
    let chapters = parse::chapters_response(&raw).unwrap();
    assert!(!chapters.is_empty());
    assert!(
        chapters.iter().any(|c| c.number.is_some()),
        "at least one chapter should have a number"
    );
    // Chapters should be sorted ascending by number
    let numbered: Vec<f32> = chapters.iter().filter_map(|c| c.number).collect();
    let mut sorted = numbered.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    assert_eq!(numbered, sorted, "chapters should be sorted ascending by number");
}

#[test]
fn parses_chapter_into_pages() {
    let raw = std::fs::read_to_string("fixtures/comick_chapter.json").unwrap();
    let pages = parse::chapter_images_response(&raw).unwrap();
    assert!(!pages.is_empty(), "chapter images response should have at least one page");
    assert!(
        pages[0].url.starts_with("https://"),
        "page URL should be absolute https, got: {}",
        pages[0].url
    );
    assert!(
        pages[0].url.contains("meo.comick.pictures"),
        "page URL should use ComicK CDN, got: {}",
        pages[0].url
    );
    // Width and height should be populated
    assert!(pages[0].width.is_some(), "page width should be present");
    assert!(pages[0].height.is_some(), "page height should be present");
}
