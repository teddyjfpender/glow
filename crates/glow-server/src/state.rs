//! Application state management.

use std::collections::HashMap;
use std::sync::Arc;

use glow_core::{Document, DocumentId};
use tokio::sync::RwLock;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    /// In-memory document storage (will be replaced with database).
    pub documents: Arc<RwLock<HashMap<DocumentId, Document>>>,
}

impl AppState {
    /// Creates a new application state.
    #[must_use]
    pub fn new() -> Self {
        Self {
            documents: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
