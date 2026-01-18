//! Execution environment configuration.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tokio::process::Command;

/// Context about the document being analyzed.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DocumentContext {
    /// Document ID.
    pub document_id: String,
    /// Document title.
    pub document_title: Option<String>,
    /// Full document content.
    pub document_content: String,
    /// Working directory for the executor.
    pub working_dir: PathBuf,
}

impl DocumentContext {
    /// Create a new document context.
    #[must_use]
    pub fn new(document_id: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            document_id: document_id.into(),
            document_content: content.into(),
            ..Default::default()
        }
    }

    /// Set the document title.
    #[must_use]
    pub fn with_title(mut self, title: impl Into<String>) -> Self {
        self.document_title = Some(title.into());
        self
    }

    /// Set the working directory.
    #[must_use]
    pub fn with_working_dir(mut self, dir: impl Into<PathBuf>) -> Self {
        self.working_dir = dir.into();
        self
    }
}

/// Environment variables and context for executor processes.
#[derive(Debug, Clone, Default)]
pub struct ExecutionEnv {
    /// Environment variables to set.
    pub vars: HashMap<String, String>,
    /// Document context.
    pub document_context: DocumentContext,
}

impl ExecutionEnv {
    /// Create a new empty execution environment.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Create from document context.
    #[must_use]
    pub fn from_document(context: DocumentContext) -> Self {
        Self { vars: HashMap::new(), document_context: context }
    }

    /// Insert an environment variable.
    pub fn insert(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.vars.insert(key.into(), value.into());
    }

    /// Merge environment variables from another map.
    /// Incoming values take precedence.
    pub fn merge(&mut self, other: HashMap<String, String>) {
        self.vars.extend(other);
    }

    /// Check if a variable exists.
    #[must_use]
    pub fn contains_key(&self, key: &str) -> bool {
        self.vars.contains_key(key)
    }

    /// Get a variable value.
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&String> {
        self.vars.get(key)
    }

    /// Apply environment variables to a command.
    pub fn apply_to_command(&self, cmd: &mut Command) {
        for (key, value) in &self.vars {
            cmd.env(key, value);
        }
    }

    /// Return a new env with overrides applied.
    #[must_use]
    pub fn with_overrides(mut self, overrides: HashMap<String, String>) -> Self {
        self.merge(overrides);
        self
    }

    /// Get the working directory for this execution.
    #[must_use]
    pub fn working_dir(&self) -> &Path {
        &self.document_context.working_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_context_builder() {
        let ctx = DocumentContext::new("doc-123", "Hello world")
            .with_title("My Document")
            .with_working_dir("/tmp/glow");

        assert_eq!(ctx.document_id, "doc-123");
        assert_eq!(ctx.document_content, "Hello world");
        assert_eq!(ctx.document_title, Some("My Document".to_owned()));
        assert_eq!(ctx.working_dir, PathBuf::from("/tmp/glow"));
    }

    #[test]
    fn test_execution_env_merge() {
        let mut env = ExecutionEnv::new();
        env.insert("KEY1", "value1");
        env.insert("KEY2", "value2");

        let mut overrides = HashMap::new();
        overrides.insert("KEY2".to_owned(), "overridden".to_owned());
        overrides.insert("KEY3".to_owned(), "value3".to_owned());

        env.merge(overrides);

        assert_eq!(env.get("KEY1"), Some(&"value1".to_owned()));
        assert_eq!(env.get("KEY2"), Some(&"overridden".to_owned()));
        assert_eq!(env.get("KEY3"), Some(&"value3".to_owned()));
    }
}
