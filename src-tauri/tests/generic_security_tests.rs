use reading_lib::error::AppError;
use reading_lib::sources::{generic::Generic, Source};

fn encoded(raw: &str) -> String {
    urlencoding::encode(raw).to_string()
}

#[tokio::test]
async fn generic_title_blocks_localhost_urls_before_fetching() {
    let result = Generic.title(&encoded("http://127.0.0.1:9/private")).await;

    assert!(
        matches!(result, Err(AppError::Blocked(_))),
        "expected blocked generic title URL, got {result:?}"
    );
}

#[tokio::test]
async fn generic_chapter_blocks_localhost_urls_before_fetching() {
    let result = Generic
        .chapter(
            &encoded("http://example.com/title"),
            &encoded("http://localhost:9/private"),
        )
        .await;

    assert!(
        matches!(result, Err(AppError::Blocked(_))),
        "expected blocked generic chapter URL, got {result:?}"
    );
}
