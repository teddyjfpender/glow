<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<article class="docs-page">
  <header class="docs-header">
    <h1>Drawing</h1>
    <p class="lead">
      Create diagrams, sketches, and visual content with Excalidraw
      embedded directly in your documents.
    </p>
  </header>

  <section>
    <h2>Overview</h2>
    <p>
      Glow integrates Excalidraw, a powerful whiteboard tool for creating
      hand-drawn style diagrams. Drawings are embedded inline with your text,
      making it easy to combine written content with visual explanations.
    </p>
  </section>

  <section>
    <h2>Inserting a Drawing</h2>
    <p>There are several ways to add a drawing to your document:</p>
    <ul>
      <li>
        <strong>Keyboard shortcut</strong> — Press
        <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd>
      </li>
      <li>
        <strong>Toolbar</strong> — Click the drawing icon in the editor toolbar
      </li>
    </ul>
    <p>
      A new Excalidraw canvas appears at your cursor position. The canvas
      starts in an inactive state showing a preview of the drawing.
    </p>
  </section>

  <section>
    <h2>Editing a Drawing</h2>
    <p>
      Click on a drawing canvas to activate it and enter drawing mode.
      When active, the canvas shows the full Excalidraw toolbar with
      all drawing tools available.
    </p>
    <p>
      To exit drawing mode:
    </p>
    <ul>
      <li>Click outside the canvas</li>
      <li>Press <kbd>Escape</kbd></li>
    </ul>
  </section>

  <section>
    <h2>Drawing Tools</h2>
    <p>
      Excalidraw provides a variety of tools for creating diagrams:
    </p>

    <div class="tools-grid">
      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
        <h3>Rectangle</h3>
        <p>Draw rectangles and squares. Hold <kbd>Shift</kbd> for perfect squares.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h3>Ellipse</h3>
        <p>Draw ellipses and circles. Hold <kbd>Shift</kbd> for perfect circles.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 22,22 2,22" />
          </svg>
        </div>
        <h3>Diamond</h3>
        <p>Draw diamond shapes for flowcharts and decision points.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <h3>Arrow</h3>
        <p>Draw arrows to show direction and relationships.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14" />
          </svg>
        </div>
        <h3>Line</h3>
        <p>Draw straight lines to connect elements.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 17c4-6 8 2 12-4s4-8 6-4" />
          </svg>
        </div>
        <h3>Pencil</h3>
        <p>Free-hand drawing for sketches and annotations.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <text x="6" y="18" font-size="14" fill="currentColor" stroke="none">T</text>
          </svg>
        </div>
        <h3>Text</h3>
        <p>Add text labels to your diagrams.</p>
      </div>

      <div class="tool-card">
        <div class="tool-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="5" width="14" height="14" rx="2" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <h3>Frame</h3>
        <p>Group elements together in a frame.</p>
      </div>
    </div>
  </section>

  <section>
    <h2>Keyboard Shortcuts in Excalidraw</h2>
    <p>Speed up your drawing workflow with these shortcuts:</p>

    <div class="shortcuts-table">
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>R</kbd></span>
        <span class="shortcut-desc">Rectangle tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>O</kbd></span>
        <span class="shortcut-desc">Ellipse tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>D</kbd></span>
        <span class="shortcut-desc">Diamond tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>A</kbd></span>
        <span class="shortcut-desc">Arrow tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>L</kbd></span>
        <span class="shortcut-desc">Line tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>P</kbd></span>
        <span class="shortcut-desc">Pencil (free draw)</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>T</kbd></span>
        <span class="shortcut-desc">Text tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>V</kbd></span>
        <span class="shortcut-desc">Selection tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>E</kbd></span>
        <span class="shortcut-desc">Eraser tool</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>Cmd</kbd> + <kbd>A</kbd></span>
        <span class="shortcut-desc">Select all</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>Cmd</kbd> + <kbd>D</kbd></span>
        <span class="shortcut-desc">Duplicate selection</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-key"><kbd>Cmd</kbd> + <kbd>G</kbd></span>
        <span class="shortcut-desc">Group selection</span>
      </div>
    </div>
  </section>

  <section>
    <h2>Styling Elements</h2>
    <p>
      Customize the appearance of your drawings using the styling panel:
    </p>
    <ul>
      <li><strong>Stroke color</strong> — Change the outline color</li>
      <li><strong>Background color</strong> — Fill shapes with color</li>
      <li><strong>Stroke width</strong> — Adjust line thickness</li>
      <li><strong>Stroke style</strong> — Solid, dashed, or dotted lines</li>
      <li><strong>Fill style</strong> — Solid, hachure, cross-hatch, or none</li>
      <li><strong>Opacity</strong> — Make elements semi-transparent</li>
    </ul>
  </section>

  <section>
    <h2>Canvas Options</h2>

    <h3>Zoom</h3>
    <p>
      Use the scroll wheel to zoom in and out, or use <kbd>Cmd</kbd> + <kbd>+</kbd>
      and <kbd>Cmd</kbd> + <kbd>-</kbd>. Press <kbd>Cmd</kbd> + <kbd>0</kbd> to
      reset zoom to 100%.
    </p>

    <h3>Pan</h3>
    <p>
      Hold <kbd>Space</kbd> and drag to pan around the canvas, or use the
      scroll wheel while holding <kbd>Cmd</kbd>.
    </p>

    <h3>Grid</h3>
    <p>
      Toggle grid visibility in the canvas settings for precise alignment.
    </p>
  </section>

  <section>
    <h2>Tips for Better Diagrams</h2>
    <ul>
      <li>
        <strong>Use consistent colors</strong> — Stick to a color palette for
        a cohesive look
      </li>
      <li>
        <strong>Align elements</strong> — Use the grid or snap-to features
        for clean layouts
      </li>
      <li>
        <strong>Group related items</strong> — Select multiple elements and
        group them (<kbd>Cmd</kbd> + <kbd>G</kbd>) for easier manipulation
      </li>
      <li>
        <strong>Use the hand-drawn style</strong> — Excalidraw's signature
        style makes diagrams feel more approachable
      </li>
    </ul>
  </section>

  <section>
    <h2>Data Storage</h2>
    <p>
      Drawings are stored alongside your document content in IndexedDB.
      Each drawing's data is saved within the document, so there are no
      external dependencies or separate files to manage.
    </p>
  </section>

  <section>
    <h2>Next Steps</h2>
    <ul>
      <li><a href={resolve('/docs/editor')}>Learn more about the text editor</a></li>
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

  /* Tools grid */
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .tool-card {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    padding: 16px;
  }

  .tool-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 12px;
    color: var(--glow-accent);
  }

  .tool-icon svg {
    width: 100%;
    height: 100%;
  }

  .tool-card h3 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .tool-card p {
    font-size: 13px;
    margin: 0;
    line-height: 1.5;
  }

  /* Shortcuts table */
  .shortcuts-table {
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    overflow: hidden;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .shortcut-row:last-child {
    border-bottom: none;
  }

  .shortcut-row:nth-child(even) {
    background-color: var(--glow-bg-surface);
  }

  .shortcut-key {
    width: 140px;
    flex-shrink: 0;
  }

  .shortcut-desc {
    color: var(--glow-text-secondary);
    font-size: 14px;
  }

  @media (max-width: 640px) {
    .tools-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
