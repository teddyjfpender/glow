<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- Rendering KaTeX output which is sanitized by KaTeX */
  import { browser } from '$app/environment';
  import { renderLatex } from '../core/latex-renderer';

  interface Props {
    latex?: string;
    displayMode?: boolean;
    selected?: boolean;
    onupdate?: (attrs: Record<string, unknown>) => void;
    ondelete?: () => void;
    onfinish?: () => void;
  }

  const {
    latex: initialLatex = '',
    displayMode = false,
    selected = false,
    onupdate,
    ondelete,
    onfinish,
  }: Props = $props();

  // State
  let isEditing = $state(initialLatex === '');
  let editValue = $state(initialLatex);
  let inputRef = $state<HTMLInputElement | null>(null);
  let renderedHtml = $state('');
  let hasError = $state(false);

  // Sync initial value
  $effect(() => {
    if (!isEditing) {
      editValue = initialLatex;
    }
  });

  // Render LaTeX when value changes
  $effect(() => {
    if (browser) {
      const result = renderLatex(editValue || initialLatex, { displayMode });
      renderedHtml = result.html;
      hasError = result.error;
    }
  });

  // Auto-focus input when entering edit mode
  $effect(() => {
    if (isEditing && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  function handleDoubleClick(): void {
    isEditing = true;
    editValue = initialLatex;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    } else if (event.key === 'Backspace' && editValue === '') {
      event.preventDefault();
      ondelete?.();
    }
  }

  function commitEdit(): void {
    if (editValue.trim() === '') {
      ondelete?.();
      return;
    }
    onupdate?.({ latex: editValue, displayMode });
    isEditing = false;
    onfinish?.();
  }

  function cancelEdit(): void {
    if (initialLatex === '') {
      ondelete?.();
      return;
    }
    editValue = initialLatex;
    isEditing = false;
    onfinish?.();
  }

  function handleBlur(): void {
    // Small delay to allow clicking within component
    setTimeout(() => {
      if (isEditing && editValue !== initialLatex) {
        commitEdit();
      } else if (isEditing) {
        cancelEdit();
      }
    }, 150);
  }
</script>

<span
  class="latex-container"
  class:editing={isEditing}
  class:selected
  class:display-mode={displayMode}
  class:has-error={hasError}
  ondblclick={handleDoubleClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === 'Enter' && !isEditing) {
      handleDoubleClick();
    }
  }}
>
  {#if isEditing}
    <span class="latex-editor">
      <input
        bind:this={inputRef}
        bind:value={editValue}
        type="text"
        class="latex-input"
        placeholder="Enter LaTeX (e.g., E=mc^2)"
        onkeydown={handleKeydown}
        onblur={handleBlur}
      />
      {#if editValue}
        <span class="latex-preview" class:error={hasError}>
          {@html renderedHtml}
        </span>
      {/if}
    </span>
  {:else if initialLatex}
    <span class="latex-rendered">
      {@html renderedHtml}
    </span>
  {:else}
    <span class="latex-placeholder">
      <span class="latex-icon">∑</span>
      <span>equation</span>
    </span>
  {/if}
</span>

<style>
  .latex-container {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    padding: 2px 6px;
    margin: 0 2px;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .latex-container:hover {
    background-color: var(--glow-bg-elevated);
  }

  .latex-container.selected {
    box-shadow: 0 0 0 2px var(--glow-accent-primary);
    background-color: rgba(99, 102, 241, 0.1);
  }

  .latex-container.editing {
    background-color: var(--glow-bg-surface);
    padding: 8px 12px;
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .latex-container.display-mode {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 16px 24px;
    margin: 12px 0;
    background-color: var(--glow-bg-surface);
    border-radius: 8px;
  }

  .latex-container.has-error:not(.editing) {
    background-color: rgba(248, 113, 113, 0.1);
  }

  .latex-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 280px;
  }

  .latex-input {
    font-family: var(--glow-font-mono);
    font-size: 14px;
    color: var(--glow-text-primary);
    background-color: var(--glow-bg-base);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 6px;
    padding: 8px 12px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .latex-input:focus {
    border-color: var(--glow-accent-primary);
  }

  .latex-input::placeholder {
    color: var(--glow-text-tertiary);
  }

  .latex-preview {
    padding: 12px;
    background-color: var(--glow-bg-elevated);
    border-radius: 6px;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .latex-preview.error {
    background-color: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
  }

  .latex-placeholder {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--glow-text-tertiary);
    font-style: italic;
    padding: 4px 8px;
    background-color: var(--glow-bg-elevated);
    border-radius: 4px;
  }

  .latex-icon {
    font-size: 16px;
    opacity: 0.7;
  }

  .latex-rendered {
    line-height: 1;
  }

  /* KaTeX overrides for dark mode */
  .latex-container :global(.katex) {
    font-size: 1.1em;
    color: var(--glow-text-primary);
  }

  .latex-container :global(.katex-error) {
    color: var(--glow-accent-error);
  }
</style>
