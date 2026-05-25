use reading_lib::library::ContentKind;
use reading_lib::sources::generic::{detect_kind, parse_content, parse_manga, parse_novel};
use reading_lib::sources::ChapterContent;

#[test]
fn detects_novel_html_as_novel() {
    let raw = std::fs::read_to_string("fixtures/generic_novel.html").unwrap();
    assert_eq!(detect_kind(&raw), ContentKind::Novel);
}

#[test]
fn detects_manga_html_as_manga() {
    let raw = std::fs::read_to_string("fixtures/generic_manga.html").unwrap();
    assert_eq!(detect_kind(&raw), ContentKind::Manga);
}

#[test]
fn parses_novel_html_into_paragraphs() {
    let raw = std::fs::read_to_string("fixtures/generic_novel.html").unwrap();
    let body = parse_novel(&raw, "https://example.com").unwrap();
    assert!(body.paragraphs.len() >= 3);
    assert!(body.plain.len() > 200);
}

#[test]
fn parses_manga_html_into_image_urls() {
    let raw = std::fs::read_to_string("fixtures/generic_manga.html").unwrap();
    let pages = parse_manga(&raw, "https://example.com").unwrap();
    assert!(!pages.is_empty());
    assert!(pages.iter().all(|p| p.url.starts_with("http")));
}

#[test]
fn parses_generic_html_into_reader_content() {
    let raw = std::fs::read_to_string("fixtures/generic_manga.html").unwrap();
    let content = parse_content(&raw, "https://example.com").unwrap();

    match content {
        ChapterContent::MangaPages { pages } => {
            assert!(!pages.is_empty(), "manga fallback should produce pages");
        }
        other => panic!("expected manga pages, got {other:?}"),
    }
}
