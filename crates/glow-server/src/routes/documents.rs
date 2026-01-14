//! Document CRUD endpoints.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use glow_core::{Document, DocumentId};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::AppState;

/// Request to create a new document.
#[derive(Deserialize)]
pub struct CreateDocumentRequest {
    title: Option<String>,
}

/// Response containing a document.
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

/// List all documents.
async fn list_documents(State(state): State<AppState>) -> Json<Vec<DocumentResponse>> {
    let documents = state.documents.read().await;
    let response: Vec<DocumentResponse> = documents.values().map(DocumentResponse::from).collect();
    Json(response)
}

/// Get a document by ID.
async fn get_document(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<DocumentResponse>, StatusCode> {
    let uuid = Uuid::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let doc_id = DocumentId::from_uuid(uuid);

    let documents = state.documents.read().await;
    documents
        .get(&doc_id)
        .map(|doc| Json(DocumentResponse::from(doc)))
        .ok_or(StatusCode::NOT_FOUND)
}

/// Create a new document.
async fn create_document(
    State(state): State<AppState>,
    Json(request): Json<CreateDocumentRequest>,
) -> (StatusCode, Json<DocumentResponse>) {
    let doc = match request.title {
        Some(title) => Document::with_title(title),
        None => Document::new(),
    };

    let response = DocumentResponse::from(&doc);

    let mut documents = state.documents.write().await;
    documents.insert(doc.id, doc);

    (StatusCode::CREATED, Json(response))
}

/// Request to update a document.
#[derive(Deserialize)]
pub struct UpdateDocumentRequest {
    title: Option<String>,
    content: Option<String>,
}

/// Update a document.
async fn update_document(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<UpdateDocumentRequest>,
) -> Result<Json<DocumentResponse>, StatusCode> {
    let uuid = Uuid::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let doc_id = DocumentId::from_uuid(uuid);

    let mut documents = state.documents.write().await;
    let doc = documents.get_mut(&doc_id).ok_or(StatusCode::NOT_FOUND)?;

    if let Some(title) = request.title {
        doc.set_title(title);
    }
    if let Some(content) = request.content {
        doc.set_content(content);
    }

    Ok(Json(DocumentResponse::from(&*doc)))
}

/// Delete a document.
async fn delete_document(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    let uuid = Uuid::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let doc_id = DocumentId::from_uuid(uuid);

    let mut documents = state.documents.write().await;
    documents
        .remove(&doc_id)
        .map(|_| StatusCode::NO_CONTENT)
        .ok_or(StatusCode::NOT_FOUND)
}

/// Creates document routes.
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/documents", get(list_documents).post(create_document))
        .route(
            "/documents/{id}",
            get(get_document)
                .put(update_document)
                .delete(delete_document),
        )
}
