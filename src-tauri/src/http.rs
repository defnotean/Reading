use std::time::Duration;

use once_cell::sync::OnceCell;
use reqwest::Client;

use crate::error::{AppError, AppResult};

static CLIENT: OnceCell<Client> = OnceCell::new();

pub fn client() -> &'static Client {
    CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent(concat!("Reading/", env!("CARGO_PKG_VERSION"), " (+desktop)"))
            .build()
            .expect("reqwest client builds")
    })
}

pub async fn get_json<T: serde::de::DeserializeOwned>(url: &str) -> AppResult<T> {
    let r = client().get(url).send().await?;
    let status = r.status();
    if !status.is_success() {
        let body = r.text().await.unwrap_or_default();
        if status.as_u16() == 403 {
            return Err(AppError::Blocked(format!("403 from {url}: {body}")));
        }
        return Err(AppError::Http(format!("{status} {url}: {body}")));
    }
    let v = r.json::<T>().await?;
    Ok(v)
}
