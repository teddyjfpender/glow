//! Error types for Glow Core.

use thiserror::Error;

/// Result type alias using the Glow error type.
pub type Result<T> = std::result::Result<T, Error>;

/// Errors that can occur in Glow Core operations.
#[derive(Debug, Error)]
pub enum Error {
    /// Document was not found.
    #[error("document not found: {0}")]
    DocumentNotFound(String),

    /// Failed to serialize or deserialize data.
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// CRDT operation failed.
    #[error("crdt error: {0}")]
    Crdt(String),

    /// Invalid document state.
    #[error("invalid document state: {0}")]
    InvalidState(String),

    /// IO operation failed.
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}
