//! Error types for executor operations.

use thiserror::Error;

/// Errors that can occur during executor operations.
#[derive(Debug, Error)]
pub enum ExecutorError {
    /// Failed to spawn the executor process.
    #[error("failed to spawn executor: {0}")]
    SpawnFailed(String),

    /// Process exited with an error.
    #[error("executor process failed: {0}")]
    ProcessFailed(String),

    /// I/O error during communication.
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    /// JSON parsing/serialization error.
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    /// The executor is not available on this system.
    #[error("executor not available: {0}")]
    NotAvailable(String),

    /// The executor requires setup.
    #[error("executor requires setup: {0}")]
    SetupRequired(String),

    /// Session not found for follow-up.
    #[error("session not found: {0}")]
    SessionNotFound(String),

    /// The executor does not support setup helpers.
    #[error("setup helper not supported")]
    SetupHelperNotSupported,

    /// Approval was denied.
    #[error("approval denied: {0}")]
    ApprovalDenied(String),

    /// Operation timed out.
    #[error("operation timed out")]
    Timeout,

    /// Operation was interrupted.
    #[error("operation interrupted")]
    Interrupted,

    /// Protocol error in communication with the executor.
    #[error("protocol error: {0}")]
    ProtocolError(String),

    /// Configuration error.
    #[error("configuration error: {0}")]
    ConfigError(String),

    /// Generic error with context.
    #[error("{0}")]
    Other(String),
}

impl From<String> for ExecutorError {
    fn from(s: String) -> Self {
        Self::Other(s)
    }
}

impl From<&str> for ExecutorError {
    fn from(s: &str) -> Self {
        Self::Other(s.to_owned())
    }
}
