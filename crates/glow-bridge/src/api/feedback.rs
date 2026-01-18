//! Feedback API endpoints.

use axum::{
    Json, Router,
    extract::{Path, State, WebSocketUpgrade},
    response::IntoResponse,
    routing::{delete, get, post},
};
use glow_executors::{
    DocumentAgent, FeedbackRequest, FeedbackResponse, FeedbackStatus, StreamMessage,
    executors::ClaudeCode,
};
use serde::Deserialize;
use tracing::{error, info};

use crate::state::{AppState, SessionState};

/// Build the feedback router.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_feedback))
        .route("/{id}", get(get_feedback))
        .route("/{id}", delete(cancel_feedback))
        .route("/{id}/ws", get(feedback_websocket))
}

/// Request body for creating feedback.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFeedbackRequest {
    /// Document ID.
    pub document_id: String,
    /// Full document content.
    pub document_content: String,
    /// Document title (optional).
    pub document_title: Option<String>,
    /// Selected text being commented on.
    pub selected_text: String,
    /// User's instruction.
    pub instruction: String,
    /// Executor to use.
    pub executor: String,
    /// Comment ID to reply to.
    pub comment_id: String,
    /// Session ID for follow-ups.
    pub session_id: Option<String>,
}

/// Create a new feedback request.
async fn create_feedback(
    State(state): State<AppState>,
    Json(req): Json<CreateFeedbackRequest>,
) -> Json<FeedbackResponse> {
    info!(
        document_id = %req.document_id,
        comment_id = %req.comment_id,
        executor = %req.executor,
        "Creating feedback request"
    );

    // Select executor based on request
    let executor = match req.executor.to_lowercase().as_str() {
        "claude" | "claude_code" | "claudecode" => {
            let mut claude = ClaudeCode::default();

            // Set document feedback system prompt
            claude.system_prompt = Some(ClaudeCode::document_feedback_system_prompt());

            DocumentAgent::ClaudeCode(claude)
        }
        _ => {
            // Default to Claude Code
            let mut claude = ClaudeCode::default();
            claude.system_prompt = Some(ClaudeCode::document_feedback_system_prompt());
            DocumentAgent::ClaudeCode(claude)
        }
    };

    // Create session
    let session =
        state.create_session(req.comment_id.clone(), req.document_id.clone(), executor).await;

    let session_id = session.read().await.id.clone();

    // Spawn background task to run the executor
    let session_clone = session.clone();
    let request = FeedbackRequest {
        document_id: req.document_id,
        document_content: req.document_content,
        document_title: req.document_title,
        selected_text: req.selected_text,
        selected_range: glow_executors::TextRange { from: 0, to: 0, quoted_text: String::new() },
        instruction: req.instruction,
        executor: req.executor,
        comment_id: req.comment_id,
        session_id: req.session_id,
    };

    tokio::spawn(async move {
        if let Err(e) = run_feedback_session(session_clone, request).await {
            error!(error = %e, "Feedback session failed");
        }
    });

    Json(FeedbackResponse {
        id: session_id.clone(),
        status: FeedbackStatus::Processing,
        content: None,
        suggested_edits: vec![],
        session_id,
        error: None,
    })
}

/// Run the feedback session with the executor.
async fn run_feedback_session(
    session: std::sync::Arc<tokio::sync::RwLock<crate::state::FeedbackSession>>,
    request: FeedbackRequest,
) -> anyhow::Result<()> {
    use glow_executors::{DocumentContext, ExecutionEnv};

    // Update state to running
    {
        let mut s = session.write().await;
        s.state = SessionState::Running;
    }

    // Build the prompt
    let prompt = build_feedback_prompt(&request);

    // Get working directory (use temp dir)
    let working_dir = std::env::temp_dir();

    // Build execution environment
    let mut doc_context = DocumentContext::new(&request.document_id, &request.document_content)
        .with_working_dir(working_dir.clone());

    if let Some(title) = &request.document_title {
        doc_context.document_title = Some(title.clone());
    }

    let env = ExecutionEnv::from_document(doc_context);

    // Get executor and spawn
    let _executor = session.read().await.executor.clone();
    let msg_store = session.read().await.msg_store.clone();

    info!(prompt_len = prompt.len(), "Spawning executor");

    // Bypass executor spawn and use direct tokio::process::Command for debugging
    use std::process::Stdio;
    use tokio::process::Command;

    let mut cmd = Command::new("npx");
    cmd.arg("-y")
        .arg("@anthropic-ai/claude-code@2.1.7")
        .arg("--output-format=stream-json")
        .arg("--verbose")
        .arg("--include-partial-messages")
        .arg("--permission-mode=bypassPermissions")
        .arg("-p")
        .arg(&prompt)
        .current_dir(&working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        // CI=true disables interactive TTY requirements
        .env("CI", "true");

    env.apply_to_command(&mut cmd);

    match cmd.spawn() {
        Ok(mut child) => {
            info!("Executor spawned successfully, reading output...");

            // With CI=true, Claude Code outputs stream-json to stdout
            // Read stdout and process logs
            if let Some(stdout) = child.stdout.take() {
                use glow_executors::executors::claude::ClaudeLogProcessor;
                use tokio::io::{AsyncBufReadExt, BufReader};

                let mut processor = ClaudeLogProcessor::new(msg_store.clone());
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();

                info!("Starting to read stdout (stream-json output)...");
                let mut line_count = 0;
                while let Ok(Some(line)) = lines.next_line().await {
                    line_count += 1;
                    if line_count <= 5 || line_count % 10 == 0 {
                        info!(line_num = line_count, line_len = line.len(), "Read stdout line");
                    }
                    processor.process_chunk(&line).await;
                    processor.process_chunk("\n").await;
                }
                info!(total_lines = line_count, "Finished reading stdout");

                processor.flush().await;
            } else {
                error!("No stdout available from child process");
            }

            // Drain stderr (error messages go here)
            if let Some(stderr) = child.stderr.take() {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    if !line.is_empty() {
                        error!(stderr_line = %line, "Claude Code stderr");
                    }
                }
            }

            // Wait for process to complete
            let status: Result<std::process::ExitStatus, std::io::Error> = child.wait().await;
            info!(status = ?status, "Executor process completed");

            // Update session state
            let mut s = session.write().await;
            s.state = if status.map(|st| st.success()).unwrap_or(false) {
                SessionState::Completed
            } else {
                SessionState::Failed
            };
        }
        Err(e) => {
            error!(error = %e, "Failed to spawn executor");

            // Update session state
            let mut s = session.write().await;
            s.state = SessionState::Failed;

            // Push error to msg store
            msg_store.push_error(e.to_string()).await;
        }
    }

    Ok(())
}

