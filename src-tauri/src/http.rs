use std::time::Duration;

use once_cell::sync::OnceCell;
use reqwest::{header::LOCATION, redirect::Policy, Client, Response};
use tokio::net::lookup_host;
use url::{Host, Url};

use crate::error::{AppError, AppResult};

static CLIENT: OnceCell<Client> = OnceCell::new();
static SAFE_CLIENT: OnceCell<Client> = OnceCell::new();

pub const MAX_HTML_BYTES: u64 = 5 * 1024 * 1024;
pub const MAX_ERROR_BODY_BYTES: u64 = 64 * 1024;
const MAX_USER_REDIRECTS: usize = 5;

pub fn client() -> &'static Client {
    CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent(concat!(
                "Reading/",
                env!("CARGO_PKG_VERSION"),
                " (+desktop)"
            ))
            .build()
            .expect("reqwest client builds")
    })
}

fn safe_client() -> &'static Client {
    SAFE_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(20))
            .redirect(Policy::none())
            .user_agent(concat!(
                "Reading/",
                env!("CARGO_PKG_VERSION"),
                " (+desktop)"
            ))
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

pub fn validate_user_url(raw: &str) -> AppResult<Url> {
    let url = Url::parse(raw).map_err(|e| AppError::Blocked(format!("invalid URL: {e}")))?;
    match url.scheme() {
        "http" | "https" => {}
        scheme => {
            return Err(AppError::Blocked(format!(
                "unsupported URL scheme: {scheme}"
            )))
        }
    }
    let Some(host) = url.host() else {
        return Err(AppError::Blocked("URL must include a host".into()));
    };
    validate_host(host)?;
    Ok(url)
}

pub fn validate_user_redirect_location(base: &Url, location: &str) -> AppResult<Url> {
    let next = base
        .join(location)
        .map_err(|e| AppError::Blocked(format!("invalid redirect URL: {e}")))?;
    validate_user_url(next.as_str())
}

pub async fn get_user_html(raw: &str) -> AppResult<String> {
    let mut url = validate_user_url(raw)?;
    for _ in 0..=MAX_USER_REDIRECTS {
        validate_resolved_host(&url).await?;
        let response = safe_client().get(url.clone()).send().await?;
        if response.status().is_redirection() {
            let location = response
                .headers()
                .get(LOCATION)
                .and_then(|value| value.to_str().ok())
                .ok_or_else(|| AppError::Http(format!("redirect without location: {url}")))?;
            url = validate_user_redirect_location(&url, location)?;
            continue;
        }
        return response_text_capped(response, MAX_HTML_BYTES).await;
    }
    Err(AppError::Blocked("too many redirects".into()))
}

async fn response_text_capped(response: Response, max_bytes: u64) -> AppResult<String> {
    let status = response.status();
    if !status.is_success() {
        let body = error_body_capped(response).await;
        return Err(AppError::Http(format!("{status}: {body}")));
    }
    if let Some(len) = response.content_length() {
        if len > max_bytes {
            return Err(AppError::Blocked(format!(
                "response exceeds {max_bytes} bytes"
            )));
        }
    }
    let bytes = read_response_capped(response, max_bytes).await?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub async fn error_body_capped(response: Response) -> String {
    match read_response_capped(response, MAX_ERROR_BODY_BYTES).await {
        Ok(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
        Err(_) => format!("body omitted because it exceeded {MAX_ERROR_BODY_BYTES} bytes"),
    }
}

pub async fn read_response_capped(mut response: Response, max_bytes: u64) -> AppResult<Vec<u8>> {
    let mut out = Vec::new();
    while let Some(chunk) = response.chunk().await? {
        let next_len = out.len() + chunk.len();
        if next_len as u64 > max_bytes {
            return Err(AppError::Blocked(format!(
                "response exceeds {max_bytes} bytes"
            )));
        }
        out.extend_from_slice(&chunk);
    }
    Ok(out)
}

fn validate_host(host: Host<&str>) -> AppResult<()> {
    match host {
        Host::Domain(domain) => {
            let normalized = domain.trim_end_matches('.').to_ascii_lowercase();
            if normalized == "localhost" || normalized.ends_with(".localhost") {
                return Err(AppError::Blocked("local hostnames are not allowed".into()));
            }
        }
        Host::Ipv4(ip) => validate_ip(ip.into())?,
        Host::Ipv6(ip) => validate_ip(ip.into())?,
    }
    Ok(())
}

async fn validate_resolved_host(url: &Url) -> AppResult<()> {
    let host = url
        .host_str()
        .ok_or_else(|| AppError::Blocked("URL must include a host".into()))?;
    let port = url.port_or_known_default().unwrap_or(80);
    for addr in lookup_host((host, port)).await? {
        validate_ip(addr.ip())?;
    }
    Ok(())
}

fn validate_ip(ip: std::net::IpAddr) -> AppResult<()> {
    let unsafe_ip = match ip {
        std::net::IpAddr::V4(ip) => {
            ip.is_loopback()
                || ip.is_private()
                || ip.is_link_local()
                || ip.is_multicast()
                || ip.is_unspecified()
        }
        std::net::IpAddr::V6(ip) => {
            ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_multicast()
                || is_ipv6_unique_local(ip)
                || is_ipv6_unicast_link_local(ip)
        }
    };
    if unsafe_ip {
        Err(AppError::Blocked(format!("unsafe IP address: {ip}")))
    } else {
        Ok(())
    }
}

fn is_ipv6_unique_local(ip: std::net::Ipv6Addr) -> bool {
    (ip.segments()[0] & 0xfe00) == 0xfc00
}

fn is_ipv6_unicast_link_local(ip: std::net::Ipv6Addr) -> bool {
    (ip.segments()[0] & 0xffc0) == 0xfe80
}
