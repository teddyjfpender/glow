//! Document types and operations for Glow.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Unique identifier for a document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DocumentId(Uuid);

impl DocumentId {
    /// Creates a new random document ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Creates a document ID from a UUID.
    #[must_use]
    pub const fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Returns the inner UUID.
    #[must_use]
    pub const fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl Default for DocumentId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for DocumentId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Metadata associated with a document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    /// Document title.
    pub title: String,

    /// When the document was created.
    pub created_at: DateTime<Utc>,

    /// When the document was last modified.
    pub modified_at: DateTime<Utc>,

    /// Version number for optimistic concurrency.
    pub version: u64,
}

impl DocumentMetadata {
    /// Creates new metadata with the given title.
    #[must_use]
    pub fn new(title: impl Into<String>) -> Self {
        let now = Utc::now();
        Self { title: title.into(), created_at: now, modified_at: now, version: 1 }
    }

    /// Updates the modified timestamp and increments version.
    pub fn touch(&mut self) {
        self.modified_at = Utc::now();
        self.version += 1;
    }
}

impl Default for DocumentMetadata {
    fn default() -> Self {
        Self::new("Untitled")
    }
}

/// A Glow document containing content and metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    /// Unique identifier.
    pub id: DocumentId,

    /// Document metadata.
    pub metadata: DocumentMetadata,

    /// Markdown content of the document.
    pub content: String,

    /// CRDT state for synchronization (base64 encoded).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crdt_state: Option<Vec<u8>>,
}

impl Document {
    /// Creates a new empty document.
    #[must_use]
    pub fn new() -> Self {
        Self {
            id: DocumentId::new(),
            metadata: DocumentMetadata::default(),
            content: String::new(),
            crdt_state: None,
        }
    }

    /// Creates a new document with the given title.
    #[must_use]
    pub fn with_title(title: impl Into<String>) -> Self {
        Self {
            id: DocumentId::new(),
            metadata: DocumentMetadata::new(title),
            content: String::new(),
            crdt_state: None,
        }
    }

    /// Updates the document content.
    pub fn set_content(&mut self, content: impl Into<String>) {
        self.content = content.into();
        self.metadata.touch();
    }

    /// Updates the document title.
    pub fn set_title(&mut self, title: impl Into<String>) {
        self.metadata.title = title.into();
        self.metadata.touch();
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_creation() {
        let doc = Document::new();
        assert!(doc.content.is_empty());
        assert_eq!(doc.metadata.title, "Untitled");
        assert_eq!(doc.metadata.version, 1);
    }

    #[test]
    fn test_document_with_title() {
        let doc = Document::with_title("My Document");
        assert_eq!(doc.metadata.title, "My Document");
    }

    #[test]
    fn test_set_content_updates_version() {
        let mut doc = Document::new();
        let initial_version = doc.metadata.version;
        doc.set_content("Hello, world!");
        assert_eq!(doc.content, "Hello, world!");
        assert_eq!(doc.metadata.version, initial_version + 1);
    }

    #[test]
    fn test_document_id_display() {
        let id = DocumentId::new();
        let display = format!("{id}");
        assert!(!display.is_empty());
    }
}
