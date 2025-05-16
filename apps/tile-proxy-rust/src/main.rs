use std::{convert::Infallible, net::SocketAddr, time::Instant};

use hyper::{
    body::{Bytes, Frame, Incoming},
    http::{Request, Response, StatusCode},
    service::service_fn,
    Method,
};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto::Builder as ServerBuilder,
};
use http_body_util::{BodyExt, Full, StreamBody};
use http_body_util::combinators::BoxBody;
use once_cell::sync::Lazy;
use reqwest::Client;
use tokio::net::TcpListener;
use tracing::{info, error};
use moka::future::Cache;
use tokio_stream::once;
use tokio::fs;
use std::path::Path;
use std::env;

fn get_tile_base_path() -> Option<String> {
    match env::var("TILE_STORAGE_PATH") {
        Ok(p) if !p.trim().is_empty() => Some(p),
        Ok(_) => None,
        Err(_) => Some("/data/tiles".to_string()), // prod default
    }
}

const MAX_TILE_CACHE_CAPACITY: u64 = 50_000;

static TILE_CACHE: Lazy<Cache<String, Bytes>> = Lazy::new(|| {
    Cache::builder()
        .max_capacity(MAX_TILE_CACHE_CAPACITY)
        .time_to_live(std::time::Duration::from_secs(3600))
        .build()
});

static REQWEST_CLIENT: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .user_agent("tile-proxy-rust/1.0")
        .timeout(std::time::Duration::from_secs(10))
        .pool_max_idle_per_host(100)
        .build()
        .expect("Failed to build reqwest client")
});

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let tile_base = get_tile_base_path();
    let use_disk_cache = tile_base
        .as_ref()
        .map(|p| !p.trim().is_empty() && Path::new(p).exists())
        .unwrap_or(false);

    // Only attempt to create volume directory in production
    if use_disk_cache {
        let tile_dir = Path::new(tile_base.as_ref().unwrap());
        if !tile_dir.exists() {
            fs::create_dir_all(tile_dir).await?;
        }
    }

    let addr: SocketAddr = "0.0.0.0:8080".parse()?;
    let listener = TcpListener::bind(addr).await?;

    info!("🚀 Tile Proxy Server Ready");
    info!("🌍 Listening on       http://{}", addr);
    info!("🧩 Tile route format: /tile/{{z}}/{{x}}/{{y}}");
    info!("📦 Cache capacity:   {} tiles", MAX_TILE_CACHE_CAPACITY);
    info!("⏱  Cache TTL:        1 hour");

    loop {
        let (stream, _) = listener.accept().await?;
        tokio::spawn(handle_connection(stream));
    }
}


async fn handle_connection(stream: tokio::net::TcpStream) {
    if let Err(err) = ServerBuilder::new(TokioExecutor::new())
        .serve_connection(TokioIo::new(stream), service_fn(proxy_handler))
        .await
    {
        eprintln!("Connection error: {}", err);
    }
}

