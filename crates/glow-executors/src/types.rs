//! Core types shared across executors.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Text range in a document (ProseMirror positions).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TextRange {
    /// Start position (0-indexed).
    pub from: usize,
    /// End position (exclusive).
    pub to: usize,
    /// The quoted text at this range.
    pub quoted_text: String,
}

/// A suggested text edit from the AI.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct SuggestedEdit {
    /// Unique identifier for this edit.
    pub id: String,
    /// The original text to replace.
    pub original_text: String,
    /// The suggested replacement text.
    pub suggested_text: String,
    /// Explanation of why this edit improves the text.
    pub explanation: String,
    /// Position range in the document.
    pub range: TextRange,
    /// Whether this edit has been applied.
    pub applied: bool,
    /// Whether this edit was rejected by the user.
    pub rejected: bool,
}

/// Request for AI feedback on document content.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackRequest {
    /// Document ID being analyzed.
    pub document_id: String,
    /// Full document content for context.
    pub document_content: String,
    /// Document title.
    pub document_title: Option<String>,
    /// The selected text being commented on.
    pub selected_text: String,
    /// Position of the selected text.
    pub selected_range: TextRange,
    /// User's instruction/question.
    pub instruction: String,
    /// Executor to use ('claude', 'codex', 'gemini', etc.).
    pub executor: String,
    /// Comment ID to reply to.
    pub comment_id: String,
    /// Session ID for follow-up messages.
    pub session_id: Option<String>,
}

/// Response from AI feedback analysis.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackResponse {
    /// Unique identifier for this feedback.
    pub id: String,
    /// Current status.
    pub status: FeedbackStatus,
    /// AI response content.
    pub content: Option<String>,
    /// Suggested edits.
    pub suggested_edits: Vec<SuggestedEdit>,
    /// Session ID for follow-ups.
    pub session_id: String,
    /// Error message if failed.
    pub error: Option<String>,
}

/// Status of a feedback request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum FeedbackStatus {
    /// Request is queued.
    Pending,
    /// AI is processing.
    Processing,
    /// Feedback complete.
    Completed,
    /// Request failed.
    Failed,
}

/// Streaming message from the executor.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamMessage {
    /// Text chunk from the AI.
    Chunk { content: String },
    /// Suggested edit.
    Edit { edit: SuggestedEdit },
    /// AI thinking/reasoning (usually collapsed).
    Thinking { content: String },
    /// Stream completed successfully.
    Complete,
    /// An error occurred.
    Error { message: String },
}

/// Control message from the client.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamControl {
    /// Interrupt the current operation.
    Interrupt,
    /// Approve a tool use request.
    Approve { tool_use_id: String },
    /// Deny a tool use request.
    Deny { tool_use_id: String, message: String },
}

/// Availability information for an executor.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum AvailabilityInfo {
    /// Executor is available and ready.
    Available,
    /// Installation found but not logged in.
    InstallationFound,
    /// Executor not found on this system.
    NotFound,
    /// Executor is unavailable for another reason.
    Unavailable { reason: String },
}

/// Action to help user set up an executor.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SetupAction {
    /// Human-readable description.
    pub description: String,
    /// Command to run (if applicable).
    pub command: Option<String>,
    /// URL to visit (if applicable).
    pub url: Option<String>,
}

/// Prompt configuration for document feedback.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct AppendPrompt {
    /// Text to prepend to the prompt.
    pub prepend: Option<String>,
    /// Text to append to the prompt.
    pub append: Option<String>,
}

impl AppendPrompt {
    /// Apply prepend/append to a prompt.
    #[must_use]
    pub fn apply(&self, prompt: &str) -> String {
        let mut result = String::new();
        if let Some(prepend) = &self.prepend {
            result.push_str(prepend);
            result.push('\n');
        }
        result.push_str(prompt);
        if let Some(append) = &self.append {
            result.push('\n');
            result.push_str(append);
        }
        result
    }
}
