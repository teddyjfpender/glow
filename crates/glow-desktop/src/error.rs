//! Error types for the desktop application.

use thiserror::Error;

/// Result type alias for desktop operations.
pub type Result<T> = std::result::Result<T, Error>;

/// Errors that can occur in desktop operations.
#[derive(Debug, Error)]
pub enum Error {
    /// Document or resource not found.
    #[error("not found: {0}")]
    NotFound(String),

    /// Invalid ID format.
    #[error("invalid ID: {0}")]
    InvalidId(String),

    /// Database operation failed.
    #[error("database error: {0}")]
    Database(String),

    /// SQLite error.
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    /// Core library error.
    #[error("core error: {0}")]
    Core(#[from] glow_core::Error),
}
