//! Log processor for Claude Code output.
//!
//! Handles parsing and normalization of Claude Code's JSON streaming output.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::debug;

use crate::logs::{MsgStore, NormalizedEntry, NormalizedEntryType};
use crate::types::SuggestedEdit;

/// Message types from Claude Code's JSON stream output.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClaudeMessage {
    /// System initialization message.
    System {
        #[serde(default)]
        subtype: Option<String>,
        #[serde(default)]
        session_id: Option<String>,
    },
    /// User message.
    User {
        #[serde(default)]
        message: Option<UserMessage>,
    },
    /// Assistant response with nested message structure.
    Assistant {
        message: AssistantMessage,
        #[serde(default)]
        session_id: Option<String>,
    },
    /// Streaming event with partial content.
    StreamEvent {
        event: StreamEventData,
        #[serde(default)]
        session_id: Option<String>,
    },
    /// Final result with completion info.
    Result {
        #[serde(default)]
        subtype: Option<String>,
        #[serde(default)]
        result: Option<String>,
        #[serde(default)]
        session_id: Option<String>,
        #[serde(default)]
        total_cost_usd: Option<f64>,
        #[serde(default)]
        is_error: bool,
    },
    /// Error message.
    Error {
        #[serde(default)]
        message: Option<String>,
        #[serde(default)]
        error: Option<String>,
    },
}

/// Stream event data from Claude Code.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamEventData {
    /// Message start event.
    MessageStart {
        #[serde(default)]
        message: Option<serde_json::Value>,
    },
    /// Content block start.
    ContentBlockStart {
        #[serde(default)]
        index: usize,
        #[serde(default)]
        content_block: Option<ContentBlockInfo>,
    },
    /// Content block delta (streaming text).
    ContentBlockDelta {
        #[serde(default)]
        index: usize,
        delta: DeltaContent,
    },
    /// Content block stop.
    ContentBlockStop {
        #[serde(default)]
        index: usize,
    },
    /// Message delta.
    MessageDelta {
        #[serde(default)]
        delta: Option<serde_json::Value>,
        #[serde(default)]
        usage: Option<serde_json::Value>,
    },
    /// Message stop.
    MessageStop,
}

/// Content block info.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlockInfo {
    Text {
        #[serde(default)]
        text: String,
    },
    Thinking {
        #[serde(default)]
        thinking: String,
    },
    ToolUse {
        #[serde(default)]
        id: String,
        #[serde(default)]
        name: String,
        #[serde(default)]
        input: serde_json::Value,
    },
}

/// Delta content in streaming events.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DeltaContent {
    /// Text delta.
    TextDelta { text: String },
    /// Thinking delta.
    ThinkingDelta { thinking: String },
    /// Input JSON delta (for tool use).
    InputJsonDelta {
        #[serde(default)]
        partial_json: String,
    },
}

/// User message content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserMessage {
    #[serde(default)]
    pub content: Option<String>,
}

/// Assistant message wrapper.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssistantMessage {
    #[serde(default)]
    pub content: Vec<ContentBlock>,
    #[serde(default)]
    pub stop_reason: Option<String>,
}

/// Content block in assistant response.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
    Thinking { thinking: String },
}

/// Processor for Claude Code log output.
pub struct ClaudeLogProcessor {
    msg_store: Arc<MsgStore>,
    buffer: String,
    current_content: String,
    current_thinking: String,
    suggested_edits: Vec<SuggestedEdit>,
    /// Track if we've already sent content via streaming deltas
    has_streamed_content: bool,
}

impl ClaudeLogProcessor {
    /// Create a new log processor.
    #[must_use]
    pub fn new(msg_store: Arc<MsgStore>) -> Self {
        Self {
            msg_store,
            buffer: String::new(),
            current_content: String::new(),
            current_thinking: String::new(),
            suggested_edits: Vec::new(),
            has_streamed_content: false,
        }
    }

    /// Process a chunk of raw output.
    pub async fn process_chunk(&mut self, chunk: &str) {
        self.buffer.push_str(chunk);

        // Process complete lines
        while let Some(newline_pos) = self.buffer.find('\n') {
            let line = self.buffer[..newline_pos].trim().to_owned();
            self.buffer = self.buffer[newline_pos + 1..].to_owned();

            if !line.is_empty() {
                self.process_line(&line).await;
            }
        }
    }

