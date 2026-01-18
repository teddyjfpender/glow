//! Executor implementations for various AI backends.
//!
//! This module provides the core trait [`StandardDocumentExecutor`] and
//! the [`DocumentAgent`] enum for runtime polymorphism.

pub mod claude;

use async_trait::async_trait;
use command_group::AsyncGroupChild;
use enum_dispatch::enum_dispatch;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use strum::{Display, EnumDiscriminants, EnumString, VariantNames};
use tokio::sync::mpsc;
use ts_rs::TS;

use crate::approvals::ExecutorApprovalService;
use crate::env::ExecutionEnv;
use crate::error::ExecutorError;
use crate::logs::MsgStore;
use crate::types::{AvailabilityInfo, SetupAction};

// Re-export executor implementations
pub use claude::ClaudeCode;

/// Signal to indicate executor has completed.
pub type ExecutorExitSignal = mpsc::Receiver<Result<(), ExecutorError>>;

/// Sender to interrupt an executor.
pub type InterruptSender = mpsc::Sender<()>;

/// Result of spawning an executor process.
pub struct SpawnedChild {
    /// The spawned process.
    pub child: AsyncGroupChild,
    /// Signal sent when the executor exits.
    pub exit_signal: Option<ExecutorExitSignal>,
    /// Channel to send interrupt signals.
    pub interrupt_sender: Option<InterruptSender>,
}

/// The core trait that all document AI executors must implement.
///
/// This trait defines the interface for integrating AI backends (Claude Code,
/// Codex, Gemini, etc.) into the Glow document editor.
#[async_trait]
#[enum_dispatch(DocumentAgent)]
pub trait StandardDocumentExecutor {
    /// Optionally inject an approval service for permission handling.
    ///
    /// This is called before spawning to set up approval callbacks.
    fn use_approvals(&mut self, _approvals: Arc<dyn ExecutorApprovalService>) {}

    /// Spawn initial execution with a prompt.
    ///
    /// # Arguments
    /// * `current_dir` - Working directory for the executor
    /// * `prompt` - The user's request/instruction
    /// * `env` - Execution environment with document context
    ///
    /// # Returns
    /// A spawned child process with communication channels
    async fn spawn(
        &self,
        current_dir: &Path,
        prompt: &str,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError>;

    /// Resume an existing session with a follow-up prompt.
    ///
    /// # Arguments
    /// * `current_dir` - Working directory for the executor
    /// * `prompt` - The follow-up message
    /// * `session_id` - ID of the session to resume
    /// * `env` - Execution environment
    async fn spawn_follow_up(
        &self,
        current_dir: &Path,
        prompt: &str,
        session_id: &str,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError>;

    /// Spawn for document review/feedback.
    ///
    /// Default implementation delegates to spawn or spawn_follow_up.
    async fn spawn_review(
        &self,
        current_dir: &Path,
        prompt: &str,
        session_id: Option<&str>,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError> {
        match session_id {
            Some(id) => self.spawn_follow_up(current_dir, prompt, id, env).await,
            None => self.spawn(current_dir, prompt, env).await,
        }
    }

    /// Transform raw model output into normalized log entries.
    ///
    /// Implementations should parse the executor's output format and push
    /// normalized entries to the message store.
    fn normalize_logs(&self, msg_store: Arc<MsgStore>, worktree_path: &Path);

    /// Path to MCP server configuration for this executor.
    fn default_mcp_config_path(&self) -> Option<PathBuf>;

    /// Get a setup helper action if the executor needs configuration.
    ///
    /// Returns instructions to help the user set up the executor.
    async fn get_setup_helper_action(&self) -> Result<SetupAction, ExecutorError> {
        Err(ExecutorError::SetupHelperNotSupported)
    }

    /// Check if this executor is available on the system.
    ///
    /// Checks for installation, login status, API keys, etc.
    fn get_availability_info(&self) -> AvailabilityInfo {
        let config_found =
            self.default_mcp_config_path().map(|path| path.exists()).unwrap_or(false);

        if config_found { AvailabilityInfo::InstallationFound } else { AvailabilityInfo::NotFound }
    }
}

/// Enum of all supported document AI agents.
///
/// Uses `enum_dispatch` for efficient runtime polymorphism without
/// dynamic dispatch overhead.
#[enum_dispatch]
#[derive(
    Debug, Clone, Serialize, Deserialize, PartialEq, Display, EnumDiscriminants, VariantNames,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[strum_discriminants(
    name(BaseDocumentAgent),
    derive(EnumString, Hash, Display, Serialize, Deserialize, TS),
    strum(serialize_all = "SCREAMING_SNAKE_CASE"),
    serde(rename_all = "SCREAMING_SNAKE_CASE"),
    ts(export)
)]
pub enum DocumentAgent {
    /// Anthropic's Claude Code CLI.
    ClaudeCode(ClaudeCode),
    // Future executors:
    // Codex(Codex),
    // Gemini(Gemini),
    // Opencode(Opencode),
    // Copilot(Copilot),
}

impl DocumentAgent {
    /// Get the base agent type.
    #[must_use]
    pub fn base_agent(&self) -> BaseDocumentAgent {
        match self {
            Self::ClaudeCode(_) => BaseDocumentAgent::ClaudeCode,
        }
    }

    /// Get the display name for this agent.
    #[must_use]
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::ClaudeCode(_) => "Claude Code",
        }
    }
}

impl Default for DocumentAgent {
    fn default() -> Self {
        Self::ClaudeCode(ClaudeCode::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_agent_display() {
        let agent = DocumentAgent::ClaudeCode(ClaudeCode::default());
        assert_eq!(agent.display_name(), "Claude Code");
        assert_eq!(agent.base_agent(), BaseDocumentAgent::ClaudeCode);
    }

    #[test]
    fn test_base_agent_from_string() {
        let agent: BaseDocumentAgent = "CLAUDE_CODE".parse().unwrap();
        assert_eq!(agent, BaseDocumentAgent::ClaudeCode);
    }
}
