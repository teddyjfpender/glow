/**
 * Comment System Type Definitions
 * Core data models for Google Docs-style commenting feature
 */

/** Unique identifiers */
export type CommentId = string;
export type ReplyId = string;
export type ReactionId = string;

/** Text range within the document (ProseMirror positions) */
export interface TextRange {
  /** Start position in ProseMirror document */
  from: number;
  /** End position in ProseMirror document */
  to: number;
  /** Quoted text at time of comment creation (for reference if positions change) */
  quotedText: string;
}

/** Author information */
export interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
}

/** Emoji reaction on a comment or reply */
export interface Reaction {
  id: ReactionId;
  emoji: string;
  authorId: string;
  createdAt: string;
}

/** A reply within a comment thread */
export interface Reply {
  id: ReplyId;
  commentId: CommentId;
  content: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
  reactions: Reaction[];
}

/** Main comment with associated replies and reactions */
export interface Comment {
  id: CommentId;
  documentId: string;
  textRange: TextRange;
  content: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: Author;
  replies: Reply[];
  reactions: Reaction[];
}

/** Aggregated comment thread for display */
export interface CommentThread {
  comment: Comment;
  /** Total reply count */
  replyCount: number;
  /** Whether thread has unread replies */
  hasUnread: boolean;
  /** Vertical position for scroll sync (in pixels from top of editor) */
  editorPosition: number;
}

/** Comment creation payload */
export interface CreateCommentPayload {
  documentId: string;
  textRange: TextRange;
  content: string;
  author: Author;
}

/** Comment update payload */
export interface UpdateCommentPayload {
  content?: string;
  resolved?: boolean;
  resolvedBy?: Author;
}

/** Reply creation payload */
export interface CreateReplyPayload {
  commentId: CommentId;
  content: string;
  author: Author;
}

/** Available emoji reactions */
export const REACTION_EMOJIS = ['👍', '❤️', '😄', '🎉', '🤔', '👀', '🔥', '💯'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** Default author for local/anonymous users */
export function createDefaultAuthor(): Author {
  return {
    id: 'local-user',
    name: 'You',
    initials: 'YO',
  };
}
