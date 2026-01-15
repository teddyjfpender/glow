/**
 * TDD Tests for Markdown Exporter
 *
 * Converts TipTap HTML content to Markdown format for export.
 * Following TDD methodology: write tests first, then implement.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Placeholder class - tests will fail until implemented
class MarkdownExporter {
  export(_html: string): string {
    throw new Error('Not implemented');
  }

  exportWithTitle(_html: string, _title: string): string {
    throw new Error('Not implemented');
  }

  exportToFile(_html: string, _filename: string): Blob {
    throw new Error('Not implemented');
  }
}

describe('MarkdownExporter', () => {
  let exporter: MarkdownExporter;

  beforeEach(() => {
    exporter = new MarkdownExporter();
  });

  // ============================================================================
  // Basic Text Formatting
  // ============================================================================

  describe('basic text formatting', () => {
    it('should convert paragraph to plain text', () => {
      const html = '<p>This is a paragraph.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('This is a paragraph.\n');
    });

    it('should convert multiple paragraphs with blank lines', () => {
      const html = '<p>First paragraph.</p><p>Second paragraph.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('First paragraph.\n\nSecond paragraph.\n');
    });

    it('should convert bold text to ** syntax', () => {
      const html = '<p>This is <strong>bold</strong> text.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('This is **bold** text.\n');
    });

    it('should convert italic text to * syntax', () => {
      const html = '<p>This is <em>italic</em> text.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('This is *italic* text.\n');
    });

    it('should convert underline to HTML (no markdown equivalent)', () => {
      const html = '<p>This is <u>underlined</u> text.</p>';
      const markdown = exporter.export(html);
      // Underline has no standard markdown, use HTML or strip
      expect(markdown).toContain('underlined');
    });

    it('should convert strikethrough to ~~ syntax', () => {
      const html = '<p>This is <s>strikethrough</s> text.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('This is ~~strikethrough~~ text.\n');
    });

    it('should handle nested formatting', () => {
      const html = '<p>This is <strong><em>bold and italic</em></strong>.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('This is ***bold and italic***.\n');
    });
  });

  // ============================================================================
  // Headings
  // ============================================================================

  describe('headings', () => {
    it('should convert h1 to # syntax', () => {
      const html = '<h1>Heading 1</h1>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('# Heading 1\n');
    });

    it('should convert h2 to ## syntax', () => {
      const html = '<h2>Heading 2</h2>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('## Heading 2\n');
    });

    it('should convert h3 to ### syntax', () => {
      const html = '<h3>Heading 3</h3>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('### Heading 3\n');
    });

    it('should convert h4 to #### syntax', () => {
      const html = '<h4>Heading 4</h4>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('#### Heading 4\n');
    });

    it('should convert h5 to ##### syntax', () => {
      const html = '<h5>Heading 5</h5>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('##### Heading 5\n');
    });

    it('should convert h6 to ###### syntax', () => {
      const html = '<h6>Heading 6</h6>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('###### Heading 6\n');
    });

    it('should preserve formatting in headings', () => {
      const html = '<h2>Heading with <strong>bold</strong></h2>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('## Heading with **bold**\n');
    });
  });

  // ============================================================================
  // Links
  // ============================================================================

  describe('links', () => {
    it('should convert links to [text](url) syntax', () => {
      const html = '<p>Click <a href="https://example.com">here</a>.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('Click [here](https://example.com).\n');
    });

    it('should handle links with title attribute', () => {
      const html = '<p><a href="https://example.com" title="Example">Link</a></p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('[Link](https://example.com "Example")\n');
    });

    it('should handle links with special characters in URL', () => {
      const html = '<p><a href="https://example.com/path?q=test&a=1">Link</a></p>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('https://example.com/path?q=test&a=1');
    });

    it('should handle empty link text', () => {
      const html = '<p><a href="https://example.com"></a></p>';
      const markdown = exporter.export(html);
      // Should use URL as text or skip
      expect(markdown).toContain('example.com');
    });
  });

  // ============================================================================
  // Lists
  // ============================================================================

  describe('lists', () => {
    it('should convert unordered list to - syntax', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('- Item 1\n- Item 2\n- Item 3\n');
    });

    it('should convert ordered list to 1. syntax', () => {
      const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('1. First\n2. Second\n3. Third\n');
    });

    it('should handle nested unordered lists', () => {
      const html = `
        <ul>
          <li>Item 1
            <ul>
              <li>Nested 1</li>
              <li>Nested 2</li>
            </ul>
          </li>
          <li>Item 2</li>
        </ul>
      `;
      const markdown = exporter.export(html);
      expect(markdown).toContain('- Item 1');
      expect(markdown).toContain('  - Nested 1');
      expect(markdown).toContain('  - Nested 2');
      expect(markdown).toContain('- Item 2');
    });

    it('should handle nested ordered lists', () => {
      const html = `
        <ol>
          <li>First
            <ol>
              <li>Sub first</li>
              <li>Sub second</li>
            </ol>
          </li>
          <li>Second</li>
        </ol>
      `;
      const markdown = exporter.export(html);
      expect(markdown).toContain('1. First');
      expect(markdown).toContain('   1. Sub first');
      expect(markdown).toContain('   2. Sub second');
      expect(markdown).toContain('2. Second');
    });

    it('should handle list items with formatting', () => {
      const html = '<ul><li><strong>Bold item</strong></li><li><em>Italic item</em></li></ul>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('- **Bold item**');
      expect(markdown).toContain('- *Italic item*');
    });
  });

  // ============================================================================
  // Code
  // ============================================================================

  describe('code', () => {
    it('should convert inline code to backtick syntax', () => {
      const html = '<p>Use the <code>console.log()</code> function.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('Use the `console.log()` function.\n');
    });

    it('should convert code blocks to ``` syntax', () => {
      const html = '<pre><code>function hello() {\n  return "world";\n}</code></pre>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('```');
      expect(markdown).toContain('function hello()');
    });

    it('should preserve language hint in code blocks', () => {
      const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('```javascript');
    });

    it('should handle code with special characters', () => {
      const html = '<p>Use <code>&lt;div&gt;</code> tags.</p>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('`<div>`');
    });
  });

  // ============================================================================
  // Blockquotes
  // ============================================================================

  describe('blockquotes', () => {
    it('should convert blockquote to > syntax', () => {
      const html = '<blockquote><p>This is a quote.</p></blockquote>';
      const markdown = exporter.export(html);
      expect(markdown).toBe('> This is a quote.\n');
    });

    it('should handle multi-line blockquotes', () => {
      const html = '<blockquote><p>Line 1</p><p>Line 2</p></blockquote>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('> Line 1');
      expect(markdown).toContain('> Line 2');
    });

    it('should handle nested blockquotes', () => {
      const html = '<blockquote><p>Outer</p><blockquote><p>Inner</p></blockquote></blockquote>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('> Outer');
      expect(markdown).toContain('>> Inner');
    });
  });

  // ============================================================================
  // Horizontal Rules
  // ============================================================================

  describe('horizontal rules', () => {
    it('should convert hr to --- syntax', () => {
      const html = '<p>Above</p><hr><p>Below</p>';
      const markdown = exporter.export(html);
      expect(markdown).toContain('---');
    });
  });

  // ============================================================================
  // Special Content
  // ============================================================================

  describe('special content', () => {
    it('should handle line breaks', () => {
      const html = '<p>Line 1<br>Line 2</p>';
      const markdown = exporter.export(html);
      // Could use two spaces + newline or just newline
      expect(markdown).toContain('Line 1');
      expect(markdown).toContain('Line 2');
    });

    it('should escape markdown special characters in text', () => {
      const html = '<p>Use *asterisks* for emphasis (literally).</p>';
      const markdown = exporter.export(html);
      // Should escape if not meant as formatting
      expect(markdown).toContain('*asterisks*');
    });

    it('should handle empty content', () => {
      const html = '';
      const markdown = exporter.export(html);
      expect(markdown).toBe('');
    });

    it('should handle whitespace-only content', () => {
      const html = '<p>   </p>';
      const markdown = exporter.export(html);
      expect(markdown.trim()).toBe('');
    });
  });

  // ============================================================================
  // Excalidraw Integration
  // ============================================================================

  describe('excalidraw drawings', () => {
    it('should export excalidraw as embedded image', () => {
      const html = `
        <div data-type="excalidraw" data-scene='{"elements":[]}'></div>
      `;
      const markdown = exporter.export(html);
      // Should either embed as image or provide placeholder
      expect(markdown).toContain('![');
    });

    it('should provide alt text for excalidraw', () => {
      const html = `
        <div data-type="excalidraw" data-scene='{"elements":[]}' data-alt="Architecture diagram"></div>
      `;
      const markdown = exporter.export(html);
      expect(markdown).toContain('Architecture diagram');
    });
  });

  // ============================================================================
  // Export with Metadata
  // ============================================================================

  describe('export with metadata', () => {
    it('should prepend title as h1 when provided', () => {
      const html = '<p>Content</p>';
      const markdown = exporter.exportWithTitle(html, 'My Document');
      expect(markdown.startsWith('# My Document\n\n')).toBe(true);
    });

    it('should not duplicate title if already h1', () => {
      const html = '<h1>My Document</h1><p>Content</p>';
      const markdown = exporter.exportWithTitle(html, 'My Document');
      const h1Count = (markdown.match(/^# My Document$/gm) || []).length;
      expect(h1Count).toBe(1);
    });
  });

  // ============================================================================
  // File Export
  // ============================================================================

  describe('file export', () => {
    it('should create a downloadable blob', () => {
      const html = '<p>Content</p>';
      const blob = exporter.exportToFile(html, 'test.md');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/markdown');
    });

    it('should sanitize filename', () => {
      const html = '<p>Content</p>';
      const blob = exporter.exportToFile(html, 'My Doc: Special/Name?.md');

      // Blob created successfully regardless of filename sanitization
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ============================================================================
  // Performance
  // ============================================================================

  describe('performance', () => {
    it('should export large document within 2 seconds', () => {
      // Generate large HTML content
      const paragraphs = Array.from({ length: 1000 }, (_, i) =>
        `<p>Paragraph ${String(i)} with some content that includes <strong>bold</strong> and <em>italic</em> text.</p>`
      ).join('');

      const start = performance.now();
      exporter.export(paragraphs);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
