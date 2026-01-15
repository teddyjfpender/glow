<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<article class="docs-page">
  <header class="docs-header">
    <h1>Getting Started</h1>
    <p class="lead">
      Learn the basics of Glow and start creating beautiful documents in minutes.
    </p>
  </header>

  <section>
    <h2>Creating Your First Document</h2>
    <p>
      From the home page, click the <strong>New</strong> button in the top right corner,
      or click the blank template card. You can also use the keyboard shortcut
      <kbd>Cmd</kbd> + <kbd>N</kbd> (Mac) or <kbd>Ctrl</kbd> + <kbd>N</kbd> (Windows/Linux).
    </p>
    <p>
      Your new document opens immediately with a blank canvas. Start typing to add content,
      or click the title area to give your document a name.
    </p>
  </section>

  <section>
    <h2>Understanding the Interface</h2>

    <h3>The Toolbar</h3>
    <p>
      The toolbar at the top of the editor provides quick access to formatting options:
    </p>
    <ul>
      <li><strong>Text styles</strong> - Bold, italic, underline, strikethrough</li>
      <li><strong>Headings</strong> - H1, H2, H3 for document structure</li>
      <li><strong>Lists</strong> - Bullet points and numbered lists</li>
      <li><strong>Alignment</strong> - Left, center, right, justify</li>
      <li><strong>Links</strong> - Insert hyperlinks</li>
      <li><strong>Code</strong> - Inline code and code blocks</li>
      <li><strong>Drawing</strong> - Insert Excalidraw diagrams</li>
    </ul>

    <h3>The Document Area</h3>
    <p>
      The main editing area displays your content on a page-like canvas.
      As you type, your document automatically saves to your browser's local storage.
      Look for the "Saved" indicator in the header to confirm your changes are stored.
    </p>

    <h3>The Sidebar</h3>
    <p>
      The sidebar (when visible) shows your document outline based on headings,
      making it easy to navigate long documents.
    </p>
  </section>

  <section>
    <h2>Formatting Text</h2>
    <p>You can format text in several ways:</p>

    <h3>Using the Toolbar</h3>
    <p>
      Select text and click the appropriate button in the toolbar.
      This is the most visual way to format content.
    </p>

    <h3>Using Keyboard Shortcuts</h3>
    <p>
      For faster editing, use keyboard shortcuts:
    </p>
    <ul>
      <li><kbd>Cmd</kbd> + <kbd>B</kbd> - Bold</li>
      <li><kbd>Cmd</kbd> + <kbd>I</kbd> - Italic</li>
      <li><kbd>Cmd</kbd> + <kbd>U</kbd> - Underline</li>
      <li><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> - Strikethrough</li>
    </ul>

    <h3>Using Markdown</h3>
    <p>
      Type markdown syntax at the start of a line:
    </p>
    <ul>
      <li><code># </code> - Heading 1</li>
      <li><code>## </code> - Heading 2</li>
      <li><code>### </code> - Heading 3</li>
      <li><code>- </code> or <code>* </code> - Bullet list</li>
      <li><code>1. </code> - Numbered list</li>
      <li><code>> </code> - Blockquote</li>
      <li><code>``` </code> - Code block</li>
    </ul>
  </section>

  <section>
    <h2>Adding Drawings</h2>
    <p>
      Glow integrates Excalidraw for creating diagrams, sketches, and visual content
      directly in your documents.
    </p>
    <ol>
      <li>Place your cursor where you want the drawing</li>
      <li>Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> or click the drawing icon in the toolbar</li>
      <li>An Excalidraw canvas appears in your document</li>
      <li>Click on the canvas to start drawing</li>
      <li>Click outside the canvas or press <kbd>Escape</kbd> to exit drawing mode</li>
    </ol>
    <p>
      See the <a href={resolve('/docs/drawing')}>Drawing documentation</a> for more details on using Excalidraw.
    </p>
  </section>

  <section>
    <h2>Finding Documents</h2>
    <p>
      Use the search bar on the home page to find documents by title or content.
      Simply start typing, and results filter in real-time.
    </p>
    <p>
      Documents are sorted by last modified date, so your recent work is always at the top.
    </p>
  </section>

  <section>
    <h2>Managing Documents</h2>

    <h3>Duplicating</h3>
    <p>
      Right-click on a document card and select "Duplicate" to create a copy.
      This is useful for creating templates or variations of existing documents.
    </p>

    <h3>Deleting</h3>
    <p>
      Right-click on a document card and select "Delete" to remove it.
      <strong>Warning:</strong> Deleted documents cannot be recovered.
    </p>
  </section>

  <section>
    <h2>Data Storage</h2>
    <p>
      Glow stores all your documents locally in your browser using IndexedDB.
      This means:
    </p>
    <ul>
      <li><strong>Privacy</strong> - Your data never leaves your device</li>
      <li><strong>Speed</strong> - Documents load instantly</li>
      <li><strong>Offline</strong> - Works without internet connection</li>
    </ul>
    <div class="warning-box">
      <strong>Important:</strong> Clearing your browser data will delete all documents.
      Consider exporting important documents regularly (export feature coming soon).
    </div>
  </section>

  <section>
    <h2>Next Steps</h2>
    <ul>
      <li><a href={resolve('/docs/editor')}>Learn more about the editor</a></li>
      <li><a href={resolve('/docs/drawing')}>Master the drawing tools</a></li>
      <li><a href={resolve('/docs/shortcuts')}>View all keyboard shortcuts</a></li>
    </ul>
  </section>
</article>

<style>
  .docs-page {
    color: var(--glow-text-primary);
  }

  .docs-header {
    margin-bottom: 40px;
  }

  .docs-header h1 {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 12px;
    letter-spacing: -0.3px;
  }

  .lead {
    font-size: 18px;
    color: var(--glow-text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  section {
    margin-bottom: 40px;
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 24px 0 12px;
  }

  p {
    color: var(--glow-text-secondary);
    line-height: 1.7;
    margin: 0 0 16px;
  }

  ul, ol {
    color: var(--glow-text-secondary);
    line-height: 1.7;
    margin: 0 0 16px;
    padding-left: 24px;
  }

  li {
    margin-bottom: 8px;
  }

  a {
    color: var(--glow-accent);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  kbd {
    display: inline-block;
    padding: 2px 6px;
    font-family: inherit;
    font-size: 12px;
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-default);
    border-radius: 4px;
    box-shadow: 0 1px 0 var(--glow-border-default);
  }

  code {
    background-color: var(--glow-bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  }

  .warning-box {
    background-color: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
    font-size: 14px;
    color: var(--glow-text-secondary);
  }

  .warning-box strong {
    color: #eab308;
  }
</style>
