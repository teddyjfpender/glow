//! Protocol types for Claude Code communication.
//!
//! Defines the JSON-RPC-like protocol used to communicate with Claude Code
//! via stdin/stdout when using stream-json format.

use serde::{Deserialize, Serialize};

/// Request sent to Claude Code via stdin.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClaudeRequest {
    /// Initialize the session.
    Initialize {
        /// Protocol version.
        #[serde(default = "default_protocol_version")]
        protocol_version: String,
        /// Client information.
        #[serde(default)]
        client_info: Option<ClientInfo>,
    },
    /// Send a user message.
    UserMessage {
        /// The message content.
        content: String,
    },
    /// Respond to a permission/approval request.
    PermissionResponse {
        /// The tool use ID being responded to.
        tool_use_id: String,
        /// The response.
        response: PermissionResult,
    },
    /// Interrupt the current operation.
    Interrupt,
}

fn default_protocol_version() -> String {
    "1.0".to_owned()
}

/// Client information for initialization.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ClientInfo {
    /// Client name.
    pub name: String,
    /// Client version.
    pub version: String,
}

/// Control requests from Claude Code requiring a response.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ControlRequest {
    /// Request permission to use a tool.
    CanUseTool {
        /// Name of the tool.
        tool_name: String,
        /// Input parameters.
        input: serde_json::Value,
        /// Suggested permission updates.
        #[serde(default)]
        permission_suggestions: Option<Vec<PermissionUpdate>>,
        /// Tool use ID for response correlation.
        tool_use_id: Option<String>,
    },
    /// Hook callback.
    HookCallback {
        /// Name of the hook.
        hook_name: String,
        /// Tool name (if tool-related).
        #[serde(default)]
        tool_name: Option<String>,
        /// Tool input (if tool-related).
        #[serde(default)]
        tool_input: Option<serde_json::Value>,
    },
}

/// Permission update suggestion.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionUpdate {
    /// Permission name.
    pub permission: String,
    /// New value.
    pub value: serde_json::Value,
}

/// Result of a permission request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "result", rename_all = "snake_case")]
pub enum PermissionResult {
    /// Permission granted.
    Allow {
        /// Updated input (may be modified).
        #[serde(default)]
        updated_input: Option<serde_json::Value>,
        /// Updated permissions.
        #[serde(default)]
        updated_permissions: Option<Vec<PermissionUpdate>>,
    },
    /// Permission denied.
    Deny {
        /// Reason for denial.
        message: String,
        /// Whether to interrupt the session.
        #[serde(default)]
        interrupt: Option<bool>,
    },
}

impl PermissionResult {
    /// Create an allow result.
    #[must_use]
    pub fn allow() -> Self {
        Self::Allow { updated_input: None, updated_permissions: None }
    }

    /// Create a deny result.
    #[must_use]
    pub fn deny(message: impl Into<String>) -> Self {
        Self::Deny { message: message.into(), interrupt: None }
    }

    /// Create a deny result that also interrupts.
    #[must_use]
    pub fn deny_and_interrupt(message: impl Into<String>) -> Self {
        Self::Deny { message: message.into(), interrupt: Some(true) }
    }
}

/// Protocol peer for bidirectional communication.
pub struct ProtocolPeer<R, W> {
    reader: R,
    writer: W,
}

impl<R, W> ProtocolPeer<R, W>
where
    R: tokio::io::AsyncBufRead + Unpin,
    W: tokio::io::AsyncWrite + Unpin,
{
    /// Create a new protocol peer.
    pub fn new(reader: R, writer: W) -> Self {
        Self { reader, writer }
    }

    /// Send a request to Claude Code.
    pub async fn send(&mut self, request: &ClaudeRequest) -> std::io::Result<()> {
        use tokio::io::AsyncWriteExt;

        let json = serde_json::to_string(request)?;
        self.writer.write_all(json.as_bytes()).await?;
        self.writer.write_all(b"\n").await?;
        self.writer.flush().await?;
        Ok(())
    }

    /// Receive the next line from Claude Code.
    pub async fn recv_line(&mut self) -> std::io::Result<Option<String>> {
        use tokio::io::AsyncBufReadExt;

        let mut line = String::new();
        let n = self.reader.read_line(&mut line).await?;
        if n == 0 {
            return Ok(None);
        }
        Ok(Some(line))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_initialize() {
        let req = ClaudeRequest::Initialize {
            protocol_version: "1.0".to_owned(),
            client_info: Some(ClientInfo { name: "glow".to_owned(), version: "0.1.0".to_owned() }),
        };

        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("initialize"));
        assert!(json.contains("glow"));
    }

    #[test]
    fn test_serialize_user_message() {
        let req = ClaudeRequest::UserMessage { content: "Hello".to_owned() };

        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("user_message"));
        assert!(json.contains("Hello"));
    }

    #[test]
    fn test_permission_result() {
        let allow = PermissionResult::allow();
        assert!(matches!(allow, PermissionResult::Allow { .. }));

        let deny = PermissionResult::deny("Not allowed");
        assert!(matches!(deny, PermissionResult::Deny { message, .. } if message == "Not allowed"));

        let deny_interrupt = PermissionResult::deny_and_interrupt("Critical error");
        assert!(matches!(deny_interrupt, PermissionResult::Deny { interrupt: Some(true), .. }));
    }
}
