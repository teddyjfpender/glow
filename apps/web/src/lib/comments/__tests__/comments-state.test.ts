/**
 * Comprehensive Tests for Comments State Management
 *
 * Tests the reactive state management for Google Docs-style commenting
 * using Svelte 5 runes pattern.
 *
 * Note: Svelte 5 $derived values may not reactively update in vitest
 * without a Svelte component context. Tests check the underlying Map
 * state directly when testing derived values.
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import type {
  Comment,
  CommentId,
  Author,
  TextRange,
  CreateCommentPayload,
  CreateReplyPayload,
  ReactionEmoji,
} from '$lib/comments/types';

// Mock the storage module
vi.mock('$lib/storage/comments-db', () => ({
  getAllComments: vi.fn().mockResolvedValue([]),
  saveComment: vi.fn().mockResolvedValue(undefined),
  deleteComment: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { commentsState } from '$lib/state/comments.svelte';
import * as commentsDb from '$lib/storage/comments-db';

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a mock author for testing */
function createMockAuthor(overrides: Partial<Author> = {}): Author {
  return {
    id: 'user-123',
    name: 'Test User',
    initials: 'TU',
    ...overrides,
  };
}

/** Create a mock text range for testing */
function createMockTextRange(overrides: Partial<TextRange> = {}): TextRange {
  return {
    from: 0,
    to: 10,
    quotedText: 'Test text',
    ...overrides,
  };
}

/** Create a mock comment for testing */
function createMockComment(overrides: Partial<Comment> = {}): Comment {
  const now = new Date().toISOString();
  return {
    id: `comment-${String(Date.now())}-${Math.random().toString(36).substring(2, 11)}`,
    documentId: 'doc-123',
    textRange: createMockTextRange(),
    content: 'Test comment content',
    author: createMockAuthor(),
    createdAt: now,
    updatedAt: now,
    resolved: false,
    replies: [],
    reactions: [],
    ...overrides,
  };
}

/** Create a mock comment payload for testing */
function createMockCommentPayload(
  overrides: Partial<CreateCommentPayload> = {},
): CreateCommentPayload {
  return {
    documentId: 'doc-123',
    textRange: createMockTextRange(),
    content: 'New comment content',
    author: createMockAuthor(),
    ...overrides,
  };
}

/** Create a mock reply payload for testing */
function createMockReplyPayload(
  commentId: CommentId,
  overrides: Partial<Omit<CreateReplyPayload, 'commentId'>> = {},
): CreateReplyPayload {
  return {
    commentId,
    content: 'Reply content',
    author: createMockAuthor(),
    ...overrides,
  };
}

/** Helper to validate ISO date string */
function isValidISODateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/** Helper to check if date is within range */
function isDateInRange(dateString: string, start: string, end: string): boolean {
  return dateString >= start && dateString <= end;
}

/** Get comments array from the Map (bypasses $derived) */
function getCommentsArray(): Comment[] {
  return Array.from(commentsState.comments.values());
}

/** Get active (unresolved) comments from the Map */
function getActiveComments(): Comment[] {
  return getCommentsArray().filter((c) => !c.resolved);
}

/** Get resolved comments from the Map */
function getResolvedComments(): Comment[] {
  return getCommentsArray().filter((c) => c.resolved);
}

