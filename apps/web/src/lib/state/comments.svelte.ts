/**
 * Comments State Management
 * Reactive state using Svelte 5 runes
 */

import type {
  Comment,
  CommentId,
  CommentThread,
  CreateCommentPayload,
  UpdateCommentPayload,
  CreateReplyPayload,
  Reply,
  ReplyId,
  Author,
  ReactionEmoji,
} from '$lib/comments/types';
import {
  getAllComments,
  saveComment,
  deleteComment as deleteCommentFromDB,
} from '$lib/storage/comments-db';

/** Position information for comment markers */
export interface CommentPosition {
  top: number;
  left: number;
  height: number;
}

/** Internal state interface */
interface CommentsStateData {
  comments: Map<CommentId, Comment>;
  activeCommentId: CommentId | null;
  hoveredCommentId: CommentId | null;
  isPanelOpen: boolean;
  showResolved: boolean;
  isLoading: boolean;
  error: string | null;
  commentPositions: Map<CommentId, CommentPosition>;
}

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function createCommentsState(): {
  // Base state getters
  readonly comments: Map<CommentId, Comment>;
  readonly activeCommentId: CommentId | null;
  readonly hoveredCommentId: CommentId | null;
  readonly isPanelOpen: boolean;
  readonly showResolved: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly commentPositions: Map<CommentId, CommentPosition>;
  // Derived state getters
  readonly commentsArray: Comment[];
  readonly activeComments: Comment[];
  readonly resolvedComments: Comment[];
  readonly visibleComments: Comment[];
  readonly activeComment: Comment | null;
  readonly commentThreads: CommentThread[];
  readonly totalCommentCount: number;
  readonly unresolvedCount: number;
  // Actions
  loadComments: (documentId: string) => Promise<void>;
  addComment: (payload: CreateCommentPayload) => Promise<Comment | null>;
  updateComment: (commentId: CommentId, updates: UpdateCommentPayload) => Promise<void>;
  resolveComment: (commentId: CommentId, author: Author) => Promise<void>;
  unresolveComment: (commentId: CommentId) => Promise<void>;
  deleteComment: (commentId: CommentId) => Promise<void>;
  addReply: (payload: CreateReplyPayload) => Promise<Reply | null>;
  deleteReply: (commentId: CommentId, replyId: ReplyId) => Promise<void>;
  addReaction: (commentId: CommentId, emoji: ReactionEmoji, author: Author) => Promise<void>;
  setActiveComment: (commentId: CommentId | null) => void;
  setHoveredComment: (commentId: CommentId | null) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleShowResolved: () => void;
  updateCommentPosition: (commentId: CommentId, position: CommentPosition) => void;
  getCommentById: (commentId: CommentId) => Comment | undefined;
  reset: () => void;
} {
  let state = $state<CommentsStateData>({
    comments: new Map(),
    activeCommentId: null,
    hoveredCommentId: null,
    isPanelOpen: false,
    showResolved: false,
    isLoading: false,
    error: null,
    commentPositions: new Map(),
  });

  // Derived values
  let commentsArray = $derived(Array.from(state.comments.values()));
  let activeComments = $derived(commentsArray.filter((c) => !c.resolved));
  let resolvedComments = $derived(commentsArray.filter((c) => c.resolved));
  let visibleComments = $derived(state.showResolved ? commentsArray : activeComments);
  let activeComment = $derived(
    state.activeCommentId !== null ? (state.comments.get(state.activeCommentId) ?? null) : null,
  );
  let commentThreads = $derived<CommentThread[]>(
    visibleComments.map((comment) => ({
      comment,
      replyCount: comment.replies.length,
      hasUnread: false, // Could be enhanced with read tracking
      editorPosition: state.commentPositions.get(comment.id)?.top ?? 0,
    })),
  );
  let totalCommentCount = $derived(commentsArray.length);
  let unresolvedCount = $derived(activeComments.length);

  // Actions
  async function loadComments(documentId: string): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      const comments = await getAllComments(documentId);
      const commentsMap = new Map<CommentId, Comment>();
      for (const comment of comments) {
        commentsMap.set(comment.id, comment);
      }
      state.comments = commentsMap;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to load comments';
    } finally {
      state.isLoading = false;
    }
  }

  async function addComment(payload: CreateCommentPayload): Promise<Comment | null> {
    const now = new Date().toISOString();
    const comment: Comment = {
      id: generateId(),
      documentId: payload.documentId,
      textRange: payload.textRange,
      content: payload.content,
      author: payload.author,
      createdAt: now,
      updatedAt: now,
      resolved: false,
      replies: [],
      reactions: [],
    };

    try {
      await saveComment(comment);
      const newComments = new Map(state.comments);
      newComments.set(comment.id, comment);
      state.comments = newComments;
      return comment;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to add comment';
      return null;
    }
  }

  async function updateComment(commentId: CommentId, updates: UpdateCommentPayload): Promise<void> {
    const comment = state.comments.get(commentId);
    if (comment === undefined) {
      return;
    }

    const updatedComment: Comment = {
      ...comment,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveComment(updatedComment);
      const newComments = new Map(state.comments);
      newComments.set(commentId, updatedComment);
      state.comments = newComments;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to update comment';
    }
  }

  async function resolveComment(commentId: CommentId, author: Author): Promise<void> {
    await updateComment(commentId, {
      resolved: true,
      resolvedBy: author,
    });
    // Update resolvedAt separately since it's not in UpdateCommentPayload
    const comment = state.comments.get(commentId);
    if (comment !== undefined) {
      const updatedComment: Comment = {
        ...comment,
        resolvedAt: new Date().toISOString(),
      };
      await saveComment(updatedComment);
      const newComments = new Map(state.comments);
      newComments.set(commentId, updatedComment);
      state.comments = newComments;
    }
  }

  async function unresolveComment(commentId: CommentId): Promise<void> {
    const comment = state.comments.get(commentId);
    if (comment === undefined) {
      return;
    }

    const updatedComment: Comment = {
      ...comment,
      resolved: false,
      resolvedAt: undefined,
      resolvedBy: undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveComment(updatedComment);
      const newComments = new Map(state.comments);
      newComments.set(commentId, updatedComment);
      state.comments = newComments;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to unresolve comment';
    }
  }

  async function deleteComment(commentId: CommentId): Promise<void> {
    try {
      await deleteCommentFromDB(commentId);
      const newComments = new Map(state.comments);
      newComments.delete(commentId);
      state.comments = newComments;

      // Clear active/hovered if deleted comment was selected
      if (state.activeCommentId === commentId) {
        state.activeCommentId = null;
      }
      if (state.hoveredCommentId === commentId) {
        state.hoveredCommentId = null;
      }

      // Remove position data
      const newPositions = new Map(state.commentPositions);
      newPositions.delete(commentId);
      state.commentPositions = newPositions;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to delete comment';
    }
  }

  async function addReply(payload: CreateReplyPayload): Promise<Reply | null> {
    const comment = state.comments.get(payload.commentId);
    if (comment === undefined) {
      return null;
    }

    const now = new Date().toISOString();
    const reply: Reply = {
      id: generateId(),
      commentId: payload.commentId,
      content: payload.content,
      author: payload.author,
      createdAt: now,
      updatedAt: now,
      reactions: [],
    };

    const updatedComment: Comment = {
      ...comment,
      replies: [...comment.replies, reply],
      updatedAt: now,
    };

    try {
      await saveComment(updatedComment);
      const newComments = new Map(state.comments);
      newComments.set(payload.commentId, updatedComment);
      state.comments = newComments;
      return reply;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to add reply';
      return null;
    }
  }

  async function deleteReply(commentId: CommentId, replyId: ReplyId): Promise<void> {
    const comment = state.comments.get(commentId);
    if (comment === undefined) {
      return;
    }

    const updatedComment: Comment = {
      ...comment,
      replies: comment.replies.filter((r) => r.id !== replyId),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveComment(updatedComment);
      const newComments = new Map(state.comments);
      newComments.set(commentId, updatedComment);
      state.comments = newComments;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to delete reply';
    }
  }

  async function addReaction(
    commentId: CommentId,
    emoji: ReactionEmoji,
    author: Author,
  ): Promise<void> {
    const comment = state.comments.get(commentId);
    if (comment === undefined) {
      return;
    }

    // Toggle behavior: remove if already exists, add if not
    const existingReactionIndex = comment.reactions.findIndex(
      (r) => r.emoji === emoji && r.authorId === author.id,
    );

    let updatedReactions;
    if (existingReactionIndex >= 0) {
      // Remove existing reaction
      updatedReactions = comment.reactions.filter((_, index) => index !== existingReactionIndex);
    } else {
      // Add new reaction
      updatedReactions = [
        ...comment.reactions,
        {
          id: generateId(),
          emoji,
          authorId: author.id,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const updatedComment: Comment = {
      ...comment,
      reactions: updatedReactions,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveComment(updatedComment);
      const newComments = new Map(state.comments);
      newComments.set(commentId, updatedComment);
      state.comments = newComments;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to update reaction';
    }
  }

  function setActiveComment(commentId: CommentId | null): void {
    state.activeCommentId = commentId;
  }

  function setHoveredComment(commentId: CommentId | null): void {
    state.hoveredCommentId = commentId;
  }

  function togglePanel(): void {
    state.isPanelOpen = !state.isPanelOpen;
  }

  function openPanel(): void {
    state.isPanelOpen = true;
  }

  function closePanel(): void {
    state.isPanelOpen = false;
  }

  function toggleShowResolved(): void {
    state.showResolved = !state.showResolved;
  }

  function updateCommentPosition(commentId: CommentId, position: CommentPosition): void {
    const newPositions = new Map(state.commentPositions);
    newPositions.set(commentId, position);
    state.commentPositions = newPositions;
  }

  function getCommentById(commentId: CommentId): Comment | undefined {
    return state.comments.get(commentId);
  }

  function reset(): void {
    state.comments = new Map();
    state.activeCommentId = null;
    state.hoveredCommentId = null;
    state.isPanelOpen = false;
    state.showResolved = false;
    state.isLoading = false;
    state.error = null;
    state.commentPositions = new Map();
  }

  return {
    // Base state getters
    get comments(): Map<CommentId, Comment> {
      return state.comments;
    },
    get activeCommentId(): CommentId | null {
      return state.activeCommentId;
    },
    get hoveredCommentId(): CommentId | null {
      return state.hoveredCommentId;
    },
    get isPanelOpen(): boolean {
      return state.isPanelOpen;
    },
    get showResolved(): boolean {
      return state.showResolved;
    },
    get isLoading(): boolean {
      return state.isLoading;
    },
    get error(): string | null {
      return state.error;
    },
    get commentPositions(): Map<CommentId, CommentPosition> {
      return state.commentPositions;
    },
    // Derived state getters
    get commentsArray(): Comment[] {
      return commentsArray;
    },
    get activeComments(): Comment[] {
      return activeComments;
    },
    get resolvedComments(): Comment[] {
      return resolvedComments;
    },
    get visibleComments(): Comment[] {
      return visibleComments;
    },
    get activeComment(): Comment | null {
      return activeComment;
    },
    get commentThreads(): CommentThread[] {
      return commentThreads;
    },
    get totalCommentCount(): number {
      return totalCommentCount;
    },
    get unresolvedCount(): number {
      return unresolvedCount;
    },
    // Actions
    loadComments,
    addComment,
    updateComment,
    resolveComment,
    unresolveComment,
    deleteComment,
    addReply,
    deleteReply,
    addReaction,
    setActiveComment,
    setHoveredComment,
    togglePanel,
    openPanel,
    closePanel,
    toggleShowResolved,
    updateCommentPosition,
    getCommentById,
    reset,
  };
}

export const commentsState = createCommentsState();
