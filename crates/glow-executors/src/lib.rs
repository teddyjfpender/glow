//! AI executor integrations for Glow.
//!
//! This crate provides a trait-based abstraction for integrating various AI coding assistants
//! (Claude Code, Codex, Gemini, etc.) into the Glow document editor.
//!
//! # Architecture
//!
//! The system uses a trait-based abstraction pattern:
//!
//! 1. **Core Executor Trait** - [`StandardDocumentExecutor`] defines the interface all AI integrations must implement
//! 2. **Enum Dispatch** - Runtime polymorphism via [`DocumentAgent`] enum
//! 3. **Profile System** - Configuration variants per executor
//! 4. **Log Normalization** - Unified log format via [`NormalizedEntry`]
//! 5. **Approval System** - Permission gating for tool use
//!
//! # Example
//!
//! ```ignore
//! use glow_executors::{DocumentAgent, ClaudeCode, StandardDocumentExecutor};
//!
//! let executor = DocumentAgent::ClaudeCode(ClaudeCode::default());
//! let child = executor.spawn(
//!     current_dir,
//!     "Review this paragraph for clarity",
//!     &env,
//! ).await?;
//! ```

pub mod approvals;
pub mod env;
pub mod error;
pub mod executors;
pub mod logs;
pub mod profile;
pub mod types;

// Re-exports
pub use approvals::{ApprovalStatus, ExecutorApprovalService, NoopApprovalService};
pub use env::{DocumentContext, ExecutionEnv};
pub use error::ExecutorError;
pub use executors::{BaseDocumentAgent, DocumentAgent, StandardDocumentExecutor};
pub use logs::{LogMsg, MsgStore, NormalizedEntry, NormalizedEntryType};
pub use profile::{ExecutorConfig, ExecutorConfigs, ExecutorProfileId};
pub use types::*;
