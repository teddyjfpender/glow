<script lang="ts">
  const codeBlockExample = `\`\`\`javascript
function hello() {
  console.log('Hello, world!');
}
\`\`\``;
</script>

<article class="docs-page">
  <header class="docs-header">
    <h1>Editor</h1>
    <p class="lead">
      A powerful rich text editor built for speed and flexibility.
      Learn how to use all the editing features Glow offers.
    </p>
  </header>

  <section>
    <h2>Overview</h2>
    <p>
      Glow's editor is built on TipTap, a headless editor framework that provides
      a smooth, reliable editing experience. It supports rich text formatting,
      markdown shortcuts, code blocks, and more.
    </p>
  </section>

  <section>
    <h2>Text Formatting</h2>
    <p>Format your text using the toolbar or keyboard shortcuts:</p>

    <div class="format-table">
      <div class="format-row header">
        <span class="format-name">Format</span>
        <span class="format-shortcut">Shortcut</span>
        <span class="format-markdown">Markdown</span>
      </div>
      <div class="format-row">
        <span class="format-name"><strong>Bold</strong></span>
        <span class="format-shortcut"><kbd>Cmd</kbd> + <kbd>B</kbd></span>
        <span class="format-markdown"><code>**text**</code></span>
      </div>
      <div class="format-row">
        <span class="format-name"><em>Italic</em></span>
        <span class="format-shortcut"><kbd>Cmd</kbd> + <kbd>I</kbd></span>
        <span class="format-markdown"><code>*text*</code></span>
      </div>
      <div class="format-row">
        <span class="format-name"><u>Underline</u></span>
        <span class="format-shortcut"><kbd>Cmd</kbd> + <kbd>U</kbd></span>
        <span class="format-markdown">—</span>
      </div>
      <div class="format-row">
        <span class="format-name"><s>Strikethrough</s></span>
        <span class="format-shortcut"><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></span>
        <span class="format-markdown"><code>~~text~~</code></span>
      </div>
      <div class="format-row">
        <span class="format-name"><code>Code</code></span>
        <span class="format-shortcut"><kbd>Cmd</kbd> + <kbd>E</kbd></span>
        <span class="format-markdown"><code>`text`</code></span>
      </div>
    </div>
  </section>

  <section>
    <h2>Headings</h2>
    <p>
      Structure your documents with headings. Type the markdown shortcut at the
      start of a line, or use keyboard shortcuts:
    </p>
    <ul>
      <li><code># </code> or <kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>1</kbd> — Heading 1</li>
      <li><code>## </code> or <kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>2</kbd> — Heading 2</li>
      <li><code>### </code> or <kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>3</kbd> — Heading 3</li>
    </ul>
  </section>

  <section>
    <h2>Lists</h2>

    <h3>Bullet Lists</h3>
    <p>
      Create bullet lists by typing <code>- </code> or <code>* </code> at the start of a line.
      Press <kbd>Tab</kbd> to indent, <kbd>Shift</kbd> + <kbd>Tab</kbd> to outdent.
    </p>

    <h3>Numbered Lists</h3>
    <p>
      Create numbered lists by typing <code>1. </code> at the start of a line.
      Numbers automatically increment as you add items.
    </p>

    <h3>Task Lists</h3>
    <p>
      Create task lists by typing <code>[ ] </code> at the start of a line.
      Click the checkbox to toggle completion.
    </p>
  </section>

  <section>
    <h2>Blockquotes</h2>
    <p>
      Type <code>&gt; </code> at the start of a line to create a blockquote.
      Great for highlighting important information or citing sources.
    </p>
    <div class="example-box">
      <blockquote>
        This is an example blockquote. Use them to emphasize key points or quote external sources.
      </blockquote>
    </div>
  </section>

  <section>
    <h2>Code Blocks</h2>
    <p>
      Type <code>```</code> followed by an optional language name to create a code block:
    </p>
    <div class="example-box">
      <pre><code>{codeBlockExample}</code></pre>
    </div>
    <p>
      Syntax highlighting is supported for many programming languages including
      JavaScript, TypeScript, Python, and more.
    </p>
  </section>

  <section>
    <h2>Links</h2>
    <p>Add links to your documents in two ways:</p>
    <ul>
      <li>
        <strong>Paste a URL</strong> — Select text and paste a URL to automatically
        create a link
      </li>
      <li>
        <strong>Keyboard shortcut</strong> — Select text and press
        <kbd>Cmd</kbd> + <kbd>K</kbd> to open the link dialog
      </li>
    </ul>
  </section>

  <section>
    <h2>Horizontal Rules</h2>
    <p>
      Type <code>---</code> or <code>***</code> on a new line to insert a horizontal rule.
      Use these to separate sections of your document.
    </p>
  </section>

  <section>
    <h2>Undo and Redo</h2>
    <p>
      Made a mistake? Use these shortcuts to undo or redo changes:
    </p>
    <ul>
      <li><kbd>Cmd</kbd> + <kbd>Z</kbd> — Undo</li>
      <li><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> — Redo</li>
    </ul>
  </section>

  <section>
    <h2>Auto-Save</h2>
    <p>
      Your document saves automatically as you type. Look for the "Saved" indicator
      in the header to confirm your changes are stored. Documents are saved to
      your browser's IndexedDB storage.
    </p>
    <div class="info-box">
      <strong>Tip:</strong> Your documents persist across browser sessions, but
      clearing browser data will delete them. Consider exporting important documents
      regularly.
    </div>
  </section>

  <section>
    <h2>Next Steps</h2>
    <ul>
      <li><a href="/docs/drawing">Learn about drawing with Excalidraw</a></li>
      <li><a href="/docs/shortcuts">View all keyboard shortcuts</a></li>
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

  ul {
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

  /* Format table */
  .format-table {
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .format-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 12px 16px;
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .format-row:last-child {
    border-bottom: none;
  }

  .format-row.header {
    background-color: var(--glow-bg-elevated);
    font-weight: 600;
    font-size: 13px;
    color: var(--glow-text-secondary);
  }

  .format-name {
    color: var(--glow-text-primary);
  }

  .format-shortcut, .format-markdown {
    color: var(--glow-text-secondary);
    font-size: 14px;
  }

  /* Example box */
  .example-box {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .example-box blockquote {
    margin: 0;
    padding-left: 16px;
    border-left: 3px solid var(--glow-accent);
    color: var(--glow-text-secondary);
    font-style: italic;
  }

  .example-box pre {
    margin: 0;
    background-color: var(--glow-bg-elevated);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }

  .example-box pre code {
    background: none;
    padding: 0;
    font-size: 13px;
  }

  /* Info box */
  .info-box {
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 16px;
    font-size: 14px;
    color: var(--glow-text-secondary);
  }

  .info-box strong {
    color: var(--glow-accent);
  }
</style>
