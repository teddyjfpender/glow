//! Tauri IPC commands for document operations.

use glow_core::{Document, DocumentId};
use serde::{Deserialize, Serialize};

/// Document response for the frontend.
#[derive(Serialize)]
pub struct DocumentResponse {
    id: String,
    title: String,
    content: String,
    created_at: String,
    modified_at: String,
    version: u64,
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
#[derive(Deserialize)]
pub struct CreateDocumentRequest {
    title: Option<String>,
}

/// Request to update a document.
#[derive(Deserialize)]
pub struct UpdateDocumentRequest {
    title: Option<String>,
    content: Option<String>,
}

/// Gets all documents.
#[tauri::command]
pub async fn get_documents() -> Result<Vec<DocumentResponse>, String> {
    // TODO: Implement with SQLite storage
    Ok(vec![])
}

/// Gets a document by ID.
#[tauri::command]
pub async fn get_document(id: String) -> Result<DocumentResponse, String> {
    // TODO: Implement with SQLite storage
    let _ = id;
    Err("Not implemented".to_string())
}

/// Creates a new document.
#[tauri::command]
pub async fn create_document(request: CreateDocumentRequest) -> Result<DocumentResponse, String> {
    let doc = match request.title {
        Some(title) => Document::with_title(title),
        None => Document::new(),
    };
    // TODO: Save to SQLite storage
    Ok(DocumentResponse::from(&doc))
}

/// Updates an existing document.
#[tauri::command]
pub async fn update_document(
    id: String,
    request: UpdateDocumentRequest,
) -> Result<DocumentResponse, String> {
    // TODO: Implement with SQLite storage
    let _ = (id, request);
    Err("Not implemented".to_string())
}

/// Deletes a document.
#[tauri::command]
pub async fn delete_document(id: String) -> Result<(), String> {
    // TODO: Implement with SQLite storage
    let _ = id;
    Err("Not implemented".to_string())
}
