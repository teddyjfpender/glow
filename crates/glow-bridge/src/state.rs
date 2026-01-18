//! Application state for the bridge server.

use glow_executors::{DocumentAgent, ExecutorConfigs, MsgStore};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// A feedback session in progress.
pub struct FeedbackSession {
    /// Session ID.
    pub id: String,
    /// Comment ID this session is associated with.
    pub comment_id: String,
    /// Document ID being analyzed.
    pub document_id: String,
    /// The executor being used.
    pub executor: DocumentAgent,
    /// Message store for streaming logs.
    pub msg_store: Arc<MsgStore>,
    /// Session state.
    pub state: SessionState,
}

/// State of a feedback session.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionState {
    /// Session is queued for processing.
    Pending,
    /// Session is actively running.
    Running,
    /// Session completed successfully.
    Completed,
    /// Session failed with an error.
    Failed,
    /// Session was cancelled.
    Cancelled,
}

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    /// Active feedback sessions.
    pub sessions: Arc<RwLock<HashMap<String, Arc<RwLock<FeedbackSession>>>>>,
    /// Executor configurations.
    pub executor_configs: Arc<ExecutorConfigs>,
}

impl AppState {
    /// Create a new application state.
    #[must_use]
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            executor_configs: Arc::new(ExecutorConfigs::new()),
        }
    }

    /// Create a new feedback session.
    pub async fn create_session(
        &self,
        comment_id: String,
        document_id: String,
        executor: DocumentAgent,
    ) -> Arc<RwLock<FeedbackSession>> {
        let id = uuid::Uuid::new_v4().to_string();
        let session = Arc::new(RwLock::new(FeedbackSession {
            id: id.clone(),
            comment_id,
            document_id,
            executor,
            msg_store: Arc::new(MsgStore::new()),
            state: SessionState::Pending,
        }));

        self.sessions.write().await.insert(id, session.clone());
        session
    }

    /// Get a session by ID.
    pub async fn get_session(&self, id: &str) -> Option<Arc<RwLock<FeedbackSession>>> {
        self.sessions.read().await.get(id).cloned()
    }

    /// Remove a session by ID.
    pub async fn remove_session(&self, id: &str) -> Option<Arc<RwLock<FeedbackSession>>> {
        self.sessions.write().await.remove(id)
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
