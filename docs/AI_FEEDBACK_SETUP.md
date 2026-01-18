# AI Feedback Setup Guide

This guide explains how to set up and use the AI feedback feature in Glow.

## Overview

The AI feedback feature allows you to get intelligent suggestions on your document content by using `@mention` syntax in comments. When you type `@claude` followed by an instruction, the AI analyzes your selected text and provides feedback directly in the comment thread.

## Architecture

```
┌─────────────────┐     HTTP/WS      ┌──────────────┐     CLI      ┌──────────────┐
│   Glow Web App  │  ◄───────────►   │ glow-bridge  │  ◄────────►  │ Claude Code  │
│   (Svelte)      │  localhost:3847  │   (Rust)     │   stream-json│    CLI       │
└─────────────────┘                  └──────────────┘              └──────────────┘
```

The bridge server:
- Accepts feedback requests from the web app via HTTP
- Spawns Claude Code CLI with streaming JSON output
- Streams responses back via WebSocket
- Handles session management and message normalization

## Prerequisites

1. **Rust toolchain** - Install via [rustup](https://rustup.rs/)
2. **Node.js** (v18+) - Required for Claude Code CLI
3. **Claude Code CLI** - Anthropic's AI coding assistant
   ```bash
   # Verify installation
   npx -y @anthropic-ai/claude-code@2.1.7 --version
   ```

## Quick Start

### 1. Build the Bridge Server

```bash
cd /path/to/glow

# Build release binary
cargo build -p glow-bridge --release
```

### 2. Start the Bridge Server

```bash
# Start with info-level logging
RUST_LOG=info ./target/release/glow-bridge serve
```

You should see:
```
Glow Bridge listening on http://127.0.0.1:3847
API Endpoints:
  POST   /api/feedback          - Submit feedback request
  GET    /api/feedback/:id      - Get feedback status
  DELETE /api/feedback/:id      - Cancel feedback request
  GET    /api/feedback/:id/ws   - WebSocket stream
  GET    /api/executors         - List available executors
  GET    /api/health            - Health check
```

### 3. Start the Web App

In a separate terminal:

```bash
cd apps/web
pnpm dev
```

### 4. Test the Feature

1. Open `http://localhost:5173` in your browser
2. Select text in a document
3. Add a comment: `@claude improve the clarity of this text`
4. Watch for "Claude is thinking..." indicator
5. View the AI response in the comment thread

## Usage

### Comment-Based AI Feedback

1. Select text in your document
2. Click the comment button or use the keyboard shortcut
3. Write a comment starting with an `@mention`:

```
@claude Make this paragraph more concise
@claude Is this grammatically correct?
@claude Suggest improvements for this section
```

### Supported Mentions

| Mention   | Executor    | Description                           |
|-----------|-------------|---------------------------------------|
| `@claude` | Claude Code | Anthropic's Claude - writing & analysis |
| `@codex`  | (planned)   | OpenAI Codex - code-related feedback  |
| `@gemini` | (planned)   | Google Gemini - versatile assistant   |
| `@ai`     | Default     | Uses the default configured executor  |

### AI Response Flow

1. Comment with `@mention` is submitted
2. Status indicator shows "Waiting for AI..."
3. Status changes to "AI is analyzing..."
4. AI response appears as a reply to your comment
5. If the AI suggests edits, they appear with "Apply" and "Reject" buttons

### Applying Suggested Edits

When the AI suggests changes to your text:

1. Review the diff showing original vs. suggested text
2. Read the explanation for why the change was suggested
3. Click **Apply** to accept the edit
4. Click **Reject** to dismiss the suggestion

## Configuration

### Environment Variables

The bridge server respects these environment variables:

| Variable     | Description                  | Default |
|--------------|------------------------------|---------|
| `RUST_LOG`   | Log level (trace/debug/info) | `info`  |

### CORS Configuration

For production deployments, specify allowed origins:

```bash
glow-bridge serve --allowed-origins "https://example.com,https://app.example.com"
```

## Troubleshooting

### Bridge Connection Failed

If you see "Bridge server not available":

1. Ensure the bridge server is running: `./target/release/glow-bridge serve`
2. Check the port is correct (default: 3847)
3. Verify no firewall is blocking localhost connections
4. Check CORS settings allow your frontend origin

### No Response from AI

If "Claude is thinking..." shows indefinitely:

1. Check bridge server logs for errors (`RUST_LOG=debug`)
2. Verify Claude Code is properly authenticated
3. The bridge sets `CI=true` automatically to disable TTY requirements
4. Test Claude Code directly:
   ```bash
   CI=true npx @anthropic-ai/claude-code --output-format=stream-json \
     --verbose --include-partial-messages --permission-mode=bypassPermissions \
     -p "Say hello"
   ```

### Executor Not Found

If Claude Code isn't working:

1. Install: `npm install -g @anthropic-ai/claude-code`
2. Or use npx: `npx -y @anthropic-ai/claude-code@2.1.7 --version`
3. Ensure Node.js v18+ is installed
4. Restart the bridge server

### AI Feedback Failed

If feedback requests fail:

1. Check bridge server logs: `RUST_LOG=info ./target/release/glow-bridge serve`
2. Verify Claude Code credentials are configured
3. Ensure internet connectivity for API calls
4. Check for rate limiting errors

## Technical Details

### Claude Code CLI Flags

The bridge spawns Claude Code with these flags:

| Flag | Purpose |
|------|---------|
| `--output-format=stream-json` | JSON streaming output |
| `--verbose` | Required with stream-json |
| `--include-partial-messages` | Stream chunks as they arrive |
| `--permission-mode=bypassPermissions` | Non-interactive mode |
| `-p <prompt>` | Provide prompt directly |
| `CI=true` (env var) | Disable TTY requirements |

### Message Flow

1. **Request**: Web app POSTs to `/api/feedback`
2. **Spawn**: Bridge spawns Claude Code CLI
3. **Stream**: JSON lines are read from stdout
4. **Parse**: `ClaudeLogProcessor` parses `stream_event` messages
5. **Accumulate**: Text deltas are accumulated
6. **Flush**: Content is pushed to message store on `content_block_stop`
7. **WebSocket**: Messages are streamed to connected clients
8. **Complete**: `result` message marks session as done

## Security Considerations

- The bridge server only listens on localhost by default
- CORS headers restrict which origins can connect
- No credentials are stored by the bridge server
- All AI communication happens through local CLI executors

## Development

### Running Tests

```bash
cargo test -p glow-bridge
cargo test -p glow-executors
```

### API Testing

```bash
# Health check
curl http://127.0.0.1:3847/api/health

# Submit feedback
curl -X POST http://127.0.0.1:3847/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "test",
    "documentContent": "Hello world.",
    "selectedText": "Hello world.",
    "instruction": "Improve this",
    "executor": "claude",
    "commentId": "test-1"
  }'

# Check status (replace UUID with actual session ID)
curl http://127.0.0.1:3847/api/feedback/{session-id}
```

### Adding New Executors

See `crates/glow-executors/src/executors/` for the executor trait and existing implementations.
