# AI Feedback Feature Design

## Overview

This document describes the Grammarly-style AI feedback feature for Glow, enabling users to get AI-powered writing feedback through the comment system. The feature works by connecting the static web app (hosted on GitHub Pages) to a local executor bridge that invokes AI CLI tools on the user's machine.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Static Web App (GitHub Pages)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │   Editor    │  │   Comment    │  │     AI Feedback Manager         │ │
│  │  (TipTap)   │  │    Panel     │  │  • @mention detection           │ │
│  │             │  │              │  │  • Request formatting           │ │
│  │             │  │              │  │  • Response handling            │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────────────┘ │
│                              │                                           │
│                              ▼ WebSocket/HTTP to localhost               │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Local Bridge Server │
                    │   (localhost:3847)   │
                    │  ┌────────────────┐  │
                    │  │ Bridge API     │  │
                    │  │ • /api/analyze │  │
                    │  │ • /api/stream  │  │
                    │  │ • /ws          │  │
                    │  └────────────────┘  │
                    │  ┌────────────────┐  │
                    │  │ Executor Pool  │  │
                    │  │ • ClaudeCode   │  │
                    │  │ • Codex        │  │
                    │  │ • Gemini       │  │
                    │  └────────────────┘  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   AI CLI Tools       │
                    │ npx @anthropic-ai/   │
                    │     claude-code      │
                    └─────────────────────┘
```

---

## Feature 1: @mention Comment Feedback

### User Flow

1. User selects text in the document
2. User creates a comment with `@claude <instruction>`
3. System detects the @mention and parses the agent name + instruction
4. Request is sent to the local bridge server
5. Bridge spawns the appropriate executor with a structured prompt
6. AI analyzes the selected text + context + instruction
7. Response appears as a reply in the comment thread
8. If AI suggests edits, an "Apply Edit" button appears

### @mention Syntax

```
@claude <instruction>           # Use Claude Code executor
@codex <instruction>            # Use Codex executor
@gemini <instruction>           # Use Gemini executor
@ai <instruction>               # Use default executor
```

### Examples

```
@claude Is this paragraph grammatically correct?
@claude Make this more concise
@claude Rewrite this in a professional tone
@codex Check this code snippet for bugs
```

### Comment Data Model Extension

```typescript
// Extended comment types for AI feedback
interface AIFeedbackComment extends Comment {
  aiMetadata?: {
    agentName: string;                    // 'claude', 'codex', 'gemini', etc.
    instruction: string;                  // The user's instruction
    status: 'pending' | 'processing' | 'completed' | 'failed';
    sessionId?: string;                   // Executor session ID for follow-ups
    suggestedEdits?: SuggestedEdit[];     // Proposed text changes
  };
}

interface SuggestedEdit {
  id: string;
  originalText: string;                   // Text to replace
  suggestedText: string;                  // Replacement text
  range: TextRange;                       // ProseMirror positions
  applied: boolean;                       // Whether edit was applied
  rejected: boolean;                      // Whether edit was rejected
}

interface AIReply extends Reply {
  aiGenerated: boolean;                   // True if from AI
  thinkingContent?: string;               // AI reasoning (collapsed by default)
  suggestedEdits?: SuggestedEdit[];       // Edits suggested in this reply
}
```

---

## Feature 2: Bridge Server Architecture

### Bridge Server (`glow-bridge`)

The bridge server is a local Rust application that:
1. Runs on the user's machine (e.g., `glow-bridge serve`)
2. Exposes HTTP/WebSocket APIs on localhost
3. Manages executor lifecycle (spawn, stream, interrupt)
4. Handles CORS for requests from the static site

### API Endpoints

```
POST   /api/feedback          # Submit feedback request
GET    /api/feedback/:id      # Get feedback status
DELETE /api/feedback/:id      # Cancel feedback request
WS     /ws/feedback/:id       # Stream feedback in real-time

GET    /api/executors         # List available executors
GET    /api/executors/:name   # Check executor availability
POST   /api/executors/:name/setup  # Run executor setup

GET    /api/health            # Health check
```

### Feedback Request Schema

```typescript
interface FeedbackRequest {
  documentId: string;
  documentContent: string;           // Full document for context
  selectedText: string;              // The text being commented on
  selectedRange: TextRange;          // Position in document
  instruction: string;               // User's @mention instruction
  executor: string;                  // 'claude', 'codex', 'gemini', etc.
  commentId: string;                 // ID of the comment thread
  sessionId?: string;                // For follow-up messages
}

