<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import { commentsState } from '$lib/state/comments.svelte';

  interface Props {
    editor: Editor | null;
  }

  const { editor }: Props = $props();

  // Track selection state reactively
  let hasSelection = $state(false);

  // Update selection state when editor changes
  $effect(() => {
    if (!editor) {
      hasSelection = false;
      return;
    }

    // Initial check
    const { from, to } = editor.state.selection;
    hasSelection = from !== to;

    // Listen for selection updates
    const updateHandler = (): void => {
      const { from, to } = editor.state.selection;
      hasSelection = from !== to;
    };

    editor.on('selectionUpdate', updateHandler);
    editor.on('transaction', updateHandler);

    return () => {
      editor.off('selectionUpdate', updateHandler);
      editor.off('transaction', updateHandler);
    };
  });

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

  // Zoom options
  const zoomOptions = [50, 75, 100, 125, 150, 200];

  // Color palettes
  const textColors = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Gray', value: '#6b7280' },
    { name: 'White', value: '#ffffff' },
  ];

  const highlightColors = [
    { name: 'None', value: '' },
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Purple', value: '#e9d5ff' },
    { name: 'Pink', value: '#fbcfe8' },
    { name: 'Red', value: '#fecaca' },
    { name: 'Orange', value: '#fed7aa' },
    { name: 'Cyan', value: '#a5f3fc' },
    { name: 'Gray', value: '#e5e7eb' },
  ];

  let currentFont = $state('Arial');
  let currentSize = $state(11);
  let currentStyle = $state('Normal text');
  let zoom = $state(100);
  let currentTextColor = $state('#ef4444');
  let currentHighlightColor = $state('#fef08a');

  // Dropdown state management
  let activeDropdown = $state<string | null>(null);

  // Link dialog state
  let showLinkDialog = $state(false);
  let linkUrl = $state('');
  let linkInputRef = $state<HTMLInputElement | null>(null);

  function toggleDropdown(name: string): void {
    if (activeDropdown === name) {
      activeDropdown = null;
    } else {
      activeDropdown = name;
    }
  }

  function closeDropdowns(): void {
    activeDropdown = null;
  }

  function openLinkDialog(): void {
    if (editor === null) return;

    // Pre-populate with existing link if there is one
    const linkAttributes = editor.getAttributes('link') as { href?: string };
    const existingLink = linkAttributes.href;
    linkUrl = existingLink ?? '';
    showLinkDialog = true;

    // Focus the input after the dialog is shown
    setTimeout(() => {
      linkInputRef?.focus();
      linkInputRef?.select();
    }, 10);
  }

  function closeLinkDialog(): void {
    showLinkDialog = false;
    linkUrl = '';
  }

  function setLink(): void {
    if (editor === null) return;

    const url = linkUrl.trim();

    if (url === '') {
      // Remove the link if URL is empty
      editor.chain().focus().unsetLink().run();
    } else {
      // Ensure URL has a protocol
      const finalUrl =
        url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      editor.chain().focus().setLink({ href: finalUrl }).run();
    }

    closeLinkDialog();
  }

  function removeLink(): void {
    if (editor === null) return;
    editor.chain().focus().unsetLink().run();
    closeLinkDialog();
  }

  function handleLinkKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      setLink();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeLinkDialog();
    }
  }

  function selectZoom(value: number): void {
    zoom = value;
    activeDropdown = null;
  }

  function selectStyle(label: string, value: string): void {
    currentStyle = label;
    setHeadingStyle(value);
    activeDropdown = null;
  }

  function selectFont(font: string): void {
    currentFont = font;
    activeDropdown = null;
    if (editor === null) return;
    editor.chain().focus().setFontFamily(font).run();
  }

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
        openLinkDialog();
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
      case 'link':
        return editor.isActive('link');
      default:
        return false;
    }
  }

  function applyFontSize(size: number): void {
    if (editor === null) return;
    editor.chain().focus().setFontSize(`${size.toString()}pt`).run();
  }

  function decreaseFontSize(): void {
    const idx = fontSizes.indexOf(currentSize);
    if (idx > 0) {
      currentSize = fontSizes[idx - 1];
      applyFontSize(currentSize);
    }
  }

  function increaseFontSize(): void {
    const idx = fontSizes.indexOf(currentSize);
    if (idx < fontSizes.length - 1) {
      currentSize = fontSizes[idx + 1];
      applyFontSize(currentSize);
    }
  }

  function handleFontSizeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value > 0 && value <= 400) {
      currentSize = value;
      applyFontSize(value);
    }
  }

  function handleFontSizeKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const value = parseInt(input.value, 10);
      if (!isNaN(value) && value > 0 && value <= 400) {
        currentSize = value;
        applyFontSize(value);
      }
      input.blur();
    }
  }

  function setTextColor(color: string): void {
    if (editor === null) return;
    if (color === '') {
      editor.chain().focus().unsetColor().run();
    } else {
      currentTextColor = color;
      editor.chain().focus().setColor(color).run();
    }
    activeDropdown = null;
  }

  function setHighlightColor(color: string): void {
    if (editor === null) return;
    if (color === '') {
      editor.chain().focus().unsetHighlight().run();
    } else {
      currentHighlightColor = color;
      editor.chain().focus().setHighlight({ color }).run();
    }
    activeDropdown = null;
  }

  function handleAddComment(): void {
    if (editor === null) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      // No text selected - optionally show a tooltip or message
      return;
    }

    // Get selected text for quotedText
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    // Open the comment panel
    commentsState.openPanel();

    // Dispatch a custom event that DocumentPage will handle
    const event = new CustomEvent('glow:create-comment', {
      bubbles: true,
      detail: { from, to, quotedText: selectedText },
    });
    editor.view.dom.dispatchEvent(event);
  }