async fn proxy_handler(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, std::io::Error>>, Infallible> {
    let start = Instant::now();
    let path = req.uri().path().to_string();
    let result = actual_proxy_logic(req).await;
    let elapsed = start.elapsed();

    match &result {
        Ok(resp) => {
            info!(%path, status = %resp.status(), elapsed_ms = elapsed.as_millis(), "Served request");
        }
        Err(_) => {
            error!(%path, elapsed_ms = elapsed.as_millis(), "Error serving request");
        }
    }

    result
}

async fn actual_proxy_logic(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, std::io::Error>>, Infallible> {
    let path = req.uri().path();
    let use_disk_cache = get_tile_base_path()
    .as_ref()
    .map(|p| !p.trim().is_empty() && Path::new(p).exists())
    .unwrap_or(false);

    if req.method() != Method::GET || !path.starts_with("/tile/") {
        return Ok(
            with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                .status(StatusCode::BAD_REQUEST)
                .body(full_body("Only GET /tile/* supported"))
                .unwrap(),
        );
    }

    let stripped_path = path.trim_start_matches("/tile/");
    let parts: Vec<&str> = stripped_path.split('/').collect();

    if parts.len() != 3 || parts.iter().any(|p| p.parse::<u32>().is_err()) {
        return Ok(
            with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                .status(StatusCode::BAD_REQUEST)
                .body(full_body("Invalid tile path. Expected format /tile/{z}/{x}/{y}"))
                .unwrap(),
        );
    }

    let z: u32 = parts[0].parse().unwrap();
    let upstream_url = format!(
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{}.jpg",
        stripped_path
    );

    // If Z is between 5-8, try persistent volume
    // Only attempt volume access in production and for zoom levels 5–8
    if let Some(base_path) = get_tile_base_path() {
        if (5..=8).contains(&z) && Path::new(&base_path).exists() {
            let tile_path = format!("{}/{}.jpg", base_path, stripped_path);
            if let Ok(file_bytes) = fs::read(&tile_path).await {
                info!(%path, "📦 Served from volume");
                return Ok(
                    with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                        .status(StatusCode::OK)
                        .header("content-type", "image/jpeg")
                        .body(StreamBody::new(once(Ok(Frame::data(Bytes::from(file_bytes))))).boxed())
                        .unwrap(),
                );
            }
        }
    }

    // If cached in-memory (e.g. for z > 8)
    if let Some(cached_bytes) = TILE_CACHE.get(&upstream_url).await {
        info!(%path, "✅ Served from memory cache");
        return Ok(
            with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                .status(StatusCode::OK)
                .header("content-type", "image/jpeg")
                .body(StreamBody::new(once(Ok(Frame::data(cached_bytes)))).boxed())
                .unwrap(),
        );
    }

    // Fetch from upstream if not cached
    match REQWEST_CLIENT.get(&upstream_url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let status = resp.status();
            let content_type = resp
                .headers()
                .get("content-type")
                .cloned()
                .unwrap_or_else(|| "image/jpeg".parse().unwrap());

            let collected = match resp.bytes().await {
                Ok(b) => b,
                Err(e) => {
                    error!("Failed to read bytes: {}", e);
                    return Ok(
                        with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                            .status(StatusCode::BAD_GATEWAY)
                            .body(full_body("Failed to read tile response"))
                            .unwrap(),
                    );
                }
            };

            if !use_disk_cache || z > 8 {
                TILE_CACHE.insert(upstream_url.clone(), collected.clone()).await;
            }

            info!(%path, "🌐 Fetched from upstream");
            let body = StreamBody::new(once(Ok(Frame::data(collected)))).boxed();

            Ok(
                with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                    .status(status)
                    .header("content-type", content_type)
                    .body(body)
                    .unwrap(),
            )
        }
        Ok(resp) => {
            let status = resp.status();
            Ok(
                with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                    .status(status)
                    .body(full_body(format!("Upstream error: {}", status)))
                    .unwrap(),
            )
        }
        Err(err) => {
            error!("Error fetching tile from upstream: {}", err);
            Ok(
                with_cors_headers(Response::builder(), req.headers().get("origin").and_then(|v| v.to_str().ok()))
                    .status(StatusCode::BAD_GATEWAY)
                    .body(full_body("Failed to fetch tile"))
                    .unwrap(),
            )
        }
    }
}

fn full_body<T: Into<Bytes>>(bytes: T) -> BoxBody<Bytes, std::io::Error> {
    BoxBody::new(Full::new(bytes.into()).map_err(|_: Infallible| {
        std::io::Error::new(std::io::ErrorKind::Other, "infallible error")
    }))
}

fn with_cors_headers(
    builder: hyper::http::response::Builder,
    origin: Option<&str>,
) -> hyper::http::response::Builder {
    const ALLOWED_ORIGINS: &[&str] = &[
        "https://orbitalone.space",
        "https://orbitalone-frontend.vercel.app",
        "http://localhost:5173",
    ];

    if let Some(origin_value) = origin {
        if ALLOWED_ORIGINS.contains(&origin_value) {
            return builder.header("access-control-allow-origin", origin_value);
        }
    }

    builder
}
