//! Log management and normalization.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::broadcast;

/// Type of a normalized log entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NormalizedEntryType {
    /// Message from the user.
    UserMessage,
    /// Response from the AI assistant.
    AssistantMessage,
    /// AI tool invocation.
    ToolCall,
    /// Result from a tool invocation.
    ToolResult,
    /// System message (instructions, context).
    SystemMessage,
    /// Error message.
    ErrorMessage,
    /// AI thinking/reasoning (often hidden).
    ThinkingMessage,
    /// Suggested edit to document.
    SuggestedEdit,
    /// Progress update.
    Progress,
    /// Unknown/other entry type.
    Unknown,
}

/// A normalized log entry from any executor.
///
/// All executors transform their raw output into this unified format,
/// enabling consistent display and processing regardless of the AI backend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedEntry {
    /// Timestamp when this entry was created.
    pub timestamp: Option<i64>,
    /// Type of entry.
    pub entry_type: NormalizedEntryType,
    /// The content of the entry.
    pub content: String,
    /// Additional metadata (tool names, token counts, etc.).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

impl NormalizedEntry {
    /// Create a new user message entry.
    #[must_use]
    pub fn user_message(content: impl Into<String>) -> Self {
        Self {
            timestamp: Some(chrono::Utc::now().timestamp_millis()),
            entry_type: NormalizedEntryType::UserMessage,
            content: content.into(),
            metadata: None,
        }
    }

    /// Create a new assistant message entry.
    #[must_use]
    pub fn assistant_message(content: impl Into<String>) -> Self {
        Self {
            timestamp: Some(chrono::Utc::now().timestamp_millis()),
            entry_type: NormalizedEntryType::AssistantMessage,
            content: content.into(),
            metadata: None,
        }
    }

    /// Create a new thinking entry.
    #[must_use]
    pub fn thinking(content: impl Into<String>) -> Self {
        Self {
            timestamp: Some(chrono::Utc::now().timestamp_millis()),
            entry_type: NormalizedEntryType::ThinkingMessage,
            content: content.into(),
            metadata: None,
        }
    }

    /// Create a new tool call entry.
    #[must_use]
    pub fn tool_call(tool_name: impl Into<String>, input: serde_json::Value) -> Self {
        Self {
            timestamp: Some(chrono::Utc::now().timestamp_millis()),
            entry_type: NormalizedEntryType::ToolCall,
            content: tool_name.into(),
            metadata: Some(input),
        }
    }

    /// Create a new error entry.
    #[must_use]
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            timestamp: Some(chrono::Utc::now().timestamp_millis()),
            entry_type: NormalizedEntryType::ErrorMessage,
            content: message.into(),
            metadata: None,
        }
    }

    /// Add metadata to this entry.
    #[must_use]
    pub fn with_metadata(mut self, metadata: serde_json::Value) -> Self {
        self.metadata = Some(metadata);
        self
    }
}

/// A log message that can be sent through the message store.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogMsg {
    /// A normalized entry.
    Entry(NormalizedEntry),
    /// Raw text output (before normalization).
    Raw(String),
    /// Stream started.
    Started,
    /// Stream ended.
    Ended,
    /// An error occurred.
    Error(String),
}

/// Message store for real-time log streaming.
///
/// Provides both history access and pub/sub for streaming updates
/// to the frontend via WebSocket.
pub struct MsgStore {
    history: Arc<Mutex<Vec<LogMsg>>>,
    sender: broadcast::Sender<Arc<Result<LogMsg, String>>>,
}

impl MsgStore {
    /// Create a new message store.
    #[must_use]
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(256);
        Self { history: Arc::new(Mutex::new(Vec::new())), sender }
    }

    /// Push a message to the store and broadcast to subscribers.
    pub async fn push(&self, msg: LogMsg) {
        let mut history = self.history.lock().await;
        history.push(msg.clone());
        drop(history);

        // Broadcast to subscribers (ignore errors if no subscribers)
        let _ = self.sender.send(Arc::new(Ok(msg)));
    }

    /// Push a normalized entry.
    pub async fn push_entry(&self, entry: NormalizedEntry) {
        self.push(LogMsg::Entry(entry)).await;
    }

    /// Push an error message.
    pub async fn push_error(&self, error: impl Into<String>) {
        self.push(LogMsg::Error(error.into())).await;
    }

    /// Subscribe to receive new messages.
    #[must_use]
    pub fn subscribe(&self) -> broadcast::Receiver<Arc<Result<LogMsg, String>>> {
        self.sender.subscribe()
    }

    /// Get the message history.
    pub async fn get_history(&self) -> Vec<LogMsg> {
        self.history.lock().await.clone()
    }

    /// Clear the history.
    pub async fn clear(&self) {
        self.history.lock().await.clear();
    }
}

impl Default for MsgStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalized_entry_builders() {
        let user_msg = NormalizedEntry::user_message("Hello");
        assert_eq!(user_msg.entry_type, NormalizedEntryType::UserMessage);
        assert_eq!(user_msg.content, "Hello");

        let assistant_msg = NormalizedEntry::assistant_message("Hi there!")
            .with_metadata(serde_json::json!({"tokens": 5}));
        assert_eq!(assistant_msg.entry_type, NormalizedEntryType::AssistantMessage);
        assert!(assistant_msg.metadata.is_some());
    }

    #[tokio::test]
    async fn test_msg_store_push_and_history() {
        let store = MsgStore::new();

        store.push(LogMsg::Started).await;
        store.push_entry(NormalizedEntry::user_message("Test")).await;
        store.push(LogMsg::Ended).await;

        let history = store.get_history().await;
        assert_eq!(history.len(), 3);
    }

    #[tokio::test]
    async fn test_msg_store_subscribe() {
        let store = MsgStore::new();
        let mut rx = store.subscribe();

        store.push(LogMsg::Started).await;

        let msg = rx.recv().await.unwrap();
        assert!(matches!(*msg, Ok(LogMsg::Started)));
    }
}
