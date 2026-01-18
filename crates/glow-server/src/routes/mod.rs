//! Route definitions for the Glow server.

mod documents;
mod health;
mod sync;

use axum::Router;

use crate::state::AppState;

/// Creates the API routes.
pub fn api_routes() -> Router<AppState> {
    Router::new().merge(health::routes()).merge(documents::routes())
}

/// Creates the WebSocket routes.
pub fn ws_routes() -> Router<AppState> {
    sync::routes()
}
