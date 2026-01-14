//! # Glow Desktop
//!
//! Desktop application library for Glow containing Tauri commands and SQLite storage.

pub mod commands;
pub mod error;
pub mod storage;

pub use commands::*;
pub use error::{Error, Result};
pub use storage::SqliteStorage;
