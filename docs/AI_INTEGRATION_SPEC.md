# AI Model Integration Architecture Specification

## Overview

The system uses a trait-based abstraction pattern allowing multiple AI backends (Claude Code, Codex, Copilot, Gemini, Opencode, etc.) to be used interchangeably. The key components are:

1. **Core Executor Trait** - Defines the interface all AI integrations must implement
2. **Enum Dispatch** - Runtime polymorphism for executor selection
3. **Profile System** - Configuration variants per executor
4. **Protocol Handlers** - Model-specific communication protocols
5. **Log Normalization** - Unified log format across all models
6. **Approval System** - Permission gating for tool use

---

## 1. Core Trait Interface

**Location:** `crates/executors/src/executors/mod.rs`

```rust
#[async_trait]
#[enum_dispatch(CodingAgent)]
pub trait StandardCodingAgentExecutor {
    // Optional: inject approval service for permission handling
    fn use_approvals(&mut self, approvals: Arc<dyn ExecutorApprovalService>) {}

    // Spawn initial execution with a prompt
    async fn spawn(
        &self,
        current_dir: &Path,
        prompt: &str,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError>;

    // Resume an existing session with a follow-up prompt
    async fn spawn_follow_up(
        &self,
        current_dir: &Path,
        prompt: &str,
        session_id: &str,
        env: &ExecutionEnv,
    ) -> Result<SpawnedChild, ExecutorError>;

    // Transform raw model output into normalized log entries
    fn normalize_logs(&self, msg_store: Arc<MsgStore>, worktree_path: &Path);

    // Path to MCP server configuration
    fn default_mcp_config_path(&self) -> Option<PathBuf>;

    // Setup helper for first-time configuration
    async fn get_setup_helper_action(&self) -> Result<ExecutorAction, ExecutorError> {}

    // Check if executor is available (logged in, installed, etc.)
    fn get_availability_info(&self) -> AvailabilityInfo {}
}
```

**Return type for spawn:**

```rust
pub struct SpawnedChild {
    pub child: AsyncGroupChild,                       // The spawned process
    pub exit_signal: Option<ExecutorExitSignal>,      // Executor → Container signal
    pub interrupt_sender: Option<InterruptSender>,    // Container → Executor interrupt
}
```

---

## 2. Executor Implementations

### A. Claude Code (`crates/executors/src/executors/claude/`)

**Command:** `npx -y @anthropic-ai/claude-code@2.0.76`

**Configuration:**

```rust
pub struct ClaudeCode {
    pub append_prompt: AppendPrompt,              // Text appended to prompts
    pub claude_code_router: Option<bool>,         // Use router variant
    pub plan: Option<bool>,                       // Plan mode (read-only)
    pub approvals: Option<bool>,                  // Enable approval gates
    pub model: Option<String>,                    // Model selection
    pub dangerously_skip_permissions: Option<bool>,
    pub disable_api_key: Option<bool>,
}
```

**Protocol Flow:**

1. Spawn process with `--output-format=stream-json --input-format=stream-json`
2. Create bidirectional `ProtocolPeer` over stdin/stdout
3. Send `Initialize` with hooks configuration
4. Send user message via JSON-RPC
5. Handle control requests (`CanUseTool`, `HookCallback`)
6. Respond with `PermissionResult` (Allow/Deny)
7. Forward content messages to log store

**Control Protocol Messages:**

```rust
pub enum ControlRequest {
    CanUseTool {
        tool_name: String,
        input: Value,
        permission_suggestions: Option<Vec<PermissionUpdate>>,
        tool_use_id: Option<String>,
    },
    HookCallback {
        hook_name: String,
        tool_name: Option<String>,
        tool_input: Option<Value>,
        // ...
    },
}

pub enum PermissionResult {
    Allow {
        updated_input: Value,
        updated_permissions: Option<Vec<PermissionUpdate>>,
    },
    Deny {
        message: String,
        interrupt: Option<bool>,
    },
}
```

---

### B. Codex (`crates/executors/src/executors/codex/`)

**Command:** `npx -y codex-cli`

**Configuration:**

```rust
pub struct Codex {
    pub append_prompt: AppendPrompt,
    pub sandbox: Option<SandboxMode>,           // Auto, ReadOnly, WorkspaceWrite, DangerFullAccess
    pub ask_for_approval: Option<AskForApproval>, // UnlessTrusted, OnFailure, OnRequest, Never
    pub oss: Option<bool>,                      // Use OSS version
    pub model: Option<String>,
    pub model_reasoning_effort: Option<ReasoningEffort>,  // Low/Medium/High/Xhigh
    pub model_reasoning_summary: Option<ReasoningSummary>, // Auto/Concise/Detailed
    pub profile: Option<String>,
    pub base_instructions: Option<String>,
}
```