    /// Process a single line of JSON output.
    async fn process_line(&mut self, line: &str) {
        match serde_json::from_str::<ClaudeMessage>(line) {
            Ok(msg) => self.handle_message(msg).await,
            Err(e) => {
                debug!(line = %line, error = %e, "Failed to parse Claude message");
                // Store raw line as fallback
                self.msg_store.push(crate::logs::LogMsg::Raw(line.to_owned())).await;
            }
        }
    }

    /// Handle a parsed Claude message.
    async fn handle_message(&mut self, msg: ClaudeMessage) {
        match msg {
            ClaudeMessage::System { subtype, session_id } => {
                debug!(subtype = ?subtype, session_id = ?session_id, "System message");
                // System init messages are informational, we can skip them
            }

            ClaudeMessage::User { message } => {
                if let Some(m) = message {
                    if let Some(content) = m.content {
                        self.msg_store.push_entry(NormalizedEntry::user_message(content)).await;
                    }
                }
            }

            ClaudeMessage::Assistant { message, .. } => {
                // Process content blocks
                // Skip text/thinking if we've already streamed it via deltas
                for block in message.content {
                    match block {
                        ContentBlock::Text { text } => {
                            if !self.has_streamed_content {
                                self.msg_store
                                    .push_entry(NormalizedEntry::assistant_message(text))
                                    .await;
                            }
                            // else: content was already sent via streaming deltas
                        }
                        ContentBlock::Thinking { thinking } => {
                            if !self.has_streamed_content {
                                self.msg_store
                                    .push_entry(NormalizedEntry::thinking(thinking))
                                    .await;
                            }
                        }
                        ContentBlock::ToolUse { id, name, input } => {
                            // Check if this is a suggest_edit tool
                            if name == "suggest_edit" {
                                if let Ok(edit) = self.parse_suggested_edit(&id, &input) {
                                    self.suggested_edits.push(edit.clone());
                                    self.msg_store
                                        .push_entry(NormalizedEntry {
                                            timestamp: Some(chrono::Utc::now().timestamp_millis()),
                                            entry_type: NormalizedEntryType::SuggestedEdit,
                                            content: serde_json::to_string(&edit)
                                                .unwrap_or_default(),
                                            metadata: Some(input),
                                        })
                                        .await;
                                }
                            } else {
                                self.msg_store
                                    .push_entry(NormalizedEntry::tool_call(name, input))
                                    .await;
                            }
                        }
                    }
                }
            }

            ClaudeMessage::StreamEvent { event, .. } => {
                // Handle streaming events - accumulate deltas
                match event {
                    StreamEventData::ContentBlockDelta { delta, .. } => {
                        // Mark that we're receiving streaming content
                        self.has_streamed_content = true;
                        match delta {
                            DeltaContent::TextDelta { text } => {
                                // Accumulate text for streaming
                                self.current_content.push_str(&text);
                            }
                            DeltaContent::ThinkingDelta { thinking } => {
                                // Accumulate thinking
                                self.current_thinking.push_str(&thinking);
                            }
                            DeltaContent::InputJsonDelta { .. } => {
                                // Tool input JSON - ignore for now
                            }
                        }
                    }
                    StreamEventData::ContentBlockStop { .. } => {
                        // Block finished - flush accumulated content
                        if !self.current_thinking.is_empty() {
                            self.msg_store
                                .push_entry(NormalizedEntry::thinking(std::mem::take(
                                    &mut self.current_thinking,
                                )))
                                .await;
                            self.has_streamed_content = true;
                        }
                        if !self.current_content.is_empty() {
                            self.msg_store
                                .push_entry(NormalizedEntry::assistant_message(std::mem::take(
                                    &mut self.current_content,
                                )))
                                .await;
                            self.has_streamed_content = true;
                        }
                    }
                    _ => {
                        // Other stream events (message_start, message_stop, etc.)
                        // are informational
                    }
                }
            }

            ClaudeMessage::Result { result, session_id, total_cost_usd, is_error, .. } => {
                // Flush any remaining content before ending
                if !self.current_thinking.is_empty() {
                    self.msg_store
                        .push_entry(NormalizedEntry::thinking(std::mem::take(
                            &mut self.current_thinking,
                        )))
                        .await;
                    self.has_streamed_content = true;
                }
                if !self.current_content.is_empty() {
                    self.msg_store
                        .push_entry(NormalizedEntry::assistant_message(std::mem::take(
                            &mut self.current_content,
                        )))
                        .await;
                }

                // If there's a result string and we haven't already sent content, send it
                if let Some(result_text) = result {
                    if !result_text.is_empty() {
                        debug!(result_len = result_text.len(), "Result received");
                    }
                }

                // Mark session as ended
                self.msg_store.push(crate::logs::LogMsg::Ended).await;

                debug!(
                    session_id = ?session_id,
                    total_cost_usd = ?total_cost_usd,
                    is_error = is_error,
                    "Session completed"
                );
            }

            ClaudeMessage::Error { message, error } => {
                let err_msg = message.or(error).unwrap_or_else(|| "Unknown error".to_owned());
                self.msg_store.push_entry(NormalizedEntry::error(err_msg)).await;
            }
        }
    }

