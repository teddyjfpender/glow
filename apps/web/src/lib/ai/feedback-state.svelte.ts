/**
 * AI Feedback State Management
 * Handles AI feedback requests and integrates with the comment system
 */

import { browser } from '$app/environment';
import type {
  AIMetadata,
  AIFeedbackStatus,
  SuggestedEdit,
  FeedbackRequest,
  MentionMatch,
} from './types';
import { detectMention } from './types';
import { aiFeedbackService } from './feedback-service';
import { commentsState } from '$lib/state/comments.svelte';
import { documentState } from '$lib/state/document.svelte';
import type { Comment, CommentId, Author } from '$lib/comments/types';
import { DEFAULT_BRIDGE_URL, detectPlatform, type Platform } from './bridge-config';

const BRIDGE_URL_STORAGE_KEY = 'glow-bridge-url';

/** AI feedback for a specific comment */
interface CommentAIFeedback {
  /** Comment ID */
  commentId: CommentId;
  /** Feedback session ID from the bridge */
  feedbackId: string | null;
  /** AI metadata */
  metadata: AIMetadata;
  /** Accumulated response content */
  responseContent: string;
  /** Thinking content (usually hidden) */
  thinkingContent: string;
  /** Collected suggested edits */
  suggestedEdits: SuggestedEdit[];
  /** Cleanup function for WebSocket */
  cleanup: (() => void) | null;
}

/** Bridge connection status */
export type BridgeConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

/** Internal state */
interface AIFeedbackStateData {
  /** Map of comment ID to AI feedback */
  feedbackByComment: Map<CommentId, CommentAIFeedback>;
  /** Whether the bridge is connected */
  bridgeConnected: boolean;
  /** Last bridge check time */
  lastBridgeCheck: number | null;
  /** Bridge connection status (more detailed) */
  bridgeStatus: BridgeConnectionStatus;
  /** Configured bridge URL */
  bridgeUrl: string;
  /** Detected platform */
  detectedPlatform: Platform;
}

