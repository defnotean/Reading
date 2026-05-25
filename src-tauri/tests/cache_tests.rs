use reading_lib::cache::CoverCache;
use reading_lib::error::AppError;
use tempfile::tempdir;

#[tokio::test]
async fn cache_path_is_deterministic_and_creates_dir() {
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let p1 = cache.path_for("mangadex", "abc-123");
    let p2 = cache.path_for("mangadex", "abc-123");
    assert_eq!(p1, p2);
    assert!(
        p1.parent().unwrap().exists() || p1.parent().unwrap().to_string_lossy().contains("covers")
    );
    assert!(p1.to_string_lossy().ends_with(".jpg"));
}

#[tokio::test]
async fn cover_cache_rejects_non_success_responses_without_writing() {
    let mut server = mockito::Server::new_async().await;
    let _mock = server
        .mock("GET", "/missing.jpg")
        .with_status(404)
        .with_body("not found")
        .create_async()
        .await;
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let url = format!("{}/missing.jpg", server.url());

    let result = cache.ensure("generic", "missing", &url).await;

    assert!(matches!(result, Err(AppError::Http(_))));
    assert!(!cache.path_for("generic", "missing").exists());
}

#[tokio::test]
async fn cover_cache_omits_oversized_error_bodies_without_writing() {
    let mut server = mockito::Server::new_async().await;
    let huge_error = "x".repeat(65 * 1024);
    let _mock = server
        .mock("GET", "/huge-error.jpg")
        .with_status(500)
        .with_body(huge_error)
        .create_async()
        .await;
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let url = format!("{}/huge-error.jpg", server.url());

    let result = cache.ensure("generic", "huge-error", &url).await;

    let Err(AppError::Http(message)) = result else {
        panic!("expected capped HTTP error body");
    };
    assert!(message.contains("body omitted because it exceeded"));
    assert!(!cache.path_for("generic", "huge-error").exists());
}

#[tokio::test]
async fn cover_cache_rejects_non_image_content_type_without_writing() {
    let mut server = mockito::Server::new_async().await;
    let _mock = server
        .mock("GET", "/page.html")
        .with_status(200)
        .with_header("content-type", "text/html; charset=utf-8")
        .with_body("<html></html>")
        .create_async()
        .await;
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let url = format!("{}/page.html", server.url());

    let result = cache.ensure("generic", "html", &url).await;

    assert!(matches!(result, Err(AppError::Blocked(_))));
    assert!(!cache.path_for("generic", "html").exists());
}

#[tokio::test]
async fn cover_cache_rejects_oversized_content_length_without_writing() {
    let mut server = mockito::Server::new_async().await;
    let too_large = reading_lib::cache::MAX_COVER_BYTES + 1;
    let body = vec![0; too_large as usize];
    let _mock = server
        .mock("GET", "/huge.jpg")
        .with_status(200)
        .with_header("content-type", "image/jpeg")
        .with_body(body)
        .create_async()
        .await;
    let tmp = tempdir().unwrap();
    let cache = CoverCache::new(tmp.path().join("covers"));
    let url = format!("{}/huge.jpg", server.url());

    let result = cache.ensure("generic", "huge", &url).await;

    assert!(matches!(result, Err(AppError::Blocked(_))));
    assert!(!cache.path_for("generic", "huge").exists());
}
