<script lang="ts">
  import type { Editor } from '@tiptap/core';

  interface Props {
    editor: Editor | null;
  }

  const { editor }: Props = $props();

  // Font families
  const fontFamilies = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Inter'];

  // Font sizes
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

  // Heading styles
  const headingStyles = [
    { label: 'Normal text', value: 'paragraph' },
    { label: 'Title', value: 'title' },
    { label: 'Heading 1', value: 'h1' },
    { label: 'Heading 2', value: 'h2' },
    { label: 'Heading 3', value: 'h3' },
  ];

  let currentFont = $state('Arial');
  let currentSize = $state(11);
  let currentStyle = $state('Normal text');
  let zoom = $state(100);

  function runCommand(command: string): void {
    if (editor === null) return;

    const chain = editor.chain().focus();

    switch (command) {
      case 'undo':
        chain.undo().run();
        break;
      case 'redo':
        chain.redo().run();
        break;
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'underline':
        chain.toggleUnderline().run();
        break;
      case 'strike':
        chain.toggleStrike().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'alignLeft':
        chain.setTextAlign('left').run();
        break;
      case 'alignCenter':
        chain.setTextAlign('center').run();
        break;
      case 'alignRight':
        chain.setTextAlign('right').run();
        break;
      case 'alignJustify':
        chain.setTextAlign('justify').run();
        break;
      case 'indent':
        // TipTap doesn't have indent by default
        break;
      case 'outdent':
        // TipTap doesn't have outdent by default
        break;
      case 'link':
        // Will implement link dialog
        break;
      case 'horizontalRule':
        chain.setHorizontalRule().run();
        break;
      case 'clearFormatting':
        chain.unsetAllMarks().run();
        break;
      default:
        break;
    }
  }

  function setHeadingStyle(style: string): void {
    if (editor === null) return;

    const chain = editor.chain().focus();

    switch (style) {
      case 'h1':
        chain.toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        chain.toggleHeading({ level: 3 }).run();
        break;
      case 'title':
        chain.toggleHeading({ level: 1 }).run();
        break;
      default:
        chain.setParagraph().run();
        break;
    }
  }

  function isActive(command: string): boolean {
    if (editor === null) return false;

    switch (command) {
      case 'bold':
        return editor.isActive('bold');
      case 'italic':
        return editor.isActive('italic');
      case 'underline':
        return editor.isActive('underline');
      case 'strike':
        return editor.isActive('strike');
      case 'code':
        return editor.isActive('code');
      case 'bulletList':
        return editor.isActive('bulletList');
      case 'orderedList':
        return editor.isActive('orderedList');
      case 'alignLeft':
        return editor.isActive({ textAlign: 'left' });
      case 'alignCenter':
        return editor.isActive({ textAlign: 'center' });
      case 'alignRight':
        return editor.isActive({ textAlign: 'right' });
      case 'alignJustify':
        return editor.isActive({ textAlign: 'justify' });
      default:
        return false;
    }
  }

  function decreaseFontSize(): void {
    const idx = fontSizes.indexOf(currentSize);
    if (idx > 0) {
      currentSize = fontSizes[idx - 1];
    }
  }

  function increaseFontSize(): void {
    const idx = fontSizes.indexOf(currentSize);
    if (idx < fontSizes.length - 1) {
      currentSize = fontSizes[idx + 1];
    }
  }
</script>