/// Build the prompt for feedback.
fn build_feedback_prompt(request: &FeedbackRequest) -> String {
    format!(
        r#"DOCUMENT CONTEXT:
Title: {}
Document ID: {}

SELECTED TEXT:
{}

USER INSTRUCTION:
{}

Please analyze the selected text according to the user's instruction and provide helpful feedback. If you have specific text improvements to suggest, use the suggest_edit tool."#,
        request.document_title.as_deref().unwrap_or("Untitled"),
        request.document_id,
        request.selected_text,
        request.instruction
    )
}

/// Get feedback status.
async fn get_feedback(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<FeedbackResponse>, axum::http::StatusCode> {
    let session = state.get_session(&id).await.ok_or(axum::http::StatusCode::NOT_FOUND)?;

    let s = session.read().await;

    let status = match s.state {
        SessionState::Pending => FeedbackStatus::Pending,
        SessionState::Running => FeedbackStatus::Processing,
        SessionState::Completed => FeedbackStatus::Completed,
        SessionState::Failed => FeedbackStatus::Failed,
        SessionState::Cancelled => FeedbackStatus::Failed,
    };

    // Get content from message history
    let history = s.msg_store.get_history().await;
    let content = history
        .iter()
        .filter_map(|msg| {
            if let glow_executors::LogMsg::Entry(entry) = msg {
                if entry.entry_type == glow_executors::NormalizedEntryType::AssistantMessage {
                    return Some(entry.content.clone());
                }
            }
            None
        })
        .collect::<Vec<_>>()
        .join("\n");

    Ok(Json(FeedbackResponse {
        id: s.id.clone(),
        status,
        content: if content.is_empty() { None } else { Some(content) },
        suggested_edits: vec![],
        session_id: s.id.clone(),
        error: None,
    }))
}

/// Cancel a feedback request.
async fn cancel_feedback(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    let session = state.get_session(&id).await.ok_or(axum::http::StatusCode::NOT_FOUND)?;

    {
        let mut s = session.write().await;
        s.state = SessionState::Cancelled;
    }

    // TODO: Actually interrupt the executor process

    Ok(Json(serde_json::json!({ "cancelled": true })))
}

/// WebSocket handler for streaming feedback.
async fn feedback_websocket(
    State(state): State<AppState>,
    Path(id): Path<String>,
    ws: WebSocketUpgrade,
) -> Result<impl IntoResponse, axum::http::StatusCode> {
    let session = state.get_session(&id).await.ok_or(axum::http::StatusCode::NOT_FOUND)?;

    Ok(ws.on_upgrade(move |socket| handle_feedback_socket(socket, session)))
}

/// Handle WebSocket connection for streaming feedback.
async fn handle_feedback_socket(
    mut socket: axum::extract::ws::WebSocket,
    session: std::sync::Arc<tokio::sync::RwLock<crate::state::FeedbackSession>>,
) {
    use axum::extract::ws::Message;

    let msg_store = session.read().await.msg_store.clone();
    let mut rx = msg_store.subscribe();

    // Send existing history
    let history = msg_store.get_history().await;
    for msg in history {
        let stream_msg = log_msg_to_stream_message(&msg);
        let json = serde_json::to_string(&stream_msg).unwrap_or_default();
        if socket.send(Message::Text(json.into())).await.is_err() {
            return;
        }
    }

    // Stream new messages
    loop {
        tokio::select! {
            // Receive from message store
            result = rx.recv() => {
                match result {
                    Ok(msg) => {
                        if let Ok(ref log_msg) = *msg {
                            let stream_msg = log_msg_to_stream_message(log_msg);
                            let json = serde_json::to_string(&stream_msg).unwrap_or_default();
                            if socket.send(Message::Text(json.into())).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
            // Receive from client
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }
}

/// Convert a log message to a stream message.
fn log_msg_to_stream_message(msg: &glow_executors::LogMsg) -> StreamMessage {
    use glow_executors::{LogMsg, NormalizedEntryType};

    match msg {
        LogMsg::Entry(entry) => match entry.entry_type {
            NormalizedEntryType::AssistantMessage => {
                StreamMessage::Chunk { content: entry.content.clone() }
            }
            NormalizedEntryType::ThinkingMessage => {
                StreamMessage::Thinking { content: entry.content.clone() }
            }
            NormalizedEntryType::ErrorMessage => {
                StreamMessage::Error { message: entry.content.clone() }
            }
            _ => StreamMessage::Chunk { content: entry.content.clone() },
        },
        LogMsg::Ended => StreamMessage::Complete,
        LogMsg::Error(e) => StreamMessage::Error { message: e.clone() },
        _ => StreamMessage::Chunk { content: String::new() },
    }
}
