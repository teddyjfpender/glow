/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CommentMark } from '../comment-mark';

function createTestEditor(content = '<p>Hello world</p>'): Editor {
  return new Editor({
    extensions: [StarterKit, CommentMark],
    content,
  });
}

describe('CommentMark Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor('<p>Some text to comment on</p>');
  });

  afterEach(() => {
    editor?.destroy();
  });

  describe('Extension Configuration', () => {
    it('should be named "comment"', () => {
      const commentExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'comment'
      );
      expect(commentExtension).toBeDefined();
      expect(commentExtension?.name).toBe('comment');
    });

    it('should be a Mark type', () => {
      const commentMark = editor.schema.marks.comment;
      expect(commentMark).toBeDefined();
    });
  });

  describe('setComment Command', () => {
    it('should add comment mark to selection', () => {
      // Select "Some" (positions 1-5 in the paragraph)
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="test-comment-1"');
    });

    it('should set commentId attribute correctly', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('unique-id-123');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="unique-id-123"');
    });

    it('should have active=false by default', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-active="false"');
    });

    it('should add comment-highlight class', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');

      const html = editor.getHTML();
      expect(html).toContain('class="comment-highlight"');
    });

    it('should allow multiple comments on different text ranges', () => {
      // Add first comment on "Some"
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('comment-1');

      // Add second comment on "text"
      editor.commands.setTextSelection({ from: 6, to: 10 });
      editor.commands.setComment('comment-2');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-1"');
      expect(html).toContain('data-comment-id="comment-2"');
    });
  });

  describe('unsetComment Command', () => {
    it('should remove comment mark by ID', () => {
      // Add comment
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');

      // Verify it exists
      let html = editor.getHTML();
      expect(html).toContain('data-comment-id="test-comment-1"');

      // Remove it
      editor.commands.unsetComment('test-comment-1');

      html = editor.getHTML();
      expect(html).not.toContain('data-comment-id="test-comment-1"');
    });

    it('should not affect other comment marks with different IDs', () => {
      // Add first comment
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('comment-to-keep');

      // Add second comment
      editor.commands.setTextSelection({ from: 6, to: 10 });
      editor.commands.setComment('comment-to-remove');

      // Remove only the second comment
      editor.commands.unsetComment('comment-to-remove');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-to-keep"');
      expect(html).not.toContain('data-comment-id="comment-to-remove"');
    });

    it('should return false when no comment with given ID exists', () => {
      const result = editor.commands.unsetComment('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('setActiveComment Command', () => {
    it('should set active=true for target comment', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');

      editor.commands.setActiveComment('test-comment-1');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-active="true"');
    });

    it('should set active=false for all other comments', () => {
      // Add two comments
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('comment-1');

      editor.commands.setTextSelection({ from: 6, to: 10 });
      editor.commands.setComment('comment-2');

      // First, activate comment-1
      editor.commands.setActiveComment('comment-1');

      // Then activate comment-2
      editor.commands.setActiveComment('comment-2');

      const html = editor.getHTML();
      // comment-2 should be active
      expect(html).toMatch(/data-comment-id="comment-2"[^>]*data-comment-active="true"/);
      // comment-1 should be inactive
      expect(html).toMatch(/data-comment-id="comment-1"[^>]*data-comment-active="false"/);
    });

    it('should handle activating non-existent comment gracefully', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('existing-comment');

      // This should not throw and should return false
      const result = editor.commands.setActiveComment('non-existent');
      expect(result).toBe(false);

      // Existing comment should remain unchanged
      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="existing-comment"');
    });
  });

  describe('clearActiveComment Command', () => {
    it('should set active=false for all comment marks', () => {
      // Add and activate a comment
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');
      editor.commands.setActiveComment('test-comment-1');

      // Verify it's active
      let html = editor.getHTML();
      expect(html).toContain('data-comment-active="true"');

      // Clear active
      editor.commands.clearActiveComment();

      html = editor.getHTML();
      expect(html).toContain('data-comment-active="false"');
      expect(html).not.toContain('data-comment-active="true"');
    });

    it('should clear active state from multiple comments', () => {
      // Add two comments
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('comment-1');

      editor.commands.setTextSelection({ from: 6, to: 10 });
      editor.commands.setComment('comment-2');

      // Activate one
      editor.commands.setActiveComment('comment-1');

      // Clear all
      editor.commands.clearActiveComment();

      const html = editor.getHTML();
      // Both should be inactive
      expect(html).not.toContain('data-comment-active="true"');
    });

    it('should return false when no active comments exist', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment-1');
      // Comment is added with active=false by default

      const result = editor.commands.clearActiveComment();
      expect(result).toBe(false);
    });
  });

  describe('HTML Output', () => {
    it('should render span with data-comment-id attribute', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('my-comment-id');

      const html = editor.getHTML();
      expect(html).toMatch(/<span[^>]*data-comment-id="my-comment-id"[^>]*>/);
    });

    it('should render span with data-comment-active attribute', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment');

      const html = editor.getHTML();
      expect(html).toMatch(/<span[^>]*data-comment-active="(true|false)"[^>]*>/);
    });

    it('should have comment-highlight class', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment');

      const html = editor.getHTML();
      expect(html).toMatch(/<span[^>]*class="comment-highlight"[^>]*>/);
    });

    it('should preserve text content within the span', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('test-comment');

      const html = editor.getHTML();
      expect(html).toContain('>Some<');
    });
  });

  describe('HTML Parsing', () => {
    it('should parse comment marks from HTML', () => {
      const editorWithComments = createTestEditor(
        '<p><span data-comment-id="parsed-comment" data-comment-active="false" class="comment-highlight">Hello</span> world</p>'
      );

      const html = editorWithComments.getHTML();
      expect(html).toContain('data-comment-id="parsed-comment"');

      editorWithComments.destroy();
    });

    it('should parse active state from HTML', () => {
      const editorWithActiveComment = createTestEditor(
        '<p><span data-comment-id="active-comment" data-comment-active="true" class="comment-highlight">Hello</span></p>'
      );

      const html = editorWithActiveComment.getHTML();
      expect(html).toContain('data-comment-active="true"');

      editorWithActiveComment.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selection gracefully', () => {
      // Set cursor position without selection
      editor.commands.setTextSelection(1);

      // This should not throw
      const result = editor.commands.setComment('test-comment');
      expect(result).toBe(true);
    });

    it('should handle special characters in comment ID', () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setComment('comment-with-special-chars_123');

      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-with-special-chars_123"');
    });

    it('should work with multi-paragraph content', () => {
      const multiParagraphEditor = createTestEditor(
        '<p>First paragraph</p><p>Second paragraph</p>'
      );

      // Comment on first paragraph
      multiParagraphEditor.commands.setTextSelection({ from: 1, to: 6 });
      multiParagraphEditor.commands.setComment('comment-1');

      const html = multiParagraphEditor.getHTML();
      expect(html).toContain('data-comment-id="comment-1"');

      multiParagraphEditor.destroy();
    });
  });
});
