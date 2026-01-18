//! Executor profile and configuration system.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::executors::{BaseDocumentAgent, DocumentAgent};

/// Identifier for an executor profile.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ExecutorProfileId {
    /// The base executor type.
    pub executor: BaseDocumentAgent,
    /// Optional variant name (e.g., "DEFAULT", "PLAN", "ROUTER").
    pub variant: Option<String>,
}

impl ExecutorProfileId {
    /// Create a new profile ID with the default variant.
    #[must_use]
    pub fn new(executor: BaseDocumentAgent) -> Self {
        Self { executor, variant: None }
    }

    /// Create a profile ID with a specific variant.
    #[must_use]
    pub fn with_variant(executor: BaseDocumentAgent, variant: impl Into<String>) -> Self {
        Self { executor, variant: Some(variant.into()) }
    }

    /// Get the variant name, defaulting to "DEFAULT".
    #[must_use]
    pub fn variant_name(&self) -> &str {
        self.variant.as_deref().unwrap_or("DEFAULT")
    }
}

/// Configuration for a specific executor.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorConfig {
    /// Map of variant names to agent configurations.
    pub configurations: HashMap<String, DocumentAgent>,
}

impl ExecutorConfig {
    /// Create a new executor config with a single default configuration.
    #[must_use]
    pub fn new(default_agent: DocumentAgent) -> Self {
        let mut configurations = HashMap::new();
        configurations.insert("DEFAULT".to_owned(), default_agent);
        Self { configurations }
    }

    /// Add a variant configuration.
    pub fn add_variant(&mut self, name: impl Into<String>, agent: DocumentAgent) {
        self.configurations.insert(name.into(), agent);
    }

    /// Get a configuration by variant name.
    #[must_use]
    pub fn get(&self, variant: &str) -> Option<&DocumentAgent> {
        self.configurations.get(variant)
    }

    /// Get the default configuration.
    #[must_use]
    pub fn get_default(&self) -> Option<&DocumentAgent> {
        self.get("DEFAULT")
    }
}

/// Collection of all executor configurations.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecutorConfigs {
    /// Map of executor types to their configurations.
    pub executors: HashMap<BaseDocumentAgent, ExecutorConfig>,
}

impl ExecutorConfigs {
    /// Create a new empty configuration collection.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Load configurations from a file.
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or parsed.
    pub fn load_from_file(path: &PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let configs: Self = serde_json::from_str(&content)?;
        Ok(configs)
    }

    /// Get the default configuration directory.
    #[must_use]
    pub fn default_config_dir() -> Option<PathBuf> {
        dirs::config_dir().map(|p| p.join("glow"))
    }

    /// Get the user profiles file path.
    #[must_use]
    pub fn user_profiles_path() -> Option<PathBuf> {
        Self::default_config_dir().map(|p| p.join("profiles.json"))
    }

    /// Add an executor configuration.
    pub fn add(&mut self, executor: BaseDocumentAgent, config: ExecutorConfig) {
        self.executors.insert(executor, config);
    }

    /// Get an executor configuration.
    #[must_use]
    pub fn get(&self, executor: &BaseDocumentAgent) -> Option<&ExecutorConfig> {
        self.executors.get(executor)
    }

    /// Get a specific agent by profile ID.
    #[must_use]
    pub fn get_agent(&self, profile: &ExecutorProfileId) -> Option<&DocumentAgent> {
        self.get(&profile.executor).and_then(|config| config.get(profile.variant_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_id() {
        let id = ExecutorProfileId::new(BaseDocumentAgent::ClaudeCode);
        assert_eq!(id.variant_name(), "DEFAULT");

        let id = ExecutorProfileId::with_variant(BaseDocumentAgent::ClaudeCode, "PLAN");
        assert_eq!(id.variant_name(), "PLAN");
    }
}