</script>

<svelte:window onclick={closeDropdowns} />

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
    <div class="dropdown-container">
      <button
        class="dropdown-trigger select-small"
        class:active={activeDropdown === 'zoom'}
        onclick={(e) => {
          e.stopPropagation();
          toggleDropdown('zoom');
        }}
        aria-label="Zoom"
        aria-haspopup="true"
        aria-expanded={activeDropdown === 'zoom'}
      >
        <span>{zoom}%</span>
        <svg
          class="dropdown-arrow"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {#if activeDropdown === 'zoom'}
        <div
          class="dropdown-menu"
          role="menu"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            if (e.key === 'Escape') closeDropdowns();
          }}
        >
          {#each zoomOptions as option}
            <button
              class="dropdown-item"
              class:selected={zoom === option}
              onclick={() => selectZoom(option)}
              role="menuitem"
            >
              {option}%
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="divider"></div>

  <!-- Styles -->
  <div class="tool-group">
    <div class="dropdown-container">
      <button
        class="dropdown-trigger select-medium"
        class:active={activeDropdown === 'style'}
        onclick={(e) => {
          e.stopPropagation();
          toggleDropdown('style');
        }}
        aria-label="Text style"
        aria-haspopup="true"
        aria-expanded={activeDropdown === 'style'}
      >
        <span>{currentStyle}</span>
        <svg
          class="dropdown-arrow"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {#if activeDropdown === 'style'}
        <div
          class="dropdown-menu"
          role="menu"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            if (e.key === 'Escape') closeDropdowns();
          }}
        >
          {#each headingStyles as style}
            <button
              class="dropdown-item"
              class:selected={currentStyle === style.label}
              onclick={() => selectStyle(style.label, style.value)}
              role="menuitem"
            >
              {style.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="divider"></div>

  <!-- Font Family -->
  <div class="tool-group">
    <div class="dropdown-container">
      <button
        class="dropdown-trigger select-medium"
        class:active={activeDropdown === 'font'}
        onclick={(e) => {
          e.stopPropagation();
          toggleDropdown('font');
        }}
        aria-label="Font family"
        aria-haspopup="true"
        aria-expanded={activeDropdown === 'font'}
      >
        <span>{currentFont}</span>
        <svg
          class="dropdown-arrow"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {#if activeDropdown === 'font'}
        <div
          class="dropdown-menu"
          role="menu"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            if (e.key === 'Escape') closeDropdowns();
          }}
        >
          {#each fontFamilies as font}
            <button
              class="dropdown-item"
              class:selected={currentFont === font}
              onclick={() => selectFont(font)}
              role="menuitem"
            >
              {font}
            </button>
          {/each}
        </div>
      {/if}
    </div>
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
    <input
      type="text"
      class="font-size-input"
      bind:value={currentSize}
      onchange={handleFontSizeInput}
      onkeydown={handleFontSizeKeydown}
      aria-label="Font size"
    />
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
    <!-- Text Color Picker -->
    <div class="dropdown-container">
      <button
        class="tool-button"
        class:active={activeDropdown === 'textColor'}
        onclick={(e) => {
          e.stopPropagation();
          toggleDropdown('textColor');
        }}
        title="Text color"
        aria-label="Text color"
        aria-haspopup="true"
        aria-expanded={activeDropdown === 'textColor'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 20h16" stroke={currentTextColor} stroke-width="4" />
          <path d="M12 4L7 16h2l1-3h4l1 3h2L12 4z" />
        </svg>
      </button>
      {#if activeDropdown === 'textColor'}
        <div
          class="color-picker-popup"
          role="menu"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            if (e.key === 'Escape') closeDropdowns();
          }}
        >
          <div class="color-picker-header">Text Color</div>
          <div class="color-picker-grid">
            {#each textColors as color}
              <button
                class="color-swatch"
                class:selected={color.value === ''
                  ? !currentTextColor
                  : currentTextColor === color.value}
                style="background-color: {color.value || 'var(--glow-text-primary)'}"
                onclick={() => setTextColor(color.value)}
                title={color.name}
                aria-label={color.name}
              >
                {#if color.value === ''}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <!-- Highlight Color Picker -->
    <div class="dropdown-container">
      <button
        class="tool-button"
        class:active={activeDropdown === 'highlightColor'}
        onclick={(e) => {
          e.stopPropagation();
          toggleDropdown('highlightColor');
        }}
        title="Highlight color"
        aria-label="Highlight color"
        aria-haspopup="true"
        aria-expanded={activeDropdown === 'highlightColor'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="14" width="18" height="6" rx="1" fill={currentHighlightColor} />
          <path d="M15.5 4l-8 8 3 3 8-8-3-3z" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>
      {#if activeDropdown === 'highlightColor'}
        <div
          class="color-picker-popup"
          role="menu"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            if (e.key === 'Escape') closeDropdowns();
          }}
        >
          <div class="color-picker-header">Highlight Color</div>
          <div class="color-picker-grid">
            {#each highlightColors as color}
              <button
                class="color-swatch"
                class:selected={color.value === ''
                  ? !currentHighlightColor
                  : currentHighlightColor === color.value}
                style="background-color: {color.value || '#333'}"
                onclick={() => setHighlightColor(color.value)}
                title={color.name}
                aria-label={color.name}
              >
                {#if color.value === ''}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="divider"></div>

  <!-- Links & Media -->
  <div class="tool-group">
    <div class="link-button-container">
      <button
        class="tool-button"
        class:active={isActive('link')}
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

      <!-- Link Dialog -->
      {#if showLinkDialog}
        <div class="link-dialog" onclick={(e) => e.stopPropagation()}>
          <div class="link-dialog-header">
            <span class="link-dialog-title">Insert Link</span>
            <button class="link-dialog-close" onclick={closeLinkDialog} aria-label="Close dialog">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="link-dialog-content">
            <input
              type="text"
              class="link-input"
              placeholder="Enter URL..."
              bind:value={linkUrl}
              bind:this={linkInputRef}
              onkeydown={handleLinkKeydown}
            />
          </div>
          <div class="link-dialog-actions">
            {#if isActive('link')}
              <button class="link-btn link-btn-danger" onclick={removeLink}> Remove </button>
            {/if}
            <button class="link-btn link-btn-secondary" onclick={closeLinkDialog}> Cancel </button>
            <button class="link-btn link-btn-primary" onclick={setLink}> Apply </button>
          </div>
        </div>
      {/if}
    </div>
    <button
      class="tool-button"
      class:disabled={!hasSelection}
      onclick={handleAddComment}
      disabled={!hasSelection}
      title={hasSelection ? 'Add comment' : 'Select text to add a comment'}
      aria-label="Add comment"
    >
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
    <button
      class="tool-button"
      onclick={() => {
        if (editor) editor.chain().focus().insertLatex().run();
      }}
      title="Insert equation (Ctrl+Shift+M)"
      aria-label="Insert equation"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <text
          x="4"
          y="18"
          font-size="14"
          font-family="serif"
          font-style="italic"
          stroke="none"
          fill="currentColor"
        >
          ∑
        </text>
        <path d="M14 7l3 5-3 5" />
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

  .tool-button.disabled,
  .tool-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tool-button.disabled:hover,
  .tool-button:disabled:hover {
    background-color: transparent;
    color: var(--glow-text-secondary);
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

  /* Custom dropdown styles */
  .dropdown-container {
    position: relative;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
    color: var(--glow-text-primary);
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    transition: border-color var(--glow-transition-fast);
  }

  .dropdown-trigger:hover {
    border-color: var(--glow-border-default);
  }

  .dropdown-trigger.active {
    border-color: var(--glow-accent-primary);
  }

  .dropdown-trigger.select-small {
    width: 70px;
  }

  .dropdown-trigger.select-medium {
    width: 130px;
  }

  .dropdown-arrow {
    flex-shrink: 0;
    opacity: 0.6;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 100%;
    background-color: var(--glow-bg-elevated, #1a1a1a);
    border: 1px solid var(--glow-border-subtle, #3a3a4a);
    border-radius: 6px;
    padding: 4px 0;
    margin-top: 2px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.3),
      0 2px 4px -2px rgb(0 0 0 / 0.3);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--glow-text-primary, #e0e0e0);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background-color var(--glow-transition-fast);
  }

  .dropdown-item:hover {
    background-color: var(--glow-bg-surface, #2a2a2a);
  }

  .dropdown-item.selected {
    background-color: var(--glow-bg-surface, #2a2a2a);
    color: var(--glow-accent-primary);
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

  /* Link button container and dialog */
  .link-button-container {
    position: relative;
  }

  .link-dialog {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    width: 300px;
    background-color: #1a1a1a;
    border: 1px solid #3a3a4a;
    border-radius: 8px;
    box-shadow:
      0 4px 12px rgb(0 0 0 / 0.4),
      0 2px 4px rgb(0 0 0 / 0.2);
    z-index: 1001;
  }

  .link-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 8px;
    border-bottom: 1px solid #2a2a2a;
  }

  .link-dialog-title {
    font-size: 13px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .link-dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    color: #888;
    cursor: pointer;
    border-radius: 4px;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .link-dialog-close:hover {
    background-color: #2a2a2a;
    color: #e0e0e0;
  }

  .link-dialog-content {
    padding: 12px 14px;
  }

  .link-input {
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    color: #e0e0e0;
    background-color: #0d0d0d;
    border: 1px solid #3a3a4a;
    border-radius: 6px;
    outline: none;
    transition: border-color 0.15s;
  }

  .link-input::placeholder {
    color: #666;
  }

  .link-input:focus {
    border-color: var(--glow-accent-primary, #60a5fa);
  }

  .link-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 14px 12px;
  }

  .link-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 5px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .link-btn-primary {
    background-color: var(--glow-accent-primary, #60a5fa);
    border: 1px solid var(--glow-accent-primary, #60a5fa);
    color: #000;
  }

  .link-btn-primary:hover {
    background-color: var(--glow-accent-hover, #93c5fd);
    border-color: var(--glow-accent-hover, #93c5fd);
  }

  .link-btn-secondary {
    background-color: transparent;
    border: 1px solid #3a3a4a;
    color: #e0e0e0;
  }

  .link-btn-secondary:hover {
    background-color: #2a2a2a;
    border-color: #4a4a5a;
  }

  .link-btn-danger {
    background-color: transparent;
    border: 1px solid #ef4444;
    color: #ef4444;
  }

  .link-btn-danger:hover {
    background-color: #ef4444;
    color: #fff;
  }

  /* Color Picker Styles */
  .color-picker-popup {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    width: 180px;
    background-color: #1a1a1a;
    border: 1px solid #3a3a4a;
    border-radius: 8px;
    box-shadow:
      0 4px 12px rgb(0 0 0 / 0.4),
      0 2px 4px rgb(0 0 0 / 0.2);
    z-index: 1001;
    padding: 8px;
  }

  .color-picker-header {
    font-size: 11px;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    padding: 0 2px;
  }

  .color-picker-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    transition:
      border-color 0.15s,
      transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-swatch:hover {
    border-color: #666;
    transform: scale(1.1);
  }

  .color-swatch.selected {
    border-color: var(--glow-accent-primary, #60a5fa);
  }

  .color-swatch svg {
    stroke: #888;
  }
</style>
