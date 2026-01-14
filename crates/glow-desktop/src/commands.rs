//! Command handlers for document operations.
//!
//! These functions are designed to be used as Tauri IPC commands.

use glow_core::{Document, DocumentId};
use serde::{Deserialize, Serialize};

use crate::storage::SqliteStorage;
use crate::Result;

/// Document response for the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentResponse {
    /// Document ID.
    pub id: String,
    /// Document title.
    pub title: String,
    /// Document content.
    pub content: String,
    /// Creation timestamp (ISO 8601).
    pub created_at: String,
    /// Last modified timestamp (ISO 8601).
    pub modified_at: String,
    /// Document version.
    pub version: u64,
}

impl From<&Document> for DocumentResponse {
    fn from(doc: &Document) -> Self {
        Self {
            id: doc.id.to_string(),
            title: doc.metadata.title.clone(),
            content: doc.content.clone(),
            created_at: doc.metadata.created_at.to_rfc3339(),
            modified_at: doc.metadata.modified_at.to_rfc3339(),
            version: doc.metadata.version,
        }
    }
}

/// Request to create a document.
#[derive(Debug, Clone, Deserialize)]
pub struct CreateDocumentRequest {
    /// Optional title for the new document.
    pub title: Option<String>,
}

/// Request to update a document.
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDocumentRequest {
    /// New title (if changing).
    pub title: Option<String>,
    /// New content (if changing).
    pub content: Option<String>,
}

/// Gets all documents.
///
/// # Errors
///
/// Returns an error if the database query fails.
pub fn get_documents(storage: &SqliteStorage) -> Result<Vec<DocumentResponse>> {
    let docs = storage.list_documents()?;
    Ok(docs.iter().map(DocumentResponse::from).collect())
}

/// Gets a document by ID.
///
/// # Errors
///
/// Returns an error if the document is not found or the query fails.
pub fn get_document(storage: &SqliteStorage, id: &str) -> Result<DocumentResponse> {
    let uuid = uuid::Uuid::parse_str(id).map_err(|e| crate::Error::InvalidId(e.to_string()))?;
    let doc_id = DocumentId::from_uuid(uuid);
    let doc = storage.get_document(&doc_id)?;
    Ok(DocumentResponse::from(&doc))
}

/// Creates a new document.
///
/// # Errors
///
/// Returns an error if the document cannot be saved.
pub fn create_document(
    storage: &SqliteStorage,
    request: CreateDocumentRequest,
) -> Result<DocumentResponse> {
    let doc = match request.title {
        Some(title) => Document::with_title(title),
        None => Document::new(),
    };
    storage.save_document(&doc)?;
    Ok(DocumentResponse::from(&doc))
}

/// Updates an existing document.
///
/// # Errors
///
/// Returns an error if the document is not found or cannot be saved.
pub fn update_document(
    storage: &SqliteStorage,
    id: &str,
    request: UpdateDocumentRequest,
) -> Result<DocumentResponse> {
    let uuid = uuid::Uuid::parse_str(id).map_err(|e| crate::Error::InvalidId(e.to_string()))?;
    let doc_id = DocumentId::from_uuid(uuid);

    let mut doc = storage.get_document(&doc_id)?;

    if let Some(title) = request.title {
        doc.set_title(title);
    }
    if let Some(content) = request.content {
        doc.set_content(content);
    }

    storage.save_document(&doc)?;
    Ok(DocumentResponse::from(&doc))
}

/// Deletes a document.
///
/// # Errors
///
/// Returns an error if the document is not found or cannot be deleted.
pub fn delete_document(storage: &SqliteStorage, id: &str) -> Result<()> {
    let uuid = uuid::Uuid::parse_str(id).map_err(|e| crate::Error::InvalidId(e.to_string()))?;
    let doc_id = DocumentId::from_uuid(uuid);
    storage.delete_document(&doc_id)
}
