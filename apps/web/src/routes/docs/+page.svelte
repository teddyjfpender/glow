<script lang="ts">
  interface Feature {
    title: string;
    description: string;
    icon: string;
    href: string;
  }

  const features: Feature[] = [
    {
      title: 'Rich Text Editor',
      description: 'Powerful editing with formatting, lists, code blocks, and more.',
      icon: '📝',
      href: '/docs/editor',
    },
    {
      title: 'Integrated Drawing',
      description: 'Create diagrams and sketches with Excalidraw built right in.',
      icon: '✏️',
      href: '/docs/drawing',
    },
    {
      title: 'Keyboard First',
      description: 'Navigate and edit efficiently with comprehensive shortcuts.',
      icon: '⌨️',
      href: '/docs/shortcuts',
    },
    {
      title: 'Offline Ready',
      description: 'Your notes are stored locally and work without internet.',
      icon: '📴',
      href: '/docs/getting-started',
    },
  ];
</script>

<article class="docs-page">
  <header class="docs-header">
    <h1>Glow Documentation</h1>
    <p class="lead">
      A modern note-taking app with integrated drawing capabilities.
      Create beautiful documents with rich text and hand-drawn diagrams.
    </p>
  </header>

  <section class="features-grid">
    {#each features as feature}
      <a href={feature.href} class="feature-card">
        <span class="feature-icon">{feature.icon}</span>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </a>
    {/each}
  </section>

  <section class="quick-start">
    <h2>Quick Start</h2>
    <ol class="steps">
      <li>
        <strong>Create a document</strong>
        <p>Click the "New" button or press <kbd>Cmd</kbd> + <kbd>N</kbd> to create a new document.</p>
      </li>
      <li>
        <strong>Start writing</strong>
        <p>Use the toolbar or markdown shortcuts to format your text.</p>
      </li>
      <li>
        <strong>Add drawings</strong>
        <p>Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> to insert an Excalidraw canvas.</p>
      </li>
      <li>
        <strong>Find your notes</strong>
        <p>Use the search bar on the home page to find documents by title or content.</p>
      </li>
    </ol>
  </section>

  <section class="info-box">
    <h3>Local-First Storage</h3>
    <p>
      Glow stores all your documents locally in your browser using IndexedDB.
      Your data never leaves your device unless you explicitly share it.
      This means your notes work offline and load instantly.
    </p>
  </section>
</article>

<style>
  .docs-page {
    color: var(--glow-text-primary);
  }

  .docs-header {
    margin-bottom: 48px;
  }

  .docs-header h1 {
    font-size: 36px;
    font-weight: 700;
    margin: 0 0 16px;
    letter-spacing: -0.5px;
  }

  .lead {
    font-size: 18px;
    color: var(--glow-text-secondary);
    line-height: 1.6;
    margin: 0;
    max-width: 600px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 48px;
  }

  .feature-card {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 12px;
    padding: 24px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: var(--glow-accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .feature-icon {
    font-size: 32px;
    display: block;
    margin-bottom: 12px;
  }

  .feature-card h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .feature-card p {
    font-size: 14px;
    color: var(--glow-text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .quick-start {
    margin-bottom: 48px;
  }

  .quick-start h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 24px;
  }

  .steps {
    list-style: none;
    padding: 0;
    margin: 0;
    counter-reset: step;
  }

  .steps li {
    position: relative;
    padding-left: 48px;
    margin-bottom: 24px;
    counter-increment: step;
  }

  .steps li::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    background-color: var(--glow-accent);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
  }

  .steps li strong {
    display: block;
    font-size: 16px;
    margin-bottom: 4px;
  }

  .steps li p {
    color: var(--glow-text-secondary);
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
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

  .info-box {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 12px;
    padding: 24px;
  }

  .info-box h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px;
  }

  .info-box p {
    color: var(--glow-text-secondary);
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
  }

  @media (max-width: 640px) {
    .features-grid {
      grid-template-columns: 1fr;
    }

    .docs-header h1 {
      font-size: 28px;
    }
  }
</style>
