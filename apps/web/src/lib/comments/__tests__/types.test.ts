import { describe, it, expect } from 'vitest';
import {
  REACTION_EMOJIS,
  createDefaultAuthor,
  type Comment,
  type TextRange,
  type Reply,
  type Reaction,
  type Author,
} from '../types';

describe('REACTION_EMOJIS', () => {
  it('should contain exactly 8 emojis', () => {
    expect(REACTION_EMOJIS).toHaveLength(8);
  });

  it('should contain the expected emojis', () => {
    expect(REACTION_EMOJIS).toContain('👍');
    expect(REACTION_EMOJIS).toContain('❤️');
    expect(REACTION_EMOJIS).toContain('😄');
    expect(REACTION_EMOJIS).toContain('🎉');
    expect(REACTION_EMOJIS).toContain('🤔');
    expect(REACTION_EMOJIS).toContain('👀');
    expect(REACTION_EMOJIS).toContain('🔥');
    expect(REACTION_EMOJIS).toContain('💯');
  });

  it('should be a readonly tuple', () => {
    // Verify it's an array (tuple at runtime)
    expect(Array.isArray(REACTION_EMOJIS)).toBe(true);
    // TypeScript enforces readonly at compile time, but we can verify
    // the values are as expected and the array structure is intact
    expect(REACTION_EMOJIS[0]).toBe('👍');
    expect(REACTION_EMOJIS[7]).toBe('💯');
  });
});

describe('createDefaultAuthor', () => {
  it('should return author with id "local-user"', () => {
    const author = createDefaultAuthor();
    expect(author.id).toBe('local-user');
  });

  it('should return author with name "You"', () => {
    const author = createDefaultAuthor();
    expect(author.name).toBe('You');
  });

  it('should return author with initials "YO"', () => {
    const author = createDefaultAuthor();
    expect(author.initials).toBe('YO');
  });

  it('should not have avatarUrl', () => {
    const author = createDefaultAuthor();
    expect(author.avatarUrl).toBeUndefined();
  });

  it('should create default author with all correct properties', () => {
    const author = createDefaultAuthor();
    expect(author).toEqual({
      id: 'local-user',
      name: 'You',
      initials: 'YO',
    });
  });
});

describe('Type structure validation', () => {
  describe('TextRange', () => {
    it('should have from, to, and quotedText properties', () => {
      const textRange: TextRange = {
        from: 0,
        to: 10,
        quotedText: 'sample text',
      };

      expect(textRange).toHaveProperty('from');
      expect(textRange).toHaveProperty('to');
      expect(textRange).toHaveProperty('quotedText');
      expect(typeof textRange.from).toBe('number');
      expect(typeof textRange.to).toBe('number');
      expect(typeof textRange.quotedText).toBe('string');
    });
  });

  describe('Author', () => {
    it('should have all required fields', () => {
      const author: Author = {
        id: 'user-123',
        name: 'John Doe',
        initials: 'JD',
      };

      expect(author).toHaveProperty('id');
      expect(author).toHaveProperty('name');
      expect(author).toHaveProperty('initials');
    });

    it('should allow optional avatarUrl', () => {
      const authorWithAvatar: Author = {
        id: 'user-123',
        name: 'John Doe',
        initials: 'JD',
        avatarUrl: 'https://example.com/avatar.png',
      };

      expect(authorWithAvatar.avatarUrl).toBe('https://example.com/avatar.png');
    });
  });

  describe('Reaction', () => {
    it('should have all required fields', () => {
      const reaction: Reaction = {
        id: 'reaction-1',
        emoji: '👍',
        authorId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(reaction).toHaveProperty('id');
      expect(reaction).toHaveProperty('emoji');
      expect(reaction).toHaveProperty('authorId');
      expect(reaction).toHaveProperty('createdAt');
      expect(typeof reaction.id).toBe('string');
      expect(typeof reaction.emoji).toBe('string');
      expect(typeof reaction.authorId).toBe('string');
      expect(typeof reaction.createdAt).toBe('string');
    });
  });

  describe('Reply', () => {
    it('should have all required fields', () => {
      const author: Author = {
        id: 'user-123',
        name: 'John Doe',
        initials: 'JD',
      };

      const reply: Reply = {
        id: 'reply-1',
        commentId: 'comment-1',
        content: 'This is a reply',
        author,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        reactions: [],
      };

      expect(reply).toHaveProperty('id');
      expect(reply).toHaveProperty('commentId');
      expect(reply).toHaveProperty('content');
      expect(reply).toHaveProperty('author');
      expect(reply).toHaveProperty('createdAt');
      expect(reply).toHaveProperty('updatedAt');
      expect(reply).toHaveProperty('reactions');
      expect(Array.isArray(reply.reactions)).toBe(true);
    });
  });

  describe('Comment', () => {
    it('should have all required fields', () => {
      const author: Author = {
        id: 'user-123',
        name: 'John Doe',
        initials: 'JD',
      };

      const textRange: TextRange = {
        from: 0,
        to: 10,
        quotedText: 'sample text',
      };

      const comment: Comment = {
        id: 'comment-1',
        documentId: 'doc-1',
        textRange,
        content: 'This is a comment',
        author,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        resolved: false,
        replies: [],
        reactions: [],
      };

      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('documentId');
      expect(comment).toHaveProperty('textRange');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('createdAt');
      expect(comment).toHaveProperty('updatedAt');
      expect(comment).toHaveProperty('resolved');
      expect(comment).toHaveProperty('replies');
      expect(comment).toHaveProperty('reactions');
      expect(typeof comment.resolved).toBe('boolean');
      expect(Array.isArray(comment.replies)).toBe(true);
      expect(Array.isArray(comment.reactions)).toBe(true);
    });

    it('should allow optional resolved fields', () => {
      const author: Author = {
        id: 'user-123',
        name: 'John Doe',
        initials: 'JD',
      };

      const resolver: Author = {
        id: 'user-456',
        name: 'Jane Doe',
        initials: 'JA',
      };

      const textRange: TextRange = {
        from: 0,
        to: 10,
        quotedText: 'sample text',
      };

      const resolvedComment: Comment = {
        id: 'comment-1',
        documentId: 'doc-1',
        textRange,
        content: 'This is a resolved comment',
        author,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        resolved: true,
        resolvedAt: '2024-01-01T12:00:00Z',
        resolvedBy: resolver,
        replies: [],
        reactions: [],
      };

      expect(resolvedComment.resolved).toBe(true);
      expect(resolvedComment.resolvedAt).toBe('2024-01-01T12:00:00Z');
      expect(resolvedComment.resolvedBy).toEqual(resolver);
    });
  });
});
