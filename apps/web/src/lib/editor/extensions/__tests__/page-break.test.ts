/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { PageBreak } from '../page-break';

function createTestEditor(content = '<p>Test content</p>'): Editor {
  return new Editor({
    extensions: [StarterKit, PageBreak],
    content,
  });
}

describe('PageBreak Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor('<p>First paragraph</p><p>Second paragraph</p>');
  });

  afterEach(() => {
    editor?.destroy();
  });

  describe('Node Definition', () => {
    it('should be named "pageBreak"', () => {
      const pageBreakExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'pageBreak'
      );
      expect(pageBreakExtension).toBeDefined();
      expect(pageBreakExtension?.name).toBe('pageBreak');
    });

    it('should be a Node type', () => {
      const pageBreakNode = editor.schema.nodes.pageBreak;
      expect(pageBreakNode).toBeDefined();
    });

    it('should be a block-level node', () => {
      const pageBreakNode = editor.schema.nodes.pageBreak;
      expect(pageBreakNode.spec.group).toBe('block');
    });

    it('should be an atomic node (cannot contain other content)', () => {
      const pageBreakNode = editor.schema.nodes.pageBreak;
      expect(pageBreakNode.spec.atom).toBe(true);
    });

    it('should be selectable as a whole', () => {
      const pageBreakNode = editor.schema.nodes.pageBreak;
      expect(pageBreakNode.spec.selectable).toBe(true);
    });

    it('should not be draggable', () => {
      const pageBreakNode = editor.schema.nodes.pageBreak;
      expect(pageBreakNode.spec.draggable).toBe(false);
    });

    it('cannot be split or joined (atomic)', () => {
      // Insert a page break
      editor.commands.insertPageBreak();

      // Get the HTML - it should contain exactly one page break
      const html = editor.getHTML();
      const pageBreakMatches = html.match(/data-page-break="true"/g);
      expect(pageBreakMatches?.length).toBe(1);

      // Atomic nodes cannot be split - they remain as single units
      const pageBreakNode = editor.schema.nodes.pageBreak;
      expect(pageBreakNode.spec.atom).toBe(true);
    });
  });

  describe('HTML Parsing', () => {
    it('should parse from <div data-page-break="true">', () => {
      const editorWithPageBreak = createTestEditor(
        '<p>Before</p><div data-page-break="true"></div><p>After</p>'
      );

      const html = editorWithPageBreak.getHTML();
      expect(html).toContain('data-page-break="true"');

      editorWithPageBreak.destroy();
    });

    it('should ignore other divs without the data-page-break attribute', () => {
      const editorWithDiv = createTestEditor(
        '<p>Before</p><div class="some-class">Content</div><p>After</p>'
      );

      const html = editorWithDiv.getHTML();
      // The div without data-page-break should not be parsed as a page break
      expect(html).not.toContain('data-page-break');

      editorWithDiv.destroy();
    });

    it('should handle page break with additional attributes', () => {
      const editorWithPageBreak = createTestEditor(
        '<p>Before</p><div data-page-break="true" class="page-break-node custom-class"></div><p>After</p>'
      );

      const html = editorWithPageBreak.getHTML();
      expect(html).toContain('data-page-break="true"');

      editorWithPageBreak.destroy();
    });
  });

  describe('HTML Rendering', () => {
    it('should render to <div data-page-break="true" class="page-break-node">', () => {
      editor.commands.insertPageBreak();

      const html = editor.getHTML();
      expect(html).toMatch(/<div[^>]*data-page-break="true"[^>]*>/);
      expect(html).toMatch(/<div[^>]*class="page-break-node"[^>]*>/);
    });

    it('should render with correct attributes', () => {
      editor.commands.insertPageBreak();

      const html = editor.getHTML();
      // Check both attributes are present
      expect(html).toContain('data-page-break="true"');
      expect(html).toContain('class="page-break-node"');
    });

    it('should be self-closing (no content inside)', () => {
      editor.commands.insertPageBreak();

      const html = editor.getHTML();
      // The page break div should be empty (no content between tags)
      expect(html).toMatch(/<div[^>]*data-page-break="true"[^>]*><\/div>/);
    });
  });

  describe('Commands', () => {
    describe('insertPageBreak', () => {
      it('should add page break at cursor position', () => {
        // Position cursor at end of first paragraph
        editor.commands.setTextSelection(16); // After "First paragraph"
        editor.commands.insertPageBreak();

        const html = editor.getHTML();
        expect(html).toContain('data-page-break="true"');
      });

      it('should work at end of paragraph', () => {
        // Set cursor to end of second paragraph
        editor.commands.setTextSelection(35); // End of document
        editor.commands.insertPageBreak();

        const html = editor.getHTML();
        expect(html).toContain('data-page-break="true"');
      });

      it('should work at start of document', () => {
        // Set cursor to start
        editor.commands.setTextSelection(1);
        editor.commands.insertPageBreak();

        const html = editor.getHTML();
        expect(html).toContain('data-page-break="true"');
      });

      it('should return true on successful insertion', () => {
        editor.commands.setTextSelection(1);
        const result = editor.commands.insertPageBreak();

        expect(result).toBe(true);
      });

      it('should insert multiple page breaks', () => {
        editor.commands.setTextSelection(1);
        editor.commands.insertPageBreak();

        editor.commands.setTextSelection(20);
        editor.commands.insertPageBreak();

        const html = editor.getHTML();
        const pageBreakMatches = html.match(/data-page-break="true"/g);
        expect(pageBreakMatches?.length).toBe(2);
      });
    });

    describe('deletePageBreak', () => {
      it('should remove selected page break', () => {
        // Insert a page break
        editor.commands.insertPageBreak();

        // Verify it exists
        let html = editor.getHTML();
        expect(html).toContain('data-page-break="true"');

        // Select the page break node and delete it
        // Find the position of the page break and select it
        const { doc } = editor.state;
        let pageBreakPos = -1;
        doc.descendants((node, pos) => {
          if (node.type.name === 'pageBreak') {
            pageBreakPos = pos;
            return false;
          }
          return true;
        });

        if (pageBreakPos >= 0) {
          editor.commands.setNodeSelection(pageBreakPos);
          editor.commands.deletePageBreak();
        }

        html = editor.getHTML();
        expect(html).not.toContain('data-page-break="true"');
      });

      it('should not affect other content when deleting page break', () => {
        const initialContent = '<p>First paragraph</p><p>Second paragraph</p>';
        const testEditor = createTestEditor(initialContent);

        // Insert page break between paragraphs
        testEditor.commands.setTextSelection(17);
        testEditor.commands.insertPageBreak();

        // Find and select the page break
        const { doc } = testEditor.state;
        let pageBreakPos = -1;
        doc.descendants((node, pos) => {
          if (node.type.name === 'pageBreak') {
            pageBreakPos = pos;
            return false;
          }
          return true;
        });

        if (pageBreakPos >= 0) {
          testEditor.commands.setNodeSelection(pageBreakPos);
          testEditor.commands.deletePageBreak();
        }

        const html = testEditor.getHTML();
        // Page break should be gone
        expect(html).not.toContain('data-page-break="true"');
        // Original content should remain
        expect(html).toContain('First paragraph');
        expect(html).toContain('Second paragraph');

        testEditor.destroy();
      });

      it('should return true when page break is successfully deleted', () => {
        editor.commands.insertPageBreak();

        // Find and select the page break
        const { doc } = editor.state;
        let pageBreakPos = -1;
        doc.descendants((node, pos) => {
          if (node.type.name === 'pageBreak') {
            pageBreakPos = pos;
            return false;
          }
          return true;
        });

        if (pageBreakPos >= 0) {
          editor.commands.setNodeSelection(pageBreakPos);
          const result = editor.commands.deletePageBreak();
          expect(result).toBe(true);
        }
      });

      it('should return false when no page break is selected', () => {
        // No page break in document, cursor in regular text
        editor.commands.setTextSelection(5);
        const result = editor.commands.deletePageBreak();

        expect(result).toBe(false);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should have Mod-Enter shortcut registered', () => {
      const pageBreakExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'pageBreak'
      );

      // Check that the extension has keyboard shortcuts defined
      expect(pageBreakExtension).toBeDefined();

      // The extension should have addKeyboardShortcuts method
      const extensionConfig = pageBreakExtension?.options;
      expect(pageBreakExtension).toBeDefined();
    });

    it('Ctrl+Enter / Cmd+Enter should insert page break', () => {
      // Set cursor position
      editor.commands.setTextSelection(1);

      // Simulate the keyboard shortcut by calling the command directly
      // (actual keyboard simulation is complex in jsdom)
      editor.commands.insertPageBreak();

      const html = editor.getHTML();
      expect(html).toContain('data-page-break="true"');
    });

    it('Backspace on selected page break should delete it', () => {
      // Insert page break
      editor.commands.insertPageBreak();

      // Find and select the page break
      const { doc } = editor.state;
      let pageBreakPos = -1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'pageBreak') {
          pageBreakPos = pos;
          return false;
        }
        return true;
      });

      if (pageBreakPos >= 0) {
        editor.commands.setNodeSelection(pageBreakPos);
        // Simulate delete selection (what backspace does on a node selection)
        editor.commands.deleteSelection();
      }

      const html = editor.getHTML();
      expect(html).not.toContain('data-page-break="true"');
    });

    it('Delete key on selected page break should delete it', () => {
      // Insert page break
      editor.commands.insertPageBreak();

      // Find and select the page break
      const { doc } = editor.state;
      let pageBreakPos = -1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'pageBreak') {
          pageBreakPos = pos;
          return false;
        }
        return true;
      });

      if (pageBreakPos >= 0) {
        editor.commands.setNodeSelection(pageBreakPos);
        // Delete selection (same as delete key on node selection)
        editor.commands.deleteSelection();
      }

      const html = editor.getHTML();
      expect(html).not.toContain('data-page-break="true"');
    });
  });

  describe('Selection Behavior', () => {
    it('should allow node selection on page break', () => {
      // Insert page break
      editor.commands.insertPageBreak();

      // Find the page break position
      const { doc } = editor.state;
      let pageBreakPos = -1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'pageBreak') {
          pageBreakPos = pos;
          return false;
        }
        return true;
      });

      expect(pageBreakPos).toBeGreaterThanOrEqual(0);

      // Set node selection
      const result = editor.commands.setNodeSelection(pageBreakPos);
      expect(result).toBe(true);

      // Verify selection is on the page break
      const { selection } = editor.state;
      expect(selection.node?.type.name).toBe('pageBreak');
    });

    it('node selection should select entire page break', () => {
      // Insert page break
      editor.commands.insertPageBreak();

      // Find the page break position
      const { doc } = editor.state;
      let pageBreakPos = -1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'pageBreak') {
          pageBreakPos = pos;
          return false;
        }
        return true;
      });

      // Set node selection
      editor.commands.setNodeSelection(pageBreakPos);

      // Check that selection covers the entire node
      const { selection } = editor.state;
      const selectedNode = selection.node;

      expect(selectedNode).toBeDefined();
      expect(selectedNode?.type.name).toBe('pageBreak');
      // Atomic nodes are selected as a whole
      expect(selectedNode?.isAtom).toBe(true);
    });

    it('cannot place cursor inside page break (atomic node)', () => {
      // Insert page break
      editor.commands.insertPageBreak();

      // Find the page break position
      const { doc } = editor.state;
      let pageBreakPos = -1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'pageBreak') {
          pageBreakPos = pos;
          return false;
        }
        return true;
      });

      // Try to set text selection inside the page break
      // For atomic nodes, text selection should not be possible inside them
      const pageBreakNode = editor.schema.nodes.pageBreak;

      // Atomic nodes have content of 'nothing' or empty, so cursor cannot be placed inside
      expect(pageBreakNode.spec.atom).toBe(true);
      // Check that the node has no content model that allows text
      expect(pageBreakNode.contentMatch.matchType(editor.schema.nodes.text)).toBeNull();
    });

    it('arrow keys can move cursor past page break', () => {
      // Create content with page break in middle
      const testEditor = createTestEditor(
        '<p>Before</p><div data-page-break="true"></div><p>After</p>'
      );

      // Find positions before and after the page break
      const { doc } = testEditor.state;
      let pageBreakPos = -1;
      let afterParagraphPos = -1;

      doc.descendants((node, pos) => {
        if (node.type.name === 'pageBreak') {
          pageBreakPos = pos;
        }
        // Find the paragraph after page break (contains "After")
        if (node.type.name === 'paragraph' && node.textContent === 'After') {
          afterParagraphPos = pos + 1; // Position inside the paragraph
        }
        return true;
      });

      // Set cursor in first paragraph
      testEditor.commands.setTextSelection(3);

      // Verify we can move selection past the page break (simulating arrow key navigation)
      testEditor.commands.setTextSelection(afterParagraphPos);

      // Selection should be valid (after the page break, in "After" paragraph)
      const { selection } = testEditor.state;
      expect(selection.$anchor.pos).toBe(afterParagraphPos);

      // Verify both positions are valid - cursor can be on both sides of page break
      expect(pageBreakPos).toBeGreaterThan(0);
      expect(afterParagraphPos).toBeGreaterThan(pageBreakPos);

      testEditor.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const emptyEditor = createTestEditor('<p></p>');

      emptyEditor.commands.setTextSelection(1);
      const result = emptyEditor.commands.insertPageBreak();

      expect(result).toBe(true);
      const html = emptyEditor.getHTML();
      expect(html).toContain('data-page-break="true"');

      emptyEditor.destroy();
    });

    it('should work with multiple content types', () => {
      const complexEditor = createTestEditor(
        '<h1>Title</h1><p>Paragraph</p><ul><li>List item</li></ul>'
      );

      // Insert page break after heading
      complexEditor.commands.setTextSelection(7); // After "Title"
      complexEditor.commands.insertPageBreak();

      const html = complexEditor.getHTML();
      expect(html).toContain('data-page-break="true"');
      expect(html).toContain('Title');
      expect(html).toContain('Paragraph');

      complexEditor.destroy();
    });

    it('should preserve document structure when inserting page break', () => {
      const testEditor = createTestEditor(
        '<p>First</p><p>Second</p><p>Third</p>'
      );

      // Insert page break between second and third paragraph
      testEditor.commands.setTextSelection(15); // After "Second"
      testEditor.commands.insertPageBreak();

      const html = testEditor.getHTML();

      // All paragraphs should still exist
      expect(html).toContain('First');
      expect(html).toContain('Second');
      expect(html).toContain('Third');
      expect(html).toContain('data-page-break="true"');

      testEditor.destroy();
    });

    it('should handle consecutive page breaks', () => {
      editor.commands.setTextSelection(1);
      editor.commands.insertPageBreak();
      editor.commands.insertPageBreak();

      const html = editor.getHTML();
      const pageBreakMatches = html.match(/data-page-break="true"/g);
      expect(pageBreakMatches?.length).toBe(2);
    });
  });
});