function createAIFeedbackState() {
  // Load bridge URL from localStorage if available
  const storedBridgeUrl = browser ? localStorage.getItem(BRIDGE_URL_STORAGE_KEY) : null;

  let state = $state<AIFeedbackStateData>({
    feedbackByComment: new Map(),
    bridgeConnected: false,
    lastBridgeCheck: null,
    bridgeStatus: 'unknown',
    bridgeUrl: storedBridgeUrl || DEFAULT_BRIDGE_URL,
    detectedPlatform: browser ? detectPlatform() : 'unknown',
  });

  // Derived values
  let hasPendingFeedback = $derived(
    Array.from(state.feedbackByComment.values()).some(
      (f) => f.metadata.status === 'pending' || f.metadata.status === 'processing',
    ),
  );

  /**
   * Check if the bridge server is available.
   */
  async function checkBridgeConnection(): Promise<boolean> {
    state.bridgeStatus = 'checking';

    // Update the service with the current URL
    aiFeedbackService.setBridgeUrl(state.bridgeUrl);

    const connected = await aiFeedbackService.checkBridgeAvailable();
    state.bridgeConnected = connected;
    state.bridgeStatus = connected ? 'connected' : 'disconnected';
    state.lastBridgeCheck = Date.now();
    return connected;
  }

  /**
   * Set the bridge server URL.
   */
  function setBridgeUrl(url: string): void {
    state.bridgeUrl = url;
    state.bridgeStatus = 'unknown';
    state.bridgeConnected = false;

    // Persist to localStorage
    if (browser) {
      localStorage.setItem(BRIDGE_URL_STORAGE_KEY, url);
    }

    // Update the service
    aiFeedbackService.setBridgeUrl(url);
  }

  /**
   * Reset bridge URL to default.
   */
  function resetBridgeUrl(): void {
    setBridgeUrl(DEFAULT_BRIDGE_URL);

    // Remove from localStorage to use default
    if (browser) {
      localStorage.removeItem(BRIDGE_URL_STORAGE_KEY);
    }
  }

  /**
   * Get feedback for a comment.
   */
  function getFeedback(commentId: CommentId): CommentAIFeedback | undefined {
    return state.feedbackByComment.get(commentId);
  }

  /**
   * Check if a comment has AI feedback.
   */
  function hasAIFeedback(commentId: CommentId): boolean {
    return state.feedbackByComment.has(commentId);
  }

  /**
   * Get the AI status for a comment.
   */
  function getStatus(commentId: CommentId): AIFeedbackStatus | null {
    const feedback = state.feedbackByComment.get(commentId);
    return feedback?.metadata.status ?? null;
  }

  /**
   * Process a comment with an @mention and request AI feedback.
   */
  async function processComment(
    comment: Comment,
    mention: MentionMatch,
    author: Author,
  ): Promise<void> {
    const commentId = comment.id;

    console.log('[AI Feedback] processComment started', { commentId, mention });

    // Initialize feedback state
    const feedback: CommentAIFeedback = {
      commentId,
      feedbackId: null,
      metadata: {
        agentName: mention.agentName,
        instruction: mention.instruction,
        status: 'pending',
      },
      responseContent: '',
      thinkingContent: '',
      suggestedEdits: [],
      cleanup: null,
    };

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, feedback);
    state.feedbackByComment = newMap;

    console.log('[AI Feedback] Feedback state initialized, status: pending');

    // Check bridge connection
    if (!state.bridgeConnected) {
      console.log('[AI Feedback] Checking bridge connection...');
      const connected = await checkBridgeConnection();
      console.log('[AI Feedback] Bridge connected:', connected);
      if (!connected) {
        updateFeedbackStatus(
          commentId,
          'failed',
          'Bridge server not available. Please run glow-bridge serve.',
        );
        return;
      }
    }

    // Build the request
    const request: FeedbackRequest = {
      documentId: comment.documentId,
      documentContent: documentState.content || '',
      documentTitle: documentState.title || undefined,
      selectedText: comment.textRange.quotedText,
      selectedRange: comment.textRange,
      instruction: mention.instruction,
      executor: mention.agentName === 'ai' ? 'claude' : mention.agentName,
      commentId: comment.id,
    };

    console.log('[AI Feedback] Sending request to bridge', {
      executor: request.executor,
      instruction: request.instruction,
      selectedText: request.selectedText.substring(0, 50) + '...',
    });

    try {
      // Submit the request
      const feedbackId = await aiFeedbackService.requestFeedback(request);

      console.log('[AI Feedback] Got feedback ID:', feedbackId);

      // Update with feedback ID
      const updatedFeedback = { ...feedback, feedbackId };
      const newMap = new Map(state.feedbackByComment);
      newMap.set(commentId, updatedFeedback);
      state.feedbackByComment = newMap;

      // Start streaming
      streamFeedback(commentId, feedbackId, author);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AI Feedback] Request failed:', message);
      updateFeedbackStatus(commentId, 'failed', message);
    }
  }

  /**
   * Stream feedback results from the bridge.
   */
  function streamFeedback(commentId: CommentId, feedbackId: string, author: Author): void {
    const cleanup = aiFeedbackService.streamFeedback(feedbackId, {
      onChunk: (content) => {
        appendContent(commentId, content);
      },
      onEdit: (edit) => {
        addSuggestedEdit(commentId, edit);
      },
      onThinking: (content) => {
        appendThinking(commentId, content);
      },
      onComplete: () => {
        finishFeedback(commentId, author);
      },
      onError: (message) => {
        updateFeedbackStatus(commentId, 'failed', message);
      },
    });

    // Store cleanup function
    const feedback = state.feedbackByComment.get(commentId);
    if (feedback) {
      const newMap = new Map(state.feedbackByComment);
      newMap.set(commentId, { ...feedback, cleanup });
      state.feedbackByComment = newMap;
    }

    // Update status to processing
    updateFeedbackStatus(commentId, 'processing');
  }

  /**
   * Update feedback status.
   */
  function updateFeedbackStatus(
    commentId: CommentId,
    status: AIFeedbackStatus,
    error?: string,
  ): void {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, {
      ...feedback,
      metadata: {
        ...feedback.metadata,
        status,
        error,
      },
    });
    state.feedbackByComment = newMap;
  }

  /**
   * Append content to the response.
   */
  function appendContent(commentId: CommentId, content: string): void {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, {
      ...feedback,
      responseContent: feedback.responseContent + content,
    });
    state.feedbackByComment = newMap;
  }

  /**
   * Append thinking content.
   */
  function appendThinking(commentId: CommentId, content: string): void {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, {
      ...feedback,
      thinkingContent: feedback.thinkingContent + content,
    });
    state.feedbackByComment = newMap;
  }

  /**
   * Add a suggested edit.
   */
  function addSuggestedEdit(commentId: CommentId, edit: SuggestedEdit): void {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, {
      ...feedback,
      suggestedEdits: [...feedback.suggestedEdits, edit],
    });
    state.feedbackByComment = newMap;
  }

  /**
   * Finish feedback and add reply to comment.
   */
  async function finishFeedback(commentId: CommentId, author: Author): Promise<void> {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    // Update status to completed
    updateFeedbackStatus(commentId, 'completed');

    // Add the AI response as a reply to the comment
    if (feedback.responseContent.trim()) {
      const aiAuthor: Author = {
        id: `ai-${feedback.metadata.agentName}`,
        name: `AI (${feedback.metadata.agentName})`,
        initials: 'AI',
      };

      await commentsState.addReply({
        commentId,
        content: feedback.responseContent,
        author: aiAuthor,
      });
    }

    // Clean up WebSocket
    if (feedback.cleanup) {
      feedback.cleanup();
    }
  }

  /**
   * Cancel feedback for a comment.
   */
  async function cancelFeedback(commentId: CommentId): Promise<void> {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    // Clean up WebSocket
    if (feedback.cleanup) {
      feedback.cleanup();
    }

    // Cancel on the bridge
    if (feedback.feedbackId) {
      try {
        await aiFeedbackService.cancelFeedback(feedback.feedbackId);
      } catch {
        // Ignore errors
      }
    }

    // Remove from state
    const newMap = new Map(state.feedbackByComment);
    newMap.delete(commentId);
    state.feedbackByComment = newMap;
  }

  /**
   * Mark a suggested edit as applied.
   */
  function markEditApplied(commentId: CommentId, editId: string): void {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, {
      ...feedback,
      suggestedEdits: feedback.suggestedEdits.map((edit) =>
        edit.id === editId ? { ...edit, applied: true } : edit,
      ),
    });
    state.feedbackByComment = newMap;
  }

  /**
   * Mark a suggested edit as rejected.
   */
  function markEditRejected(commentId: CommentId, editId: string): void {
    const feedback = state.feedbackByComment.get(commentId);
    if (!feedback) return;

    const newMap = new Map(state.feedbackByComment);
    newMap.set(commentId, {
      ...feedback,
      suggestedEdits: feedback.suggestedEdits.map((edit) =>
        edit.id === editId ? { ...edit, rejected: true } : edit,
      ),
    });
    state.feedbackByComment = newMap;
  }

  /**
   * Reset all feedback state.
   */
  function reset(): void {
    // Clean up all WebSockets
    for (const feedback of state.feedbackByComment.values()) {
      if (feedback.cleanup) {
        feedback.cleanup();
      }
    }

    state.feedbackByComment = new Map();
    state.bridgeConnected = false;
    state.lastBridgeCheck = null;
  }

  return {
    // State getters
    get feedbackByComment() {
      return state.feedbackByComment;
    },
    get bridgeConnected() {
      return state.bridgeConnected;
    },
    get bridgeStatus() {
      return state.bridgeStatus;
    },
    get bridgeUrl() {
      return state.bridgeUrl;
    },
    get detectedPlatform() {
      return state.detectedPlatform;
    },
    get lastBridgeCheck() {
      return state.lastBridgeCheck;
    },
    get hasPendingFeedback() {
      return hasPendingFeedback;
    },
    // Actions
    checkBridgeConnection,
    setBridgeUrl,
    resetBridgeUrl,
    getFeedback,
    hasAIFeedback,
    getStatus,
    processComment,
    cancelFeedback,
    markEditApplied,
    markEditRejected,
    reset,
  };
}

export const aiFeedbackState = createAIFeedbackState();

/**
 * Helper function to handle comment submission with @mention detection.
 * Call this instead of commentsState.addComment when you want AI integration.
 */
export async function addCommentWithAI(
  payload: Parameters<typeof commentsState.addComment>[0],
  author: Author,
): Promise<Comment | null> {
  // Check for @mention
  const mention = detectMention(payload.content);

  console.log('[AI Feedback] addCommentWithAI called', {
    content: payload.content,
    mention,
    hasMention: mention !== null,
  });

  // Add the comment normally
  const comment = await commentsState.addComment(payload);

  if (!comment) {
    console.log('[AI Feedback] Failed to create comment');
    return null;
  }

  console.log('[AI Feedback] Comment created', { commentId: comment.id });

  // If there's an @mention, process it
  if (mention) {
    console.log('[AI Feedback] Processing @mention', {
      agent: mention.agentName,
      instruction: mention.instruction,
    });
    await aiFeedbackState.processComment(comment, mention, author);
  }

  return comment;
}
