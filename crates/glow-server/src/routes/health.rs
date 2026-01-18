//! Health check endpoints.

use axum::{Json, Router, routing::get};
use serde::Serialize;

use crate::state::AppState;

/// Health check response.
#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

/// Health check handler.
async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "healthy", version: env!("CARGO_PKG_VERSION") })
}

/// Creates health check routes.
pub fn routes() -> Router<AppState> {
    Router::new().route("/health", get(health))
}
