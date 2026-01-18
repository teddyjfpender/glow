//! HTTP server setup and configuration.

use axum::Router;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::api;
use crate::state::AppState;

/// Start the bridge server.
pub async fn start(host: &str, port: u16, allowed_origins: &[String]) -> anyhow::Result<()> {
    let state = AppState::new();

    // Build CORS layer
    let cors = build_cors_layer(allowed_origins);

    // Build router
    let app = Router::new()
        .nest("/api", api::router())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Parse address
    let addr: SocketAddr = format!("{host}:{port}").parse()?;

    info!("Glow Bridge listening on http://{}", addr);
    info!("Allowed origins: {:?}", allowed_origins);
    info!("");
    info!("API Endpoints:");
    info!("  POST   /api/feedback          - Submit feedback request");
    info!("  GET    /api/feedback/:id      - Get feedback status");
    info!("  DELETE /api/feedback/:id      - Cancel feedback request");
    info!("  GET    /api/feedback/:id/ws   - WebSocket stream");
    info!("  GET    /api/executors         - List available executors");
    info!("  GET    /api/health            - Health check");

    // Start server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Build CORS layer from allowed origins.
fn build_cors_layer(allowed_origins: &[String]) -> CorsLayer {
    use axum::http::{Method, header};

    if allowed_origins.is_empty() || allowed_origins.iter().any(|o| o == "*") {
        // Allow any origin (development mode)
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
            .allow_credentials(false)
    } else {
        // Parse specific origins
        let origins: Vec<_> = allowed_origins.iter().filter_map(|o| o.parse().ok()).collect();

        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
            .allow_credentials(true)
    }
}
