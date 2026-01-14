//! # Glow Core
//!
//! Core library for Glow containing shared types, CRDT operations,
//! and document processing logic. This crate is designed to be
//! platform-agnostic and can compile to WebAssembly.

pub mod crdt;
pub mod document;
pub mod error;

pub use crdt::DocumentSync;
pub use document::{Document, DocumentId, DocumentMetadata};
pub use error::{Error, Result};
