use reading_lib::error::AppError;
use reading_lib::http::{validate_user_redirect_location, validate_user_url};

fn assert_blocked(result: Result<url::Url, AppError>) {
    assert!(
        matches!(result, Err(AppError::Blocked(_))),
        "expected blocked URL, got {result:?}"
    );
}

#[test]
fn user_url_validation_allows_http_and_https_public_hosts() {
    assert!(validate_user_url("https://example.com/novel/chapter-1").is_ok());
    assert!(validate_user_url("http://example.com/novel/chapter-1").is_ok());
}

#[test]
fn user_url_validation_rejects_non_http_schemes_and_local_hosts() {
    assert_blocked(validate_user_url("file:///etc/passwd"));
    assert_blocked(validate_user_url("ftp://example.com/book"));
    assert_blocked(validate_user_url("http://localhost:8080/private"));
    assert_blocked(validate_user_url("http://127.0.0.1/private"));
    assert_blocked(validate_user_url("http://[::1]/private"));
}

#[test]
fn user_url_validation_rejects_private_link_local_multicast_and_unspecified_ips() {
    for raw in [
        "http://10.0.0.1",
        "http://172.16.0.1",
        "http://192.168.0.1",
        "http://169.254.169.254",
        "http://224.0.0.1",
        "http://0.0.0.0",
        "http://[fc00::1]",
        "http://[fe80::1]",
        "http://[ff02::1]",
        "http://[::]",
    ] {
        assert_blocked(validate_user_url(raw));
    }
}

#[test]
fn redirect_validation_rejects_unsafe_targets() {
    let base = validate_user_url("https://example.com/start").unwrap();

    assert!(validate_user_redirect_location(&base, "/next").is_ok());
    assert_blocked(validate_user_redirect_location(
        &base,
        "http://127.0.0.1/admin",
    ));
}
