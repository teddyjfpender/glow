//! API routes for the bridge server.

mod feedback;
mod health;

use axum::Router;

use crate::state::AppState;

/// Build the API router.
pub fn router() -> Router<AppState> {
    Router::new().nest("/feedback", feedback::router()).merge(health::router())
}