<div class="toolbar">
  <!-- Undo/Redo -->
  <div class="tool-group">
    <button
      class="tool-button"
      onclick={() => {
        runCommand('undo');
      }}
      title="Undo (Ctrl+Z)"
      aria-label="Undo"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M3 10h10a5 5 0 0 1 5 5v2" />
        <polyline points="3 10 8 5 8 15" />
      </svg>
    </button>
    <button
      class="tool-button"
      onclick={() => {
        runCommand('redo');
      }}
      title="Redo (Ctrl+Y)"
      aria-label="Redo"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 10H11a5 5 0 0 0-5 5v2" />
        <polyline points="21 10 16 5 16 15" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Zoom -->
  <div class="tool-group">
    <select class="select-small" bind:value={zoom} aria-label="Zoom">
      <option value={50}>50%</option>
      <option value={75}>75%</option>
      <option value={100}>100%</option>
      <option value={125}>125%</option>
      <option value={150}>150%</option>
      <option value={200}>200%</option>
    </select>
  </div>

  <div class="divider"></div>

  <!-- Styles -->
  <div class="tool-group">
    <select
      class="select-medium"
      bind:value={currentStyle}
      onchange={() => {
        setHeadingStyle(headingStyles.find((s) => s.label === currentStyle)?.value ?? 'paragraph');
      }}
      aria-label="Text style"
    >
      {#each headingStyles as style}
        <option value={style.label}>{style.label}</option>
      {/each}
    </select>
  </div>

  <div class="divider"></div>

  <!-- Font Family -->
  <div class="tool-group">
    <select class="select-medium" bind:value={currentFont} aria-label="Font family">
      {#each fontFamilies as font}
        <option value={font}>{font}</option>
      {/each}
    </select>
  </div>

  <div class="divider"></div>

  <!-- Font Size -->
  <div class="tool-group font-size-group">
    <button
      class="tool-button small"
      onclick={decreaseFontSize}
      title="Decrease font size"
      aria-label="Decrease font size"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
    <input type="text" class="font-size-input" bind:value={currentSize} aria-label="Font size" />
    <button
      class="tool-button small"
      onclick={increaseFontSize}
      title="Increase font size"
      aria-label="Increase font size"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Text Formatting -->
  <div class="tool-group">
    <button
      class="tool-button"
      class:active={isActive('bold')}
      onclick={() => {
        runCommand('bold');
      }}
      title="Bold (Ctrl+B)"
      aria-label="Bold"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 8h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        />
      </svg>
    </button>
    <button
      class="tool-button"
      class:active={isActive('italic')}
      onclick={() => {
        runCommand('italic');
      }}
      title="Italic (Ctrl+I)"
      aria-label="Italic"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
      </svg>
    </button>
    <button
      class="tool-button"
      class:active={isActive('underline')}
      onclick={() => {
        runCommand('underline');
      }}
      title="Underline (Ctrl+U)"
      aria-label="Underline"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
        <line x1="4" y1="21" x2="20" y2="21" />
      </svg>
    </button>
    <button class="tool-button" title="Text color" aria-label="Text color">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M4 20h16" stroke="#ef4444" stroke-width="4" />
        <path d="M12 4L7 16h2l1-3h4l1 3h2L12 4z" />
      </svg>
    </button>
    <button class="tool-button" title="Highlight color" aria-label="Highlight color">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="14" width="18" height="6" rx="1" fill="#fbbf24" />
        <path d="M15.5 4l-8 8 3 3 8-8-3-3z" stroke="currentColor" stroke-width="2" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Links & Media -->
  <div class="tool-group">
    <button
      class="tool-button"
      onclick={() => {
        runCommand('link');
      }}
      title="Insert link (Ctrl+K)"
      aria-label="Insert link"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </button>
    <button class="tool-button" title="Add comment" aria-label="Add comment">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="8" y1="10" x2="16" y2="10" />
      </svg>
    </button>
    <button class="tool-button" title="Insert image" aria-label="Insert image">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Alignment -->
  <div class="tool-group">
    <button
      class="tool-button"
      class:active={isActive('alignLeft')}
      onclick={() => {
        runCommand('alignLeft');
      }}
      title="Align left"
      aria-label="Align left"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="18" y2="18" />
      </svg>
    </button>
    <button
      class="tool-button"
      class:active={isActive('alignCenter')}
      onclick={() => {
        runCommand('alignCenter');
      }}
      title="Align center"
      aria-label="Align center"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
    <button
      class="tool-button"
      class:active={isActive('alignRight')}
      onclick={() => {
        runCommand('alignRight');
      }}
      title="Align right"
      aria-label="Align right"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <line x1="6" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <button
      class="tool-button"
      class:active={isActive('alignJustify')}
      onclick={() => {
        runCommand('alignJustify');
      }}
      title="Justify"
      aria-label="Justify"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Lists -->
  <div class="tool-group">
    <button
      class="tool-button"
      class:active={isActive('bulletList')}
      onclick={() => {
        runCommand('bulletList');
      }}
      title="Bulleted list"
      aria-label="Bulleted list"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="5" cy="6" r="1" fill="currentColor" />
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="5" cy="18" r="1" fill="currentColor" />
      </svg>
    </button>
    <button
      class="tool-button"
      class:active={isActive('orderedList')}
      onclick={() => {
        runCommand('orderedList');
      }}
      title="Numbered list"
      aria-label="Numbered list"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <text x="3" y="8" font-size="8" fill="currentColor" stroke="none">1</text>
        <text x="3" y="14" font-size="8" fill="currentColor" stroke="none">2</text>
        <text x="3" y="20" font-size="8" fill="currentColor" stroke="none">3</text>
      </svg>
    </button>
    <button
      class="tool-button"
      onclick={() => {
        runCommand('outdent');
      }}
      title="Decrease indent"
      aria-label="Decrease indent"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <line x1="9" y1="18" x2="21" y2="18" />
        <polyline points="6 15 3 12 6 9" />
      </svg>
    </button>
    <button
      class="tool-button"
      onclick={() => {
        runCommand('indent');
      }}
      title="Increase indent"
      aria-label="Increase indent"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <line x1="9" y1="18" x2="21" y2="18" />
        <polyline points="3 15 6 12 3 9" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Clear Formatting -->
  <div class="tool-group">
    <button
      class="tool-button"
      onclick={() => {
        runCommand('clearFormatting');
      }}
      title="Clear formatting"
      aria-label="Clear formatting"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 6L6 18" />
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  </div>

  <div class="spacer"></div>

  <!-- Right side: Editing mode -->
  <div class="tool-group">
    <button class="mode-button">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <span>Editing</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    background-color: var(--glow-bg-surface);
    border-bottom: 1px solid var(--glow-border-subtle);
    gap: 2px;
    min-height: 40px;
    flex-wrap: wrap;
  }

  .tool-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .tool-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: none;
    color: var(--glow-text-secondary);
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .tool-button:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .tool-button.active {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-accent-primary);
  }

  .tool-button.small {
    width: 24px;
    height: 24px;
  }

  .divider {
    width: 1px;
    height: 24px;
    background-color: var(--glow-border-subtle);
    margin: 0 6px;
  }

  .spacer {
    flex: 1;
  }

  .select-small,
  .select-medium {
    font-size: 13px;
    color: var(--glow-text-primary);
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    transition: border-color var(--glow-transition-fast);
  }

  .select-small:hover,
  .select-medium:hover {
    border-color: var(--glow-border-default);
  }

  .select-small:focus,
  .select-medium:focus {
    outline: none;
    border-color: var(--glow-accent-primary);
  }

  .select-small {
    width: 70px;
  }

  .select-medium {
    width: 120px;
  }

  .select-small option,
  .select-medium option {
    background-color: var(--glow-bg-surface);
    color: var(--glow-text-primary);
  }

  .font-size-group {
    display: flex;
    align-items: center;
    border: 1px solid var(--glow-border-subtle);
    border-radius: 4px;
    padding: 2px;
  }

  .font-size-input {
    width: 32px;
    text-align: center;
    font-size: 13px;
    color: var(--glow-text-primary);
    background: transparent;
    border: none;
    padding: 2px;
  }

  .font-size-input:focus {
    outline: none;
  }

  .mode-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--glow-text-primary);
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color var(--glow-transition-fast);
  }

  .mode-button:hover {
    border-color: var(--glow-border-default);
  }
</style>