interface FeedbackResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  content?: string;                  // AI response text
  suggestedEdits?: SuggestedEdit[];  // Proposed edits
  sessionId: string;                 // For follow-ups
  error?: string;                    // Error message if failed
}
```

### Streaming Protocol

WebSocket messages follow this format:

```typescript
// Server → Client
interface StreamMessage {
  type: 'chunk' | 'edit' | 'thinking' | 'complete' | 'error';
  content?: string;
  edit?: SuggestedEdit;
  thinking?: string;
  error?: string;
}

// Client → Server
interface StreamControl {
  type: 'interrupt' | 'approve' | 'deny';
  toolUseId?: string;       // For approval requests
}
```

---

## Feature 3: Document Feedback Executor

### Custom Executor Configuration

For document feedback, we configure executors with a specialized system prompt:

```rust
pub struct DocumentFeedbackExecutor {
    inner: CodingAgent,                    // Wrapped executor
    system_prompt: String,                 // Document feedback instructions
    document_tools: Vec<DocumentTool>,     // Available document tools
}

pub enum DocumentTool {
    SuggestEdit,      // Propose text replacement
    AddComment,       // Add explanatory comment
    Highlight,        // Highlight problematic text
    FormatText,       // Apply formatting suggestion
}
```

### System Prompt Template

```
You are a document feedback assistant integrated into Glow, a document editor.
Your role is to help users improve their writing based on their instructions.

CONTEXT:
- Document Title: {{document_title}}
- Selected Text: {{selected_text}}
- Surrounding Context: {{context_before}} [SELECTED] {{context_after}}

USER INSTRUCTION: {{instruction}}

AVAILABLE ACTIONS:
1. Provide feedback as a reply in the comment thread
2. Suggest edits using the suggest_edit tool:
   - suggest_edit(original_text, suggested_text, explanation)

GUIDELINES:
- Be concise and actionable
- When suggesting edits, explain why the change improves the text
- Respect the user's writing voice while improving clarity
- Focus on the specific instruction given
- If the instruction is unclear, ask for clarification
```

### Tool Schema for Claude Code

```json
{
  "name": "suggest_edit",
  "description": "Suggest a text edit to improve the document",
  "input_schema": {
    "type": "object",
    "properties": {
      "original_text": {
        "type": "string",
        "description": "The exact text to replace (must match document)"
      },
      "suggested_text": {
        "type": "string",
        "description": "The improved replacement text"
      },
      "explanation": {
        "type": "string",
        "description": "Brief explanation of why this improves the text"
      }
    },
    "required": ["original_text", "suggested_text", "explanation"]
  }
}
```

---

## Feature 4: Frontend Integration

### Comment System Changes

#### CommentInput.svelte Modifications

```typescript
// Detect @mention in comment input
function detectMention(text: string): MentionMatch | null {
  const mentionRegex = /^@(claude|codex|gemini|ai)\s+(.+)$/i;
  const match = text.match(mentionRegex);
  if (match) {
    return {
      agentName: match[1].toLowerCase(),
      instruction: match[2]
    };
  }
  return null;
}

// Handle comment submission with @mention
async function handleSubmit(content: string) {
  const mention = detectMention(content);

  if (mention) {
    // Create comment with AI metadata
    const comment = await commentsState.addComment({
      ...payload,
      content,
      aiMetadata: {
        agentName: mention.agentName,
        instruction: mention.instruction,
        status: 'pending'
      }
    });

    // Send to bridge server
    await aiFeedbackService.requestFeedback({
      documentId: currentDocument.id,
      documentContent: editor.getText(),
      selectedText: payload.textRange.quotedText,
      selectedRange: payload.textRange,
      instruction: mention.instruction,
      executor: mention.agentName,
      commentId: comment.id
    });
  } else {
    // Normal comment flow
    await commentsState.addComment(payload);
  }
}
```

#### AIFeedbackService

```typescript
// lib/ai/feedback-service.ts
export class AIFeedbackService {
  private bridgeUrl = 'http://localhost:3847';
  private ws: WebSocket | null = null;