**Protocol Flow:**

1. Start Codex app server process
2. Establish JSON-RPC 2.0 connection
3. Send `Initialize` request
4. Create or resume conversation
5. Add conversation event listener
6. Send `SendUserMessage` RPC
7. Handle approval requests via `ReviewDecision`
8. Stream conversation events back

**JSON-RPC Types:**

```rust
pub enum CodexRpcRequest {
    Initialize { client_info: ClientInfo },
    CreateConversation { path: PathBuf },
    ResumeConversation { conversation_id: String },
    AddConversationListener { conversation_id: String },
    SendUserMessage { conversation_id: String, message: String },
    AbortConversation { conversation_id: String },
}
```

---

### C. Opencode (`crates/executors/src/executors/opencode/`)

**Command:** `npx -y opencode-ai@1.1.3 serve --hostname 127.0.0.1 --port 0`

**Configuration:**

```rust
pub struct Opencode {
    pub append_prompt: AppendPrompt,
    pub auto_approve: Option<bool>,
    pub mode: Option<String>,                   // Agent mode selection
}
```

**Protocol Flow:**

1. Spawn HTTP server with dynamic port (port 0)
2. Parse server URL from stdout (e.g., "Server listening on http://...")
3. Start session via HTTP POST with prompt
4. Poll/stream responses from HTTP API
5. Handle approval requests if `auto_approve` is false
6. Support session resume with `resume_session_id`

---

### D. Copilot (`crates/executors/src/executors/copilot.rs`)

**Command:** `npx -y @github/copilot@0.0.375 --no-color --log-level debug`

**Key Pattern:** Extracts session ID from log files rather than stdout.

**Configuration:**

```rust
pub struct Copilot {
    pub append_prompt: AppendPrompt,
    pub yolo: Option<bool>,                     // Skip all approvals
    pub allowed_tools: Option<Vec<String>>,
}
```

**Protocol Flow:**

1. Create temporary log directory
2. Spawn with stdin prompt delivery
3. Close stdin to signal end of input
4. Parse session ID from log files via regex
5. Stream stdout/stderr to logs

---

### E. Gemini (`crates/executors/src/executors/gemini.rs`)

**Command:** `npx -y @google/gemini-cli@0.22.5 --experimental-acp`

Uses the ACP (Agent Control Protocol) harness pattern shared with other executors.

---

## 3. Profile & Configuration System

**Location:** `crates/executors/src/profile.rs`

```rust
#[derive(Clone, Serialize, Deserialize)]
pub struct ExecutorProfileId {
    pub executor: BaseCodingAgent,   // ClaudeCode, Codex, Opencode, etc.
    pub variant: Option<String>,     // "DEFAULT", "PLAN", "ROUTER", etc.
}

pub struct ExecutorConfigs {
    pub executors: HashMap<BaseCodingAgent, ExecutorConfig>,
}

pub struct ExecutorConfig {
    pub configurations: HashMap<String, CodingAgent>,  // variant → config
}
```

**Variant Examples:**

- `ClaudeCode::DEFAULT` - Standard Claude Code
- `ClaudeCode::PLAN` - Plan mode (read-only exploration)
- `ClaudeCode::ROUTER` - Uses claude-code-router
- `Codex::WORKSPACE_WRITE` - More permissive sandbox

**Storage:**

- Defaults: Built-in `default_profiles.json`
- User overrides: `~/.vibe-kanban/profiles.json`

---

## 4. Log Normalization

All executors transform raw output into unified `NormalizedEntry`:

```rust
pub struct NormalizedEntry {
    pub timestamp: Option<i64>,
    pub entry_type: NormalizedEntryType,
    pub content: String,
    pub metadata: Option<serde_json::Value>,
}

pub enum NormalizedEntryType {
    UserMessage,
    AssistantMessage,
    ToolCall,
    ToolResult,
    SystemMessage,
    ErrorMessage,
    ThinkingMessage,
    // ... model-specific variants
}
```

**Per-executor parsers:**

- `ClaudeLogProcessor` - JSON streaming format
- `Codex` - JSON-RPC conversation events
- `Opencode` - Plain text with structured mapping
- `Copilot` - Plain text with ANSI stripping

---

## 5. MsgStore & Real-time Streaming

**Location:** `crates/executors/src/msg_store.rs`

