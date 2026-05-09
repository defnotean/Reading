use reading_lib::error::AppError;

#[test]
fn http_errors_serialize_to_camel_case() {
    let err = AppError::Http("boom".into());
    let json = serde_json::to_string(&err).unwrap();
    assert_eq!(json, r#"{"kind":"http","message":"boom"}"#);
}

#[test]
fn parse_errors_serialize() {
    let err = AppError::Parse("bad json".into());
    let json = serde_json::to_string(&err).unwrap();
    assert_eq!(json, r#"{"kind":"parse","message":"bad json"}"#);
}
