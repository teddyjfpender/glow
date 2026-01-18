//! Claude Code executor implementation.
//!
//! This module provides integration with Anthropic's Claude Code CLI tool
//! for AI-powered document feedback and editing suggestions.

mod log_processor;
mod protocol;

use async_trait::async_trait;
use command_group::AsyncCommandGroup;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tokio::process::Command;
use tracing::{debug, info};

use crate::approvals::ExecutorApprovalService;
use crate::env::ExecutionEnv;
use crate::error::ExecutorError;
use crate::logs::MsgStore;
use crate::types::{AppendPrompt, AvailabilityInfo, SetupAction};

use super::{InterruptSender, SpawnedChild, StandardDocumentExecutor};

pub use log_processor::ClaudeLogProcessor;

/// Version of Claude Code to use.
const CLAUDE_CODE_VERSION: &str = "2.1.7";

/// Claude Code executor configuration.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct ClaudeCode {
    /// Text to prepend/append to prompts.
    #[serde(default)]
    pub append_prompt: AppendPrompt,

    /// Use the Claude Code router variant.
    #[serde(default)]
    pub claude_code_router: Option<bool>,

    /// Enable plan mode (read-only exploration).
    #[serde(default)]
    pub plan: Option<bool>,

    /// Enable approval gates for tool use.
    #[serde(default)]
    pub approvals: Option<bool>,

    /// Model selection (e.g., "claude-sonnet-4-20250514").
    #[serde(default)]
    pub model: Option<String>,

    /// Skip permission checks (use with caution).
    #[serde(default)]
    pub dangerously_skip_permissions: Option<bool>,

    /// Disable API key usage.
    #[serde(default)]
    pub disable_api_key: Option<bool>,

    /// Custom system prompt for document feedback.
    #[serde(default)]
    pub system_prompt: Option<String>,
}

impl ClaudeCode {
    /// Create a new Claude Code executor with default settings.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the model to use.
    #[must_use]
    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = Some(model.into());
        self
    }

    /// Enable plan mode.
    #[must_use]
    pub fn with_plan_mode(mut self) -> Self {
        self.plan = Some(true);
        self
    }

    /// Set a custom system prompt.
    #[must_use]
    pub fn with_system_prompt(mut self, prompt: impl Into<String>) -> Self {
        self.system_prompt = Some(prompt.into());
        self
    }

    /// Build the command to spawn Claude Code.
    fn build_command(&self, prompt: &str, session_id: Option<&str>) -> Command {
        let mut cmd = Command::new("npx");

        // Base arguments
        cmd.arg("-y");
        cmd.arg(format!("@anthropic-ai/claude-code@{}", CLAUDE_CODE_VERSION));

        // Output format for structured communication
        cmd.arg("--output-format=stream-json");
        cmd.arg("--verbose"); // Required when using -p with stream-json
        cmd.arg("--include-partial-messages"); // Stream chunks as they arrive

        // Permission mode - bypass for non-interactive use
        cmd.arg("--permission-mode=bypassPermissions");

        // Model selection
        if let Some(model) = &self.model {
            cmd.arg(format!("--model={model}"));
        }

        // Session resume
        if let Some(id) = session_id {
            cmd.arg(format!("--resume={id}"));
        }

        // Apply system prompt if provided
        if let Some(system) = &self.system_prompt {
            cmd.arg(format!("--system-prompt={system}"));
        }

        // Pass prompt as command line argument
        cmd.arg("-p");
        cmd.arg(prompt);

        debug!(
            prompt_len = prompt.len(),
            session_id = ?session_id,
            "Building Claude Code command"
        );

        cmd
    }

    /// Get the default system prompt for document feedback.
    #[must_use]
    pub fn document_feedback_system_prompt() -> String {
        r#"You are a document feedback assistant integrated into Glow, a document editor.
Your role is to help users improve their writing based on their instructions.

When providing feedback:
1. Be concise and actionable
2. Focus on the specific instruction given
3. Respect the user's writing voice while improving clarity

When suggesting edits, use the suggest_edit tool with:
- original_text: The exact text to replace (must match document)
- suggested_text: The improved replacement text
- explanation: Brief explanation of why this improves the text

If the instruction is unclear, ask for clarification rather than guessing."#
            .to_owned()
    }
}