  async checkBridgeAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.bridgeUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async requestFeedback(request: FeedbackRequest): Promise<string> {
    const response = await fetch(`${this.bridgeUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const { id } = await response.json();
    return id;
  }

  streamFeedback(feedbackId: string, callbacks: StreamCallbacks): void {
    this.ws = new WebSocket(`ws://localhost:3847/ws/feedback/${feedbackId}`);

    this.ws.onmessage = (event) => {
      const message: StreamMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'chunk':
          callbacks.onChunk(message.content!);
          break;
        case 'edit':
          callbacks.onEdit(message.edit!);
          break;
        case 'thinking':
          callbacks.onThinking(message.thinking!);
          break;
        case 'complete':
          callbacks.onComplete();
          break;
        case 'error':
          callbacks.onError(message.error!);
          break;
      }
    };
  }

  interrupt(): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }
}
```

### CommentCard.svelte AI Extensions

```svelte
<!-- Additional UI for AI-generated comments -->
{#if comment.aiMetadata}
  <div class="ai-status">
    {#if comment.aiMetadata.status === 'pending'}
      <span class="status-badge pending">Waiting for AI...</span>
    {:else if comment.aiMetadata.status === 'processing'}
      <span class="status-badge processing">
        <LoadingSpinner size="sm" />
        AI is analyzing...
      </span>
    {:else if comment.aiMetadata.status === 'failed'}
      <span class="status-badge error">AI feedback failed</span>
      <button onclick={retryFeedback}>Retry</button>
    {/if}
  </div>
{/if}

<!-- AI-generated reply with suggested edits -->
{#if reply.aiGenerated}
  <div class="ai-reply">
    <span class="ai-badge">AI</span>
    {#if reply.thinkingContent}
      <details class="thinking-section">
        <summary>View AI reasoning</summary>
        <pre>{reply.thinkingContent}</pre>
      </details>
    {/if}

    <div class="reply-content">{@html formatMarkdown(reply.content)}</div>

    {#if reply.suggestedEdits?.length}
      <div class="suggested-edits">
        <h4>Suggested Edits</h4>
        {#each reply.suggestedEdits as edit}
          <div class="edit-suggestion">
            <div class="diff">
              <del>{edit.originalText}</del>
              <ins>{edit.suggestedText}</ins>
            </div>
            <div class="edit-actions">
              <button onclick={() => applyEdit(edit)}>Apply</button>
              <button onclick={() => rejectEdit(edit)}>Reject</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
```

---

## Feature 5: Edit Application System

### Edit Application Flow

1. User clicks "Apply" on a suggested edit
2. System finds the original text in the document
3. ProseMirror transaction replaces the text
4. Edit is marked as `applied: true`
5. Comment thread shows edit was applied

### ProseMirror Integration

```typescript
// lib/editor/utils/apply-suggested-edit.ts
export function applySuggestedEdit(
  editor: Editor,
  edit: SuggestedEdit
): boolean {
  const { state } = editor;
  const { doc } = state;

  // Find the original text in the document
  let foundPos: { from: number; to: number } | null = null;

  doc.descendants((node, pos) => {
    if (node.isText && node.text?.includes(edit.originalText)) {
      const start = pos + node.text.indexOf(edit.originalText);
      const end = start + edit.originalText.length;
      foundPos = { from: start, to: end };
      return false; // Stop searching
    }
    return true;
  });

  if (!foundPos) {
    // Try using the stored range as fallback
    const textAtRange = doc.textBetween(edit.range.from, edit.range.to);
    if (textAtRange === edit.originalText) {
      foundPos = { from: edit.range.from, to: edit.range.to };
    }
  }

  if (!foundPos) {
    console.error('Could not find original text to replace');
    return false;
  }

  // Apply the replacement
  editor
    .chain()
    .focus()
    .setTextSelection(foundPos)
    .insertContent(edit.suggestedText)
    .run();

  return true;
}
```

---

## Bridge Server Implementation

### Crate Structure

```
crates/glow-bridge/
├── Cargo.toml
├── src/
│   ├── main.rs              # CLI entry point
│   ├── server.rs            # Axum HTTP server
│   ├── ws.rs                # WebSocket handlers
│   ├── api/
│   │   ├── mod.rs
│   │   ├── feedback.rs      # Feedback endpoints
│   │   ├── executors.rs     # Executor management
│   │   └── health.rs        # Health check
│   ├── executor/
│   │   ├── mod.rs
│   │   ├── manager.rs       # Executor pool management
│   │   └── document.rs      # Document feedback wrapper
│   └── types.rs             # Shared types
```

### Server Implementation

```rust
// crates/glow-bridge/src/main.rs
use clap::Parser;

#[derive(Parser)]
#[command(name = "glow-bridge")]
#[command(about = "Local bridge server for Glow AI features")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(clap::Subcommand)]
enum Commands {
    /// Start the bridge server
    Serve {
        #[arg(short, long, default_value = "3847")]
        port: u16,

        #[arg(long, default_value = "localhost")]
        host: String,
    },
    /// Check executor availability
    Check {
        #[arg(short, long)]
        executor: Option<String>,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Serve { port, host } => {
            server::start(&host, port).await;
        }
        Commands::Check { executor } => {
            check::run(executor).await;
        }
    }
}
```

### CORS Configuration

```rust
// CORS must allow requests from GitHub Pages domain
fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin([
            "https://yourusername.github.io".parse().unwrap(),
            "http://localhost:5173".parse().unwrap(), // Dev server
        ])
        .allow_methods([Method::GET, Method::POST, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE])
        .allow_credentials(true)
}
```

---

## User Setup Flow

### First-Time Setup

1. User installs Glow Bridge: `npm install -g @glow/bridge` or `cargo install glow-bridge`
2. User runs: `glow-bridge serve`
3. Bridge checks for available executors (Claude Code, Codex, etc.)
4. Static site detects bridge at localhost:3847
5. AI features become available

### Connection Detection UI

```svelte
<!-- StatusBar.svelte - AI connection indicator -->
<script>
  import { aiFeedbackService } from '$lib/ai/feedback-service';

  let bridgeConnected = $state(false);

  onMount(async () => {
    bridgeConnected = await aiFeedbackService.checkBridgeAvailable();

    // Poll periodically
    setInterval(async () => {
      bridgeConnected = await aiFeedbackService.checkBridgeAvailable();
    }, 10000);
  });
</script>

<div class="ai-status">
  {#if bridgeConnected}
    <span class="connected" title="AI features available">
      <AiIcon /> Connected
    </span>
  {:else}
    <button
      class="disconnected"
      title="Click for setup instructions"
      onclick={showSetupInstructions}
    >
      <AiIcon /> AI Offline
    </button>
  {/if}
</div>
```

---

## Security Considerations

### Local Bridge Security

1. **CORS**: Only allow requests from known origins (your GitHub Pages domain)
2. **No Remote Access**: Bridge only listens on localhost
3. **API Keys**: API keys stay on user's machine, never sent to static site
4. **Sandboxed Execution**: Executors run with minimal permissions

### Content Safety

1. Document content sent to AI respects user privacy
2. No telemetry or logging of document content
3. Users control which documents get analyzed

---

## Implementation Phases

### Phase 1: Bridge Server Foundation
- [ ] Create `glow-bridge` crate
- [ ] Implement HTTP server with health endpoint
- [ ] Add executor availability checking
- [ ] Set up CORS for static site

### Phase 2: Executor Integration
- [ ] Port executor trait from vibe-kanban
- [ ] Implement Claude Code executor
- [ ] Add document feedback system prompt
- [ ] Implement streaming response handler

### Phase 3: Frontend Integration
- [ ] Add @mention detection in comment input
- [ ] Create AIFeedbackService
- [ ] Extend comment types for AI metadata
- [ ] Add AI status indicators to CommentCard

### Phase 4: Edit Suggestions
- [ ] Implement suggest_edit tool parsing
- [ ] Add edit suggestion UI to CommentCard
- [ ] Implement ProseMirror edit application
- [ ] Add undo support for applied edits

### Phase 5: Polish & Testing
- [ ] Setup flow and onboarding
- [ ] Error handling and retry logic
- [ ] Performance optimization
- [ ] End-to-end testing

---

## Future Enhancements (Phase 2: Natural Grammarly-style)

Once the comment-based feedback is working, expand to automatic analysis:

1. **Background Analysis**: Analyze document as user types (debounced)
2. **Inline Highlights**: Show grammar/style issues inline
3. **Quick Fixes**: One-click fixes without comment threads
4. **Writing Score**: Overall document quality metrics
5. **Style Consistency**: Check for consistent terminology/tone