    /// Parse a suggested edit from tool input.
    fn parse_suggested_edit(
        &self,
        id: &str,
        input: &serde_json::Value,
    ) -> Result<SuggestedEdit, String> {
        let original_text = input
            .get("original_text")
            .and_then(|v| v.as_str())
            .ok_or("missing original_text")?
            .to_owned();

        let suggested_text = input
            .get("suggested_text")
            .and_then(|v| v.as_str())
            .ok_or("missing suggested_text")?
            .to_owned();

        let explanation =
            input.get("explanation").and_then(|v| v.as_str()).unwrap_or("").to_owned();

        Ok(SuggestedEdit {
            id: id.to_owned(),
            original_text,
            suggested_text,
            explanation,
            range: crate::types::TextRange { from: 0, to: 0, quoted_text: String::new() },
            applied: false,
            rejected: false,
        })
    }

    /// Get all suggested edits collected during processing.
    #[must_use]
    pub fn suggested_edits(&self) -> &[SuggestedEdit] {
        &self.suggested_edits
    }

    /// Flush any remaining buffered content.
    pub async fn flush(&mut self) {
        if !self.buffer.is_empty() {
            let remaining = std::mem::take(&mut self.buffer);
            self.process_line(&remaining).await;
        }

        if !self.current_thinking.is_empty() {
            self.msg_store
                .push_entry(NormalizedEntry::thinking(std::mem::take(&mut self.current_thinking)))
                .await;
        }

        if !self.current_content.is_empty() {
            self.msg_store
                .push_entry(NormalizedEntry::assistant_message(std::mem::take(
                    &mut self.current_content,
                )))
                .await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_process_assistant_message() {
        let store = Arc::new(MsgStore::new());
        let mut processor = ClaudeLogProcessor::new(store.clone());

        // Actual format from claude-code
        let json = r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Hello!"}],"stop_reason":null},"session_id":"test-123"}"#;
        processor.process_chunk(json).await;
        processor.process_chunk("\n").await;

        let history = store.get_history().await;
        assert_eq!(history.len(), 1);
    }

    #[tokio::test]
    async fn test_process_result_message() {
        let store = Arc::new(MsgStore::new());
        let mut processor = ClaudeLogProcessor::new(store.clone());

        let json = r#"{"type":"result","subtype":"success","result":"Done!","session_id":"test-123","total_cost_usd":0.01,"is_error":false}"#;
        processor.process_chunk(json).await;
        processor.process_chunk("\n").await;

        let history = store.get_history().await;
        assert!(history.iter().any(|m| matches!(m, crate::logs::LogMsg::Ended)));
    }

    #[tokio::test]
    async fn test_parse_suggested_edit() {
        let store = Arc::new(MsgStore::new());
        let processor = ClaudeLogProcessor::new(store);

        let input = serde_json::json!({
            "original_text": "Hello world",
            "suggested_text": "Hello, world!",
            "explanation": "Added comma and exclamation"
        });

        let edit = processor.parse_suggested_edit("edit-1", &input).unwrap();
        assert_eq!(edit.original_text, "Hello world");
        assert_eq!(edit.suggested_text, "Hello, world!");
    }
}
