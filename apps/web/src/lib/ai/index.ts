/**
 * AI Feedback Module
 *
 * Provides Grammarly-style AI feedback for documents through the comment system.
 *
 * Usage:
 * 1. Users comment with @claude, @codex, @gemini, or @ai followed by their instruction
 * 2. The AI processes the selected text and provides feedback as a reply
 * 3. AI can suggest edits which users can accept or reject
 *
 * Example comments:
 * - "@claude Is this paragraph grammatically correct?"
 * - "@claude Make this more concise"
 * - "@codex Check this code snippet for bugs"
 * - "@ai Rewrite in a professional tone"
 */

// Types
export type {
  AIAgentName,
  AIFeedbackStatus,
  SuggestedEdit,
  AIMetadata,
  AIReply,
  FeedbackRequest,
  FeedbackResponse,
  StreamMessage,
  MentionMatch,
} from './types';

export { detectMention, isAIReply, AI_AGENTS, MENTION_PATTERN } from './types';

// Service
export type { StreamCallbacks, ExecutorStatus, HealthResponse } from './feedback-service';
export { AIFeedbackService, aiFeedbackService } from './feedback-service';

// State
export { aiFeedbackState, addCommentWithAI } from './feedback-state.svelte';

// Edit utilities
export { applyEdit, rejectEdit, applyAllEdits, rejectAllEdits } from './edit-utils';
