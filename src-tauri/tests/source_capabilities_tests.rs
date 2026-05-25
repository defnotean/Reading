use reading_lib::sources::source_capabilities;

#[test]
fn source_capabilities_include_all_registered_sources() {
    let caps = source_capabilities();
    let ids: Vec<_> = caps.iter().map(|cap| cap.source.as_str()).collect();

    assert_eq!(ids, vec!["comick", "generic", "mangadex", "novelfire"]);
}

#[test]
fn source_capabilities_describe_mobile_visible_features() {
    let caps = source_capabilities();
    let mangadex = caps.iter().find(|cap| cap.source == "mangadex").unwrap();
    let generic = caps.iter().find(|cap| cap.source == "generic").unwrap();
    let novelfire = caps.iter().find(|cap| cap.source == "novelfire").unwrap();

    assert_eq!(mangadex.content_kind, "manga");
    assert!(mangadex.browse);
    assert!(mangadex.search);
    assert!(mangadex.external_chapters);
    assert_eq!(generic.content_kind, "manga_or_novel");
    assert!(!generic.browse);
    assert!(!generic.search);
    assert_eq!(novelfire.content_kind, "novel");
}