```rust
pub struct MsgStore {
    history: Arc<Mutex<Vec<LogMsg>>>,
    sender: broadcast::Sender<Arc<Result<LogMsg>>>,
}

impl MsgStore {
    pub fn push(&self, msg: LogMsg);
    pub fn subscribe(&self) -> broadcast::Receiver<Arc<Result<LogMsg>>>;
    pub fn get_history(&self) -> Vec<LogMsg>;
}
```

**Frontend receives logs via WebSocket:**

```
/api/scratch/{type}/{id}/stream/ws
```

---

## 6. Approval System

**Interface:**

```rust
#[async_trait]
pub trait ExecutorApprovalService: Send + Sync {
    async fn request_approval(
        &self,
        tool_name: &str,
        input: &serde_json::Value,
        tool_use_id: Option<&str>,
    ) -> Result<ApprovalStatus, ExecutorError>;
}

pub enum ApprovalStatus {
    Approved,
    Denied { message: String },
    TimedOut,
}
```

**Flow:**

1. Executor receives `CanUseTool` from model
2. Calls `approval_service.request_approval()`
3. Frontend displays approval UI
4. User clicks Approve/Deny
5. `ApprovalStatus` returned to executor
6. Executor sends `PermissionResult` back to model

---

## 7. MCP Server Configuration

Each executor has its own MCP config path:

| Executor    | Config Path                        |
|-------------|-----------------------------------|
| Claude Code | `~/.claude.json`                  |
| Codex       | `~/.codex/config.toml`            |
| Opencode    | `~/.config/opencode/opencode.json`|
| Copilot     | `~/.copilot/mcp-config.json`      |
| Gemini      | `~/.gemini/settings.json`         |

**MCP Config structure:**

```rust
pub fn get_mcp_config(&self) -> McpConfig {
    McpConfig::new(
        vec!["mcp_servers".to_string()],  // JSON path to servers
        json!({"mcp_servers": {}}),        // Default value
        self.preconfigured_mcp(),          // Built-in servers
        true,                              // requires_auth
    )
}
```

---

## 8. Frontend Integration

**API endpoints:**

```typescript
// Create session with executor
sessionsApi.create({
    workspace_id: UUID,
    executor?: "CLAUDE_CODE" | "CODEX" | "OPENCODE" | ...
})

// Execute follow-up
sessionsApi.followUp(sessionId, {
    prompt: string,
    variant?: string,           // "PLAN", "ROUTER", etc.
    retry_process_id?: UUID,    // Rollback to this point
    force_when_dirty?: boolean
})

// Check if executor is available
configApi.checkAgentAvailability(agent: BaseCodingAgent)
// Returns: AvailabilityInfo { status, last_login?, config_found? }

// Stream logs via WebSocket
const ws = new WebSocket(scratchApi.getStreamUrl("process", processId))
```

---

## 9. Execution Pipeline

```
Frontend (React)
    ↓ POST /api/sessions/:id/follow-up
Backend (Axum routes)
    ↓ execute_follow_up()
Container Service
    ↓ spawn_execution()
Executor.spawn() [trait method]
    ↓ Command::new().group_spawn()
Model Process (npx @anthropic-ai/claude-code ...)
    ↓ JSON/text output
Protocol Handler (stdin/stdout/HTTP)
    ↓ parse messages
Log Normalizer
    ↓ NormalizedEntry
MsgStore.push()
    ↓ broadcast::Sender
WebSocket
    ↓
Frontend (real-time updates)
```

---

## 10. Summary: Implementing a New Executor

To add support for a new AI model:

1. **Create executor struct** in `crates/executors/src/executors/your_model.rs`:

```rust
#[derive(Clone, Serialize, Deserialize)]
pub struct YourModel {
    pub append_prompt: AppendPrompt,
    // model-specific config...
}
```

2. **Implement `StandardCodingAgentExecutor`:**
   - `spawn()` - Launch the CLI/process
   - `spawn_follow_up()` - Resume sessions
   - `normalize_logs()` - Parse output format
   - `default_mcp_config_path()` - Return config location
   - `get_availability_info()` - Check login/install status

3. **Add to `CodingAgent` enum** in `mod.rs`:

```rust
#[enum_dispatch]
pub enum CodingAgent {
    ClaudeCode(ClaudeCode),
    Codex(Codex),
    YourModel(YourModel),  // Add here
}
```

4. **Add to `BaseCodingAgent` enum** for profile selection

5. **Create default profile** in `default_profiles.json`

6. **Add frontend support** for executor selection UI

---

This architecture enables you to integrate any AI coding assistant that can be invoked via CLI, HTTP, or custom protocol, with unified logging, approval gates, and session management.
