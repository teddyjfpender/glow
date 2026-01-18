//! Health check endpoint.

use axum::{Json, Router, routing::get};
use serde::Serialize;

use crate::state::AppState;

/// Health check response.
#[derive(Serialize)]
pub struct HealthResponse {
    /// Service status.
    pub status: String,
    /// Service version.
    pub version: String,
    /// Available executors.
    pub executors: Vec<ExecutorStatus>,
}

/// Status of an executor.
#[derive(Serialize)]
pub struct ExecutorStatus {
    /// Executor name.
    pub name: String,
    /// Availability status.
    pub available: bool,
}

/// Build the health router.
pub fn router() -> Router<AppState> {
    Router::new().route("/health", get(health_check)).route("/executors", get(list_executors))
}

/// Health check handler.
async fn health_check() -> Json<HealthResponse> {
    use glow_executors::{StandardDocumentExecutor, executors::ClaudeCode};

    let claude_available = matches!(
        ClaudeCode::default().get_availability_info(),
        glow_executors::AvailabilityInfo::Available
            | glow_executors::AvailabilityInfo::InstallationFound
    );

    Json(HealthResponse {
        status: "ok".to_owned(),
        version: env!("CARGO_PKG_VERSION").to_owned(),
        executors: vec![ExecutorStatus {
            name: "CLAUDE_CODE".to_owned(),
            available: claude_available,
        }],
    })
}

/// List available executors.
async fn list_executors() -> Json<Vec<ExecutorStatus>> {
    use glow_executors::{StandardDocumentExecutor, executors::ClaudeCode};

    let claude_available = matches!(
        ClaudeCode::default().get_availability_info(),
        glow_executors::AvailabilityInfo::Available
            | glow_executors::AvailabilityInfo::InstallationFound
    );

    Json(vec![ExecutorStatus { name: "CLAUDE_CODE".to_owned(), available: claude_available }])
}
