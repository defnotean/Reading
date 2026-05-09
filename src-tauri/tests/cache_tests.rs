use reading_lib::cache::CoverCache;
use tempfile::tempdir;

#[tokio::test]
async fn cache_path_is_deterministic_and_creates_dir() {
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let p1 = cache.path_for("mangadex", "abc-123");
    let p2 = cache.path_for("mangadex", "abc-123");
    assert_eq!(p1, p2);
    assert!(p1.parent().unwrap().exists() || p1.parent().unwrap().to_string_lossy().contains("covers"));
    assert!(p1.to_string_lossy().ends_with(".jpg"));
}
