//! WebSocket sync endpoints for real-time collaboration.

use axum::{
    Router,
    extract::{
        Path, State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::Response,
    routing::get,
};
use glow_core::DocumentSync;
use serde::{Deserialize, Serialize};

use crate::state::AppState;

/// Sync message types.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
enum SyncMessage {
    /// Request sync state vector.
    #[serde(rename = "sync_request")]
    SyncRequest { state_vector: Vec<u8> },

    /// Sync update response.
    #[serde(rename = "sync_response")]
    SyncResponse { update: Vec<u8> },

    /// Apply update from peer.
    #[serde(rename = "update")]
    Update { update: Vec<u8> },

    /// Awareness update (cursor position, etc.).
    #[serde(rename = "awareness")]
    Awareness { client_id: u64, state: Vec<u8> },
}

/// Handle WebSocket upgrade for document sync.
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(_state): State<AppState>,
    Path(_doc_id): Path<String>,
) -> Response {
    ws.on_upgrade(handle_socket)
}

/// Handle individual WebSocket connection.
async fn handle_socket(mut socket: WebSocket) {
    let sync = DocumentSync::new();

    while let Some(msg) = socket.recv().await {
        let Ok(msg) = msg else {
            break;
        };

        if let Message::Text(text) = msg {
            if let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&text) {
                let response = handle_sync_message(&sync, sync_msg);
                if let Some(response) = response {
                    let json = serde_json::to_string(&response).unwrap_or_default();
                    if socket.send(Message::Text(json.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }
}

/// Process a sync message and return optional response.
fn handle_sync_message(sync: &DocumentSync, msg: SyncMessage) -> Option<SyncMessage> {
    match msg {
        SyncMessage::SyncRequest { state_vector } => {
            let update = sync.get_update_from(&state_vector)?;
            Some(SyncMessage::SyncResponse { update })
        }
        SyncMessage::Update { update } => {
            sync.apply_update(&update).ok()?;
            None
        }
        SyncMessage::SyncResponse { update } => {
            sync.apply_update(&update).ok()?;
            None
        }
        SyncMessage::Awareness { .. } => {
            // TODO: Broadcast awareness to other connected clients
            None
        }
    }
}

/// Creates sync routes.
pub fn routes() -> Router<AppState> {
    Router::new().route("/sync/{doc_id}", get(ws_handler))
}
