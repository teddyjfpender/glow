//! Approval system for gating tool use.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::error::ExecutorError;

/// Result of an approval request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalStatus {
    /// The tool use was approved.
    Approved,
    /// The tool use was denied.
    Denied { message: String },
    /// The approval request timed out.
    TimedOut,
}

impl ApprovalStatus {
    /// Check if the status is approved.
    #[must_use]
    pub fn is_approved(&self) -> bool {
        matches!(self, Self::Approved)
    }
}

/// Metadata about a tool call being approved.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallMetadata {
    /// Unique identifier for this tool call.
    pub tool_use_id: String,
    /// Name of the tool being used.
    pub tool_name: String,
    /// Input parameters for the tool.
    pub tool_input: serde_json::Value,
}

/// Service for handling tool use approvals.
///
/// Executors can request approval before executing tools that may
/// modify documents or perform sensitive operations.
#[async_trait]
pub trait ExecutorApprovalService: Send + Sync {
    /// Request approval for a tool use.
    ///
    /// # Arguments
    /// * `tool_name` - Name of the tool being used
    /// * `tool_input` - Input parameters for the tool
    /// * `tool_use_id` - Unique identifier for this tool call
    ///
    /// # Returns
    /// The approval status from the user or system
    async fn request_approval(
        &self,
        tool_name: &str,
        tool_input: &serde_json::Value,
        tool_use_id: Option<&str>,
    ) -> Result<ApprovalStatus, ExecutorError>;
}

/// A no-op approval service that automatically approves all requests.
///
/// Use this when approval gating is not needed.
#[derive(Debug, Clone, Default)]
pub struct NoopApprovalService;

#[async_trait]
impl ExecutorApprovalService for NoopApprovalService {
    async fn request_approval(
        &self,
        _tool_name: &str,
        _tool_input: &serde_json::Value,
        _tool_use_id: Option<&str>,
    ) -> Result<ApprovalStatus, ExecutorError> {
        Ok(ApprovalStatus::Approved)
    }
}

/// Wrapper to make approval services cloneable via Arc.
pub type SharedApprovalService = Arc<dyn ExecutorApprovalService>;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_noop_approval_service() {
        let service = NoopApprovalService;
        let result =
            service.request_approval("test_tool", &serde_json::json!({}), Some("id-1")).await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_approved());
    }
}