/** Get visible comments based on showResolved setting */
function getVisibleComments(): Comment[] {
  const all = getCommentsArray();
  return commentsState.showResolved ? all : all.filter((c) => !c.resolved);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('CommentsState', () => {
  beforeEach(() => {
    // Reset state before each test
    commentsState.reset();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    commentsState.reset();
  });

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('should have empty comments Map', () => {
      expect(commentsState.comments.size).toBe(0);
    });

    it('should have empty comments array', () => {
      expect(getCommentsArray()).toHaveLength(0);
    });

    it('should have null activeCommentId', () => {
      expect(commentsState.activeCommentId).toBeNull();
    });

    it('should have null hoveredCommentId', () => {
      expect(commentsState.hoveredCommentId).toBeNull();
    });

    it('should have isPanelOpen false', () => {
      expect(commentsState.isPanelOpen).toBe(false);
    });

    it('should have showResolved false', () => {
      expect(commentsState.showResolved).toBe(false);
    });

    it('should have isLoading false', () => {
      expect(commentsState.isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(commentsState.error).toBeNull();
    });

    it('should have empty commentPositions Map', () => {
      expect(commentsState.commentPositions.size).toBe(0);
    });

    it('should have zero totalCommentCount (via Map size)', () => {
      expect(commentsState.comments.size).toBe(0);
    });

    it('should have zero unresolvedCount (via filtered array)', () => {
      expect(getActiveComments()).toHaveLength(0);
    });
  });

  // ============================================================================
  // addComment Tests
  // ============================================================================

  describe('addComment', () => {
    it('should add comment to state', async () => {
      const payload = createMockCommentPayload();

      const comment = await commentsState.addComment(payload);

      expect(comment).not.toBeNull();
      expect(commentsState.comments.size).toBe(1);
      expect(getCommentsArray()).toHaveLength(1);
    });

    it('should generate unique ID for each comment', async () => {
      const payload1 = createMockCommentPayload({ content: 'First comment' });
      const payload2 = createMockCommentPayload({ content: 'Second comment' });

      const comment1 = await commentsState.addComment(payload1);
      const comment2 = await commentsState.addComment(payload2);

      expect(comment1?.id).toBeDefined();
      expect(comment2?.id).toBeDefined();
      expect(comment1?.id).not.toBe(comment2?.id);
    });

    it('should set createdAt timestamp', async () => {
      const beforeTime = new Date().toISOString();
      const payload = createMockCommentPayload();

      const comment = await commentsState.addComment(payload);
      const afterTime = new Date().toISOString();

      expect(comment?.createdAt).toBeDefined();
      expect(isValidISODateString(comment?.createdAt)).toBe(true);
      expect(isDateInRange(comment!.createdAt, beforeTime, afterTime)).toBe(true);
    });

    it('should set updatedAt timestamp equal to createdAt', async () => {
      const payload = createMockCommentPayload();

      const comment = await commentsState.addComment(payload);

      expect(comment?.updatedAt).toBe(comment?.createdAt);
    });

    it('should set resolved to false by default', async () => {
      const payload = createMockCommentPayload();

      const comment = await commentsState.addComment(payload);

      expect(comment?.resolved).toBe(false);
    });

    it('should initialize with empty replies array', async () => {
      const payload = createMockCommentPayload();

      const comment = await commentsState.addComment(payload);

      expect(comment?.replies).toEqual([]);
    });

    it('should initialize with empty reactions array', async () => {
      const payload = createMockCommentPayload();

      const comment = await commentsState.addComment(payload);

      expect(comment?.reactions).toEqual([]);
    });

    it('should call saveComment on storage', async () => {
      const payload = createMockCommentPayload();

      await commentsState.addComment(payload);

      expect(commentsDb.saveComment).toHaveBeenCalledTimes(1);
      expect(commentsDb.saveComment).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: payload.documentId,
          content: payload.content,
        }),
      );
    });

    it('should preserve payload data in created comment', async () => {
      const author = createMockAuthor({ name: 'Custom Author', id: 'custom-id' });
      const textRange = createMockTextRange({ from: 5, to: 15, quotedText: 'Custom text' });
      const payload = createMockCommentPayload({
        documentId: 'custom-doc',
        content: 'Custom content',
        author,
        textRange,
      });

      const comment = await commentsState.addComment(payload);

      expect(comment?.documentId).toBe('custom-doc');
      expect(comment?.content).toBe('Custom content');
      expect(comment?.author).toEqual(author);
      expect(comment?.textRange).toEqual(textRange);
    });

    it('should handle storage error gracefully', async () => {
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Storage error'));
      const payload = createMockCommentPayload();

      const result = await commentsState.addComment(payload);

      expect(result).toBeNull();
      expect(commentsState.error).toBe('Storage error');
    });

    it('should update totalCommentCount (via Map size)', async () => {
      expect(commentsState.comments.size).toBe(0);

      await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.comments.size).toBe(1);

      await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.comments.size).toBe(2);
    });

    it('should update unresolvedCount (via filtered array)', async () => {
      expect(getActiveComments()).toHaveLength(0);

      await commentsState.addComment(createMockCommentPayload());
      expect(getActiveComments()).toHaveLength(1);
    });
  });

  // ============================================================================
  // resolveComment Tests
  // ============================================================================

  describe('resolveComment', () => {
    it('should set resolved to true', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const resolver = createMockAuthor({ id: 'resolver-id', name: 'Resolver' });

      await commentsState.resolveComment(comment!.id, resolver);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.resolved).toBe(true);
    });

    it('should set resolvedAt timestamp', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const resolver = createMockAuthor();
      const beforeTime = new Date().toISOString();

      await commentsState.resolveComment(comment!.id, resolver);
      const afterTime = new Date().toISOString();

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.resolvedAt).toBeDefined();
      expect(isValidISODateString(updatedComment?.resolvedAt)).toBe(true);
      expect(isDateInRange(updatedComment!.resolvedAt!, beforeTime, afterTime)).toBe(true);
    });

    it('should set resolvedBy author', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const resolver = createMockAuthor({ id: 'resolver-id', name: 'Resolver' });

      await commentsState.resolveComment(comment!.id, resolver);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.resolvedBy).toEqual(resolver);
    });

    it('should decrease unresolvedCount', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      expect(getActiveComments()).toHaveLength(1);

      await commentsState.resolveComment(comment!.id, createMockAuthor());

      expect(getActiveComments()).toHaveLength(0);
    });

    it('should call saveComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      vi.clearAllMocks();

      await commentsState.resolveComment(comment!.id, createMockAuthor());

      expect(commentsDb.saveComment).toHaveBeenCalled();
    });

    it('should not throw for non-existent comment', async () => {
      await expect(
        commentsState.resolveComment('non-existent-id', createMockAuthor()),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // unresolveComment Tests
  // ============================================================================

  describe('unresolveComment', () => {
    it('should set resolved to false', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());

      await commentsState.unresolveComment(comment!.id);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.resolved).toBe(false);
    });

    it('should clear resolvedAt', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());

      await commentsState.unresolveComment(comment!.id);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.resolvedAt).toBeUndefined();
    });

    it('should clear resolvedBy', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());

      await commentsState.unresolveComment(comment!.id);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.resolvedBy).toBeUndefined();
    });

    it('should update updatedAt timestamp', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());
      const originalUpdatedAt = commentsState.getCommentById(comment!.id)?.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      await commentsState.unresolveComment(comment!.id);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should increase unresolvedCount', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());
      expect(getActiveComments()).toHaveLength(0);

      await commentsState.unresolveComment(comment!.id);

      expect(getActiveComments()).toHaveLength(1);
    });

    it('should call saveComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());
      vi.clearAllMocks();

      await commentsState.unresolveComment(comment!.id);

      expect(commentsDb.saveComment).toHaveBeenCalled();
    });

    it('should not throw for non-existent comment', async () => {
      await expect(commentsState.unresolveComment('non-existent-id')).resolves.not.toThrow();
    });

    it('should handle storage error gracefully', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      await commentsState.resolveComment(comment!.id, createMockAuthor());
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Storage error'));

      await commentsState.unresolveComment(comment!.id);

      expect(commentsState.error).toBe('Storage error');
    });
  });

  // ============================================================================
  // addReply Tests
  // ============================================================================

  describe('addReply', () => {
    it('should add reply to comment.replies array', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const replyPayload = createMockReplyPayload(comment!.id);

      const reply = await commentsState.addReply(replyPayload);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.replies).toHaveLength(1);
      expect(updatedComment?.replies[0]).toEqual(reply);
    });

    it('should generate unique reply ID', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      const reply1 = await commentsState.addReply(createMockReplyPayload(comment!.id));
      const reply2 = await commentsState.addReply(createMockReplyPayload(comment!.id));

      expect(reply1?.id).toBeDefined();
      expect(reply2?.id).toBeDefined();
      expect(reply1?.id).not.toBe(reply2?.id);
    });

    it('should update comment.updatedAt', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const originalUpdatedAt = comment?.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      await commentsState.addReply(createMockReplyPayload(comment!.id));

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should set reply createdAt timestamp', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const beforeTime = new Date().toISOString();

      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));
      const afterTime = new Date().toISOString();

      expect(reply?.createdAt).toBeDefined();
      expect(isValidISODateString(reply?.createdAt)).toBe(true);
      expect(isDateInRange(reply!.createdAt, beforeTime, afterTime)).toBe(true);
    });

    it('should set reply updatedAt equal to createdAt', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));

      expect(reply?.updatedAt).toBe(reply?.createdAt);
    });

    it('should initialize reply with empty reactions', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));

      expect(reply?.reactions).toEqual([]);
    });

    it('should preserve reply payload data', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const author = createMockAuthor({ id: 'reply-author', name: 'Reply Author' });
      const replyPayload = createMockReplyPayload(comment!.id, {
        content: 'Custom reply content',
        author,
      });

      const reply = await commentsState.addReply(replyPayload);

      expect(reply?.content).toBe('Custom reply content');
      expect(reply?.author).toEqual(author);
      expect(reply?.commentId).toBe(comment!.id);
    });

    it('should return null for non-existent comment', async () => {
      const reply = await commentsState.addReply(createMockReplyPayload('non-existent-id'));

      expect(reply).toBeNull();
    });

    it('should call saveComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      vi.clearAllMocks();

      await commentsState.addReply(createMockReplyPayload(comment!.id));

      expect(commentsDb.saveComment).toHaveBeenCalledTimes(1);
    });

    it('should handle storage error gracefully', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Storage error'));

      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));

      expect(reply).toBeNull();
      expect(commentsState.error).toBe('Storage error');
    });

    it('should add multiple replies in order', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      const reply1 = await commentsState.addReply(
        createMockReplyPayload(comment!.id, { content: 'First reply' }),
      );
      const reply2 = await commentsState.addReply(
        createMockReplyPayload(comment!.id, { content: 'Second reply' }),
      );
      const reply3 = await commentsState.addReply(
        createMockReplyPayload(comment!.id, { content: 'Third reply' }),
      );

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.replies).toHaveLength(3);
      expect(updatedComment?.replies[0].id).toBe(reply1?.id);
      expect(updatedComment?.replies[1].id).toBe(reply2?.id);
      expect(updatedComment?.replies[2].id).toBe(reply3?.id);
    });
  });

  // ============================================================================
  // addReaction Tests
  // ============================================================================

  describe('addReaction', () => {
    it('should add reaction if not exists', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const author = createMockAuthor();
      const emoji: ReactionEmoji = '👍';

      await commentsState.addReaction(comment!.id, emoji, author);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.reactions).toHaveLength(1);
      expect(updatedComment?.reactions[0].emoji).toBe(emoji);
      expect(updatedComment?.reactions[0].authorId).toBe(author.id);
    });

    it('should remove reaction if already exists (toggle behavior)', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const author = createMockAuthor();
      const emoji: ReactionEmoji = '👍';

      // Add reaction
      await commentsState.addReaction(comment!.id, emoji, author);
      expect(commentsState.getCommentById(comment!.id)?.reactions).toHaveLength(1);

      // Toggle off (remove)
      await commentsState.addReaction(comment!.id, emoji, author);
      expect(commentsState.getCommentById(comment!.id)?.reactions).toHaveLength(0);
    });

    it('should generate unique reaction ID', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const author1 = createMockAuthor({ id: 'user-1' });
      const author2 = createMockAuthor({ id: 'user-2' });

      await commentsState.addReaction(comment!.id, '👍', author1);
      await commentsState.addReaction(comment!.id, '👍', author2);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.reactions[0].id).not.toBe(updatedComment?.reactions[1].id);
    });

    it('should set reaction createdAt timestamp', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const beforeTime = new Date().toISOString();

      await commentsState.addReaction(comment!.id, '👍', createMockAuthor());
      const afterTime = new Date().toISOString();

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(isValidISODateString(updatedComment?.reactions[0].createdAt)).toBe(true);
      expect(isDateInRange(updatedComment!.reactions[0].createdAt, beforeTime, afterTime)).toBe(
        true,
      );
    });

    it('should allow different emojis from same author', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const author = createMockAuthor();

      await commentsState.addReaction(comment!.id, '👍', author);
      await commentsState.addReaction(comment!.id, '❤️', author);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.reactions).toHaveLength(2);
    });

    it('should allow same emoji from different authors', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const author1 = createMockAuthor({ id: 'user-1' });
      const author2 = createMockAuthor({ id: 'user-2' });

      await commentsState.addReaction(comment!.id, '👍', author1);
      await commentsState.addReaction(comment!.id, '👍', author2);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.reactions).toHaveLength(2);
    });

    it('should update comment.updatedAt', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const originalUpdatedAt = comment?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await commentsState.addReaction(comment!.id, '👍', createMockAuthor());

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should not throw for non-existent comment', async () => {
      await expect(
        commentsState.addReaction('non-existent-id', '👍', createMockAuthor()),
      ).resolves.not.toThrow();
    });

    it('should call saveComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      vi.clearAllMocks();

      await commentsState.addReaction(comment!.id, '👍', createMockAuthor());

      expect(commentsDb.saveComment).toHaveBeenCalled();
    });

    it('should handle storage error gracefully', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Storage error'));

      await commentsState.addReaction(comment!.id, '👍', createMockAuthor());

      expect(commentsState.error).toBe('Storage error');
    });
  });

  // ============================================================================
  // deleteComment Tests
  // ============================================================================

  describe('deleteComment', () => {
    it('should remove comment from state', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.comments.size).toBe(1);

      await commentsState.deleteComment(comment!.id);

      expect(commentsState.comments.size).toBe(0);
      expect(commentsState.getCommentById(comment!.id)).toBeUndefined();
    });

    it('should clear activeCommentId if deleted comment was active', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      commentsState.setActiveComment(comment!.id);
      expect(commentsState.activeCommentId).toBe(comment!.id);

      await commentsState.deleteComment(comment!.id);

      expect(commentsState.activeCommentId).toBeNull();
    });

    it('should clear hoveredCommentId if deleted comment was hovered', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      commentsState.setHoveredComment(comment!.id);
      expect(commentsState.hoveredCommentId).toBe(comment!.id);

      await commentsState.deleteComment(comment!.id);

      expect(commentsState.hoveredCommentId).toBeNull();
    });

    it('should not clear activeCommentId if different comment was active', async () => {
      const comment1 = await commentsState.addComment(createMockCommentPayload());
      const comment2 = await commentsState.addComment(createMockCommentPayload());
      commentsState.setActiveComment(comment2!.id);

      await commentsState.deleteComment(comment1!.id);

      expect(commentsState.activeCommentId).toBe(comment2!.id);
    });

    it('should call deleteComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      await commentsState.deleteComment(comment!.id);

      expect(commentsDb.deleteComment).toHaveBeenCalledWith(comment!.id);
    });

    it('should remove comment position data', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      commentsState.updateCommentPosition(comment!.id, { top: 100, left: 50, height: 20 });
      expect(commentsState.commentPositions.has(comment!.id)).toBe(true);

      await commentsState.deleteComment(comment!.id);

      expect(commentsState.commentPositions.has(comment!.id)).toBe(false);
    });

    it('should update totalCommentCount (via Map size)', async () => {
      const comment1 = await commentsState.addComment(createMockCommentPayload());
      await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.comments.size).toBe(2);

      await commentsState.deleteComment(comment1!.id);

      expect(commentsState.comments.size).toBe(1);
    });

    it('should update unresolvedCount (via filtered array)', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      expect(getActiveComments()).toHaveLength(1);

      await commentsState.deleteComment(comment!.id);

      expect(getActiveComments()).toHaveLength(0);
    });

    it('should handle storage error gracefully', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      (commentsDb.deleteComment as Mock).mockRejectedValueOnce(new Error('Storage error'));

      await commentsState.deleteComment(comment!.id);

      expect(commentsState.error).toBe('Storage error');
    });
  });

  // ============================================================================
  // deleteReply Tests
  // ============================================================================

  describe('deleteReply', () => {
    it('should remove reply from comment.replies array', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));
      expect(commentsState.getCommentById(comment!.id)?.replies).toHaveLength(1);

      await commentsState.deleteReply(comment!.id, reply!.id);

      expect(commentsState.getCommentById(comment!.id)?.replies).toHaveLength(0);
    });

    it('should update comment.updatedAt', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));
      const originalUpdatedAt = commentsState.getCommentById(comment!.id)?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await commentsState.deleteReply(comment!.id, reply!.id);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should only delete specified reply', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const reply1 = await commentsState.addReply(
        createMockReplyPayload(comment!.id, { content: 'First' }),
      );
      const reply2 = await commentsState.addReply(
        createMockReplyPayload(comment!.id, { content: 'Second' }),
      );

      await commentsState.deleteReply(comment!.id, reply1!.id);

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.replies).toHaveLength(1);
      expect(updatedComment?.replies[0].id).toBe(reply2!.id);
    });

    it('should call saveComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));
      vi.clearAllMocks();

      await commentsState.deleteReply(comment!.id, reply!.id);

      expect(commentsDb.saveComment).toHaveBeenCalled();
    });

    it('should not throw for non-existent comment', async () => {
      await expect(commentsState.deleteReply('non-existent-id', 'reply-id')).resolves.not.toThrow();
    });

    it('should handle storage error gracefully', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Storage error'));

      await commentsState.deleteReply(comment!.id, reply!.id);

      expect(commentsState.error).toBe('Storage error');
    });
  });

  // ============================================================================
  // Panel Controls Tests
  // ============================================================================

  describe('panel controls', () => {
    describe('togglePanel', () => {
      it('should toggle isPanelOpen from false to true', () => {
        expect(commentsState.isPanelOpen).toBe(false);

        commentsState.togglePanel();

        expect(commentsState.isPanelOpen).toBe(true);
      });

      it('should toggle isPanelOpen from true to false', () => {
        commentsState.openPanel();
        expect(commentsState.isPanelOpen).toBe(true);

        commentsState.togglePanel();

        expect(commentsState.isPanelOpen).toBe(false);
      });

      it('should toggle multiple times correctly', () => {
        commentsState.togglePanel(); // false -> true
        expect(commentsState.isPanelOpen).toBe(true);

        commentsState.togglePanel(); // true -> false
        expect(commentsState.isPanelOpen).toBe(false);

        commentsState.togglePanel(); // false -> true
        expect(commentsState.isPanelOpen).toBe(true);
      });
    });

    describe('openPanel', () => {
      it('should set isPanelOpen to true', () => {
        commentsState.openPanel();

        expect(commentsState.isPanelOpen).toBe(true);
      });

      it('should remain true if already open', () => {
        commentsState.openPanel();
        commentsState.openPanel();

        expect(commentsState.isPanelOpen).toBe(true);
      });
    });

    describe('closePanel', () => {
      it('should set isPanelOpen to false', () => {
        commentsState.openPanel();

        commentsState.closePanel();

        expect(commentsState.isPanelOpen).toBe(false);
      });

      it('should remain false if already closed', () => {
        commentsState.closePanel();
        commentsState.closePanel();

        expect(commentsState.isPanelOpen).toBe(false);
      });
    });
  });

  // ============================================================================
  // Show Resolved Toggle Tests
  // ============================================================================

  describe('toggleShowResolved', () => {
    it('should toggle showResolved from false to true', () => {
      expect(commentsState.showResolved).toBe(false);

      commentsState.toggleShowResolved();

      expect(commentsState.showResolved).toBe(true);
    });

    it('should toggle showResolved from true to false', () => {
      commentsState.toggleShowResolved();
      expect(commentsState.showResolved).toBe(true);

      commentsState.toggleShowResolved();

      expect(commentsState.showResolved).toBe(false);
    });
  });

  // ============================================================================
  // Derived State Tests
  // ============================================================================

  describe('derived state', () => {
    describe('activeComments', () => {
      it('should filter resolved comments', async () => {
        const comment1 = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment1!.id, createMockAuthor());

        expect(getActiveComments()).toHaveLength(1);
        expect(getActiveComments().every((c) => !c.resolved)).toBe(true);
      });

      it('should return all comments when none are resolved', async () => {
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());

        expect(getActiveComments()).toHaveLength(2);
      });

      it('should return empty array when all are resolved', async () => {
        const comment1 = await commentsState.addComment(createMockCommentPayload());
        const comment2 = await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment1!.id, createMockAuthor());
        await commentsState.resolveComment(comment2!.id, createMockAuthor());

        expect(getActiveComments()).toHaveLength(0);
      });
    });

    describe('resolvedComments', () => {
      it('should only return resolved comments', async () => {
        const comment1 = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment1!.id, createMockAuthor());

        expect(getResolvedComments()).toHaveLength(1);
        expect(getResolvedComments().every((c) => c.resolved)).toBe(true);
      });

      it('should return empty array when none are resolved', async () => {
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());

        expect(getResolvedComments()).toHaveLength(0);
      });
    });

    describe('visibleComments', () => {
      it('should respect showResolved setting when false', async () => {
        const comment1 = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment1!.id, createMockAuthor());

        // showResolved defaults to false
        expect(getVisibleComments()).toHaveLength(1);
        expect(getVisibleComments().every((c) => !c.resolved)).toBe(true);
      });

      it('should show all comments when showResolved is true', async () => {
        const comment1 = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment1!.id, createMockAuthor());

        commentsState.toggleShowResolved();

        expect(getVisibleComments()).toHaveLength(2);
      });
    });

    describe('commentThreads (via manual mapping)', () => {
      it('should map comments to thread objects', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());

        const threads = getVisibleComments().map((c) => ({
          comment: c,
          replyCount: c.replies.length,
          hasUnread: false,
          editorPosition: commentsState.commentPositions.get(c.id)?.top ?? 0,
        }));

        expect(threads).toHaveLength(1);
        expect(threads[0].comment.id).toBe(comment!.id);
      });

      it('should include replyCount in thread', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addReply(createMockReplyPayload(comment!.id));
        await commentsState.addReply(createMockReplyPayload(comment!.id));

        const updatedComment = commentsState.getCommentById(comment!.id);
        const replyCount = updatedComment?.replies.length ?? 0;

        expect(replyCount).toBe(2);
      });

      it('should use editorPosition from commentPositions', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());
        commentsState.updateCommentPosition(comment!.id, { top: 150, left: 50, height: 20 });

        const editorPosition = commentsState.commentPositions.get(comment!.id)?.top ?? 0;

        expect(editorPosition).toBe(150);
      });

      it('should default editorPosition to 0 if not set', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());

        const editorPosition = commentsState.commentPositions.get(comment!.id)?.top ?? 0;

        expect(editorPosition).toBe(0);
      });

      it('should only include visible comments', async () => {
        const comment1 = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment1!.id, createMockAuthor());

        // showResolved defaults to false
        expect(getVisibleComments()).toHaveLength(1);
      });
    });

    describe('unresolvedCount', () => {
      it('should count active (unresolved) comments', async () => {
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());

        expect(getActiveComments()).toHaveLength(3);
      });

      it('should decrease when comment is resolved', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());
        await commentsState.addComment(createMockCommentPayload());
        expect(getActiveComments()).toHaveLength(2);

        await commentsState.resolveComment(comment!.id, createMockAuthor());

        expect(getActiveComments()).toHaveLength(1);
      });

      it('should increase when comment is unresolved', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());
        await commentsState.resolveComment(comment!.id, createMockAuthor());
        expect(getActiveComments()).toHaveLength(0);

        await commentsState.unresolveComment(comment!.id);

        expect(getActiveComments()).toHaveLength(1);
      });
    });

    describe('activeComment', () => {
      it('should return null when no comment is active', () => {
        expect(commentsState.activeCommentId).toBeNull();
        const activeComment =
          commentsState.activeCommentId !== null
            ? commentsState.getCommentById(commentsState.activeCommentId)
            : null;
        expect(activeComment).toBeNull();
      });

      it('should return active comment when set', async () => {
        const comment = await commentsState.addComment(createMockCommentPayload());
        commentsState.setActiveComment(comment!.id);

        const activeComment =
          commentsState.activeCommentId !== null
            ? commentsState.getCommentById(commentsState.activeCommentId)
            : null;

        expect(activeComment).not.toBeNull();
        expect(activeComment?.id).toBe(comment!.id);
      });

      it('should return undefined for non-existent activeCommentId', async () => {
        await commentsState.addComment(createMockCommentPayload());
        commentsState.setActiveComment('non-existent-id');

        const activeComment =
          commentsState.activeCommentId !== null
            ? commentsState.getCommentById(commentsState.activeCommentId)
            : null;

        expect(activeComment).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // setActiveComment Tests
  // ============================================================================

  describe('setActiveComment', () => {
    it('should set activeCommentId', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      commentsState.setActiveComment(comment!.id);

      expect(commentsState.activeCommentId).toBe(comment!.id);
    });

    it('should accept null to clear active comment', () => {
      commentsState.setActiveComment(null);

      expect(commentsState.activeCommentId).toBeNull();
    });

    it('should clear previous active comment', async () => {
      const comment1 = await commentsState.addComment(createMockCommentPayload());
      const comment2 = await commentsState.addComment(createMockCommentPayload());

      commentsState.setActiveComment(comment1!.id);
      expect(commentsState.activeCommentId).toBe(comment1!.id);

      commentsState.setActiveComment(comment2!.id);
      expect(commentsState.activeCommentId).toBe(comment2!.id);
    });
  });

  // ============================================================================
  // setHoveredComment Tests
  // ============================================================================

  describe('setHoveredComment', () => {
    it('should set hoveredCommentId', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      commentsState.setHoveredComment(comment!.id);

      expect(commentsState.hoveredCommentId).toBe(comment!.id);
    });

    it('should accept null to clear hovered comment', () => {
      commentsState.setHoveredComment(null);

      expect(commentsState.hoveredCommentId).toBeNull();
    });
  });

  // ============================================================================
  // updateCommentPosition Tests
  // ============================================================================

  describe('updateCommentPosition', () => {
    it('should update comment position', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const position = { top: 100, left: 50, height: 20 };

      commentsState.updateCommentPosition(comment!.id, position);

      expect(commentsState.commentPositions.get(comment!.id)).toEqual(position);
    });

    it('should overwrite existing position', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      commentsState.updateCommentPosition(comment!.id, { top: 100, left: 50, height: 20 });

      const newPosition = { top: 200, left: 60, height: 25 };
      commentsState.updateCommentPosition(comment!.id, newPosition);

      expect(commentsState.commentPositions.get(comment!.id)).toEqual(newPosition);
    });
  });

  // ============================================================================
  // getCommentById Tests
  // ============================================================================

  describe('getCommentById', () => {
    it('should return comment by ID', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      const result = commentsState.getCommentById(comment!.id);

      expect(result).toEqual(comment);
    });

    it('should return undefined for non-existent ID', () => {
      const result = commentsState.getCommentById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // loadComments Tests
  // ============================================================================

  describe('loadComments', () => {
    it('should set isLoading to true while loading', async () => {
      // Use a promise that we control
      let resolveLoad: () => void;
      const loadPromise = new Promise<Comment[]>((resolve) => {
        resolveLoad = () => resolve([]);
      });
      (commentsDb.getAllComments as Mock).mockReturnValueOnce(loadPromise);

      const loadOperation = commentsState.loadComments('doc-123');

      expect(commentsState.isLoading).toBe(true);

      resolveLoad!();
      await loadOperation;

      expect(commentsState.isLoading).toBe(false);
    });

    it('should populate comments from storage', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1' }),
        createMockComment({ id: 'comment-2' }),
      ];
      (commentsDb.getAllComments as Mock).mockResolvedValueOnce(mockComments);

      await commentsState.loadComments('doc-123');

      expect(commentsState.comments.size).toBe(2);
      expect(commentsState.getCommentById('comment-1')).toBeDefined();
      expect(commentsState.getCommentById('comment-2')).toBeDefined();
    });

    it('should call getAllComments with documentId', async () => {
      await commentsState.loadComments('doc-123');

      expect(commentsDb.getAllComments).toHaveBeenCalledWith('doc-123');
    });

    it('should clear error before loading', async () => {
      // Create an error state first
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Previous error'));
      await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.error).not.toBeNull();

      (commentsDb.getAllComments as Mock).mockResolvedValueOnce([]);
      await commentsState.loadComments('doc-123');

      expect(commentsState.error).toBeNull();
    });

    it('should handle load error gracefully', async () => {
      (commentsDb.getAllComments as Mock).mockRejectedValueOnce(new Error('Load failed'));

      await commentsState.loadComments('doc-123');

      expect(commentsState.error).toBe('Load failed');
      expect(commentsState.isLoading).toBe(false);
    });

    it('should replace existing comments', async () => {
      await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.comments.size).toBe(1);

      const newComments = [
        createMockComment({ id: 'new-1' }),
        createMockComment({ id: 'new-2' }),
        createMockComment({ id: 'new-3' }),
      ];
      (commentsDb.getAllComments as Mock).mockResolvedValueOnce(newComments);

      await commentsState.loadComments('doc-123');

      expect(commentsState.comments.size).toBe(3);
    });
  });

  // ============================================================================
  // updateComment Tests
  // ============================================================================

  describe('updateComment', () => {
    it('should update comment content', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      await commentsState.updateComment(comment!.id, { content: 'Updated content' });

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.content).toBe('Updated content');
    });

    it('should update updatedAt timestamp', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      const originalUpdatedAt = comment?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await commentsState.updateComment(comment!.id, { content: 'Updated' });

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should preserve other fields when updating', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());

      await commentsState.updateComment(comment!.id, { content: 'Updated' });

      const updatedComment = commentsState.getCommentById(comment!.id);
      expect(updatedComment?.documentId).toBe(comment?.documentId);
      expect(updatedComment?.author).toEqual(comment?.author);
      expect(updatedComment?.textRange).toEqual(comment?.textRange);
    });

    it('should call saveComment on storage', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      vi.clearAllMocks();

      await commentsState.updateComment(comment!.id, { content: 'Updated' });

      expect(commentsDb.saveComment).toHaveBeenCalled();
    });

    it('should not throw for non-existent comment', async () => {
      await expect(
        commentsState.updateComment('non-existent-id', { content: 'Updated' }),
      ).resolves.not.toThrow();
    });

    it('should handle storage error gracefully', async () => {
      const comment = await commentsState.addComment(createMockCommentPayload());
      (commentsDb.saveComment as Mock).mockRejectedValueOnce(new Error('Storage error'));

      await commentsState.updateComment(comment!.id, { content: 'Updated' });

      expect(commentsState.error).toBe('Storage error');
    });
  });

  // ============================================================================
  // reset Tests
  // ============================================================================

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      // Set up some state
      const comment = await commentsState.addComment(createMockCommentPayload());
      commentsState.setActiveComment(comment!.id);
      commentsState.setHoveredComment(comment!.id);
      commentsState.openPanel();
      commentsState.toggleShowResolved();
      commentsState.updateCommentPosition(comment!.id, { top: 100, left: 50, height: 20 });

      // Reset
      commentsState.reset();

      // Verify all state is reset
      expect(commentsState.comments.size).toBe(0);
      expect(getCommentsArray()).toHaveLength(0);
      expect(commentsState.activeCommentId).toBeNull();
      expect(commentsState.hoveredCommentId).toBeNull();
      expect(commentsState.isPanelOpen).toBe(false);
      expect(commentsState.showResolved).toBe(false);
      expect(commentsState.isLoading).toBe(false);
      expect(commentsState.error).toBeNull();
      expect(commentsState.commentPositions.size).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('should complete full comment workflow', async () => {
      // 1. Open panel
      commentsState.openPanel();
      expect(commentsState.isPanelOpen).toBe(true);

      // 2. Add comment
      const comment = await commentsState.addComment(createMockCommentPayload());
      expect(commentsState.comments.size).toBe(1);

      // 3. Set as active
      commentsState.setActiveComment(comment!.id);
      expect(commentsState.activeCommentId).toBe(comment!.id);

      // 4. Add reply
      const reply = await commentsState.addReply(createMockReplyPayload(comment!.id));
      expect(commentsState.getCommentById(comment!.id)?.replies).toHaveLength(1);

      // 5. Add reaction
      await commentsState.addReaction(comment!.id, '👍', createMockAuthor());
      expect(commentsState.getCommentById(comment!.id)?.reactions).toHaveLength(1);

      // 6. Delete reply
      await commentsState.deleteReply(comment!.id, reply!.id);
      expect(commentsState.getCommentById(comment!.id)?.replies).toHaveLength(0);

      // 7. Resolve comment
      await commentsState.resolveComment(comment!.id, createMockAuthor());
      expect(getActiveComments()).toHaveLength(0);
      expect(getVisibleComments()).toHaveLength(0);

      // 8. Show resolved
      commentsState.toggleShowResolved();
      expect(getVisibleComments()).toHaveLength(1);

      // 9. Unresolve
      await commentsState.unresolveComment(comment!.id);
      expect(getActiveComments()).toHaveLength(1);

      // 10. Delete comment
      await commentsState.deleteComment(comment!.id);
      expect(commentsState.comments.size).toBe(0);
      expect(commentsState.activeCommentId).toBeNull();

      // 11. Close panel
      commentsState.closePanel();
      expect(commentsState.isPanelOpen).toBe(false);
    });

    it('should handle multiple comments correctly', async () => {
      // Add multiple comments
      const comment1 = await commentsState.addComment(
        createMockCommentPayload({ content: 'Comment 1' }),
      );
      const comment2 = await commentsState.addComment(
        createMockCommentPayload({ content: 'Comment 2' }),
      );
      const comment3 = await commentsState.addComment(
        createMockCommentPayload({ content: 'Comment 3' }),
      );

      expect(commentsState.comments.size).toBe(3);
      expect(getActiveComments()).toHaveLength(3);

      // Resolve one
      await commentsState.resolveComment(comment2!.id, createMockAuthor());
      expect(getActiveComments()).toHaveLength(2);
      expect(getVisibleComments()).toHaveLength(2);

      // Delete another
      await commentsState.deleteComment(comment1!.id);
      expect(commentsState.comments.size).toBe(2);
      expect(getActiveComments()).toHaveLength(1);

      // Verify remaining
      expect(commentsState.getCommentById(comment3!.id)).toBeDefined();
      expect(commentsState.getCommentById(comment2!.id)).toBeDefined();
      expect(commentsState.getCommentById(comment1!.id)).toBeUndefined();
    });

    it('should handle rapid state changes', async () => {
      // Rapid panel toggling
      for (let i = 0; i < 10; i++) {
        commentsState.togglePanel();
      }
      expect(commentsState.isPanelOpen).toBe(false);

      // Rapid comment creation
      const comments = [];
      for (let i = 0; i < 5; i++) {
        const comment = await commentsState.addComment(
          createMockCommentPayload({ content: `Comment ${String(i)}` }),
        );
        comments.push(comment);
      }
      expect(commentsState.comments.size).toBe(5);

      // Rapid active comment changes
      for (const comment of comments) {
        commentsState.setActiveComment(comment!.id);
      }
      expect(commentsState.activeCommentId).toBe(comments[comments.length - 1]!.id);
    });
  });
});
