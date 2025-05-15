# 🗺️ Tile Proxy Rust Service

A high-performance Rust-based proxy server for serving map tiles from upstream sources (e.g., [EOX Sentinel-2 Cloudless](https://s2maps.eu/)), with in-memory caching, validation, logging, and connection pooling.

## 🚀 Features

- Forwards tile requests from `/tile/{z}/{x}/{y}` to EOX CDN
- In-memory LRU cache with TTL (50,000 tiles, 1 hour)
- Path validation and error handling
- Uses `reqwest` with keep-alive pooling
- Logs request path, status, and latency using `tracing`
- Built with `tokio`, `hyper`, `moka`, `once_cell`

## 🔧 Usage

### Run locally

```bash
cargo run
````

The proxy will start on:

```
http://0.0.0.0:8080/tile/{z}/{x}/{y}
```

It expects tile coordinates as URL segments.

### Example

Request a tile:

```
GET http://localhost:8080/tile/4/8/5
```

This proxies to:

```
https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/4/8/5.jpg
```

## 🧱 Dependencies

* [`hyper`](https://crates.io/crates/hyper)
* [`reqwest`](https://crates.io/crates/reqwest)
* [`tokio`](https://crates.io/crates/tokio)
* [`moka`](https://crates.io/crates/moka) (async cache)
* [`tracing`](https://crates.io/crates/tracing) (logging)

## 📁 Folder Structure

```
tile-proxy-rust/
├── src/
│   └── main.rs      # Core tile proxy logic
├── Cargo.toml       # Dependencies
```

## 🔮 Future Enhancements

* Configurable upstream URL and port via env vars
* IP rate limiting
* Optional disk-based cache
* Prometheus metrics endpoint
* Auth header passthrough or verification

---

Built for [OrbitalOne](https://orbitalone.space)
