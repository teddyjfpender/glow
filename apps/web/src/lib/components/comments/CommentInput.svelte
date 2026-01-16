<script lang="ts">
  interface Props {
    placeholder?: string;
    autoFocus?: boolean;
    onSubmit: (content: string) => void;
    onCancel?: () => void;
  }

  const {
    placeholder = 'Add a comment...',
    autoFocus = false,
    onSubmit,
    onCancel,
  }: Props = $props();

  let content = $state('');
  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  function adjustHeight(): void {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = `${String(textareaRef.scrollHeight)}px`;
    }
  }

  function handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    content = target.value;
    adjustHeight();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  function handleSubmit(): void {
    const trimmed = content.trim();
    if (trimmed) {
      onSubmit(trimmed);
      content = '';
      if (textareaRef) {
        textareaRef.style.height = 'auto';
      }
    }
  }

  function handleCancel(): void {
    content = '';
    if (textareaRef) {
      textareaRef.style.height = 'auto';
    }
    onCancel?.();
  }

  $effect(() => {
    if (autoFocus && textareaRef) {
      textareaRef.focus();
    }
  });
</script>

<div class="comment-input">
  <textarea
    bind:this={textareaRef}
    value={content}
    oninput={handleInput}
    onkeydown={handleKeydown}
    {placeholder}
    rows="1"
    class="textarea"
  ></textarea>

  {#if content.trim()}
    <div class="actions">
      {#if onCancel}
        <button type="button" class="btn btn-secondary" onclick={handleCancel}>Cancel</button>
      {/if}
      <button type="button" class="btn btn-primary" onclick={handleSubmit}>
        Comment
        <span class="shortcut">Cmd+Enter</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .comment-input {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .textarea {
    width: 100%;
    min-height: 36px;
    max-height: 200px;
    padding: 8px 12px;
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-default);
    border-radius: 6px;
    color: var(--glow-text-primary);
    font-family: var(--glow-font-sans);
    font-size: 13px;
    line-height: 1.5;
    resize: none;
    overflow-y: auto;
    transition:
      border-color var(--glow-transition-fast),
      box-shadow var(--glow-transition-fast);
  }

  .textarea::placeholder {
    color: var(--glow-text-tertiary);
  }

  .textarea:focus {
    outline: none;
    border-color: var(--glow-accent-primary);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .btn-primary {
    background-color: var(--glow-accent-primary);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--glow-accent-primary-hover);
  }

  .btn-secondary {
    background-color: transparent;
    color: var(--glow-text-secondary);
  }

  .btn-secondary:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .shortcut {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 400;
  }
</style>