#[async_trait]
impl StandardDocumentExecutor for ClaudeCode {
    fn use_approvals(&mut self, _approvals: Arc<dyn ExecutorApprovalService>) {
        self.approvals = Some(true);
    }

    async fn spawn(
        &self,
        current_dir: &Path,
        prompt: &str,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError> {
        info!(
            current_dir = %current_dir.display(),
            prompt_len = prompt.len(),
            "Spawning Claude Code executor"
        );

        let final_prompt = self.append_prompt.apply(prompt);
        let mut cmd = self.build_command(&final_prompt, None);

        cmd.current_dir(current_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        env.apply_to_command(&mut cmd);

        let child = cmd.group_spawn().map_err(|e| ExecutorError::SpawnFailed(e.to_string()))?;

        // Create interrupt channel
        let (interrupt_tx, _interrupt_rx): (InterruptSender, _) = tokio::sync::mpsc::channel(1);

        Ok(SpawnedChild { child, exit_signal: None, interrupt_sender: Some(interrupt_tx) })
    }

    async fn spawn_follow_up(
        &self,
        current_dir: &Path,
        prompt: &str,
        session_id: &str,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError> {
        info!(
            current_dir = %current_dir.display(),
            session_id = %session_id,
            "Spawning Claude Code follow-up"
        );

        let final_prompt = self.append_prompt.apply(prompt);
        let mut cmd = self.build_command(&final_prompt, Some(session_id));

        cmd.current_dir(current_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        env.apply_to_command(&mut cmd);

        let child = cmd.group_spawn().map_err(|e| ExecutorError::SpawnFailed(e.to_string()))?;

        let (interrupt_tx, _interrupt_rx): (InterruptSender, _) = tokio::sync::mpsc::channel(1);

        Ok(SpawnedChild { child, exit_signal: None, interrupt_sender: Some(interrupt_tx) })
    }

    fn normalize_logs(&self, _msg_store: Arc<MsgStore>, _worktree_path: &Path) {
        // Log normalization is handled by ClaudeLogProcessor
        // This is called to set up the processing pipeline
        debug!("Setting up log normalization for Claude Code");
    }

    fn default_mcp_config_path(&self) -> Option<PathBuf> {
        dirs::home_dir().map(|p| p.join(".claude.json"))
    }

    async fn get_setup_helper_action(&self) -> Result<SetupAction, ExecutorError> {
        Ok(SetupAction {
            description: "Install and authenticate Claude Code CLI".to_owned(),
            command: Some("npx -y @anthropic-ai/claude-code --help".to_owned()),
            url: Some("https://docs.anthropic.com/en/docs/claude-code".to_owned()),
        })
    }

    fn get_availability_info(&self) -> AvailabilityInfo {
        // Check if Claude Code is available
        let config_path = self.default_mcp_config_path();

        if let Some(path) = config_path {
            if path.exists() {
                return AvailabilityInfo::Available;
            }
        }

        // Check if npx is available
        match std::process::Command::new("npx").arg("--version").output() {
            Ok(output) if output.status.success() => AvailabilityInfo::InstallationFound,
            _ => AvailabilityInfo::NotFound,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claude_code_builder() {
        let executor = ClaudeCode::new().with_model("claude-sonnet-4-20250514").with_plan_mode();

        assert_eq!(executor.model, Some("claude-sonnet-4-20250514".to_owned()));
        assert_eq!(executor.plan, Some(true));
    }

    #[test]
    fn test_default_system_prompt() {
        let prompt = ClaudeCode::document_feedback_system_prompt();
        assert!(prompt.contains("document feedback assistant"));
        assert!(prompt.contains("suggest_edit"));
    }

    #[test]
    fn test_default_mcp_config_path() {
        let executor = ClaudeCode::new();
        let path = executor.default_mcp_config_path();
        assert!(path.is_some());
        assert!(path.unwrap().ends_with(".claude.json"));
    }
}
