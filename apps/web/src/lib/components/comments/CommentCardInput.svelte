<script lang="ts">
  import type { Author } from '$lib/comments/types';

  interface Props {
    author: Author;
    onSubmit: (content: string) => void;
    onCancel: () => void;
  }

  const { author, onSubmit, onCancel }: Props = $props();

  let content = $state('');
  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  const hasContent = $derived(content.trim().length > 0);

  function adjustHeight(): void {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = `${String(Math.min(textareaRef.scrollHeight, 150))}px`;
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
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  function handleSubmit(): void {
    const trimmed = content.trim();
    if (trimmed) {
      onSubmit(trimmed);
      content = '';
    }
  }

  $effect(() => {
    if (textareaRef) {
      textareaRef.focus();
    }
  });
</script>

<div class="comment-card-input">
  <div class="card-header">
    <div class="avatar" title={author.name}>
      {#if author.avatarUrl}
        <img src={author.avatarUrl} alt={author.name} />
      {:else}
        <span class="initials">{author.initials}</span>
      {/if}
    </div>
    <span class="author-name">{author.name}</span>
  </div>

  <div class="card-body">
    <textarea
      bind:this={textareaRef}
      value={content}
      oninput={handleInput}
      onkeydown={handleKeydown}
      placeholder="Comment or add others with @"
      rows="1"
      class="textarea"
    ></textarea>
  </div>

  <div class="card-footer">
    <button type="button" class="btn btn-cancel" onclick={onCancel}> Cancel </button>
    <button
      type="button"
      class="btn btn-comment"
      class:enabled={hasContent}
      disabled={!hasContent}
      onclick={handleSubmit}
    >
      Comment
    </button>
  </div>
</div>

<style>
  .comment-card-input {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 16px 8px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--glow-accent-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .initials {
    font-size: 13px;
    font-weight: 500;
    color: white;
    text-transform: uppercase;
  }

  .author-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary);
  }

  .card-body {
    padding: 0 16px;
  }

  .textarea {
    width: 100%;
    min-height: 36px;
    max-height: 150px;
    padding: 8px 12px;
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    color: var(--glow-text-primary);
    font-family: var(--glow-font-sans);
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    overflow-y: auto;
    transition: border-color 0.2s ease;
  }

  .textarea::placeholder {
    color: var(--glow-text-tertiary);
  }

  .textarea:focus {
    outline: none;
    border-color: var(--glow-accent-primary);
  }

  .card-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px 16px;
  }

  .btn {
    padding: 6px 16px;
    font-size: 14px;
    font-weight: 500;
    font-family: var(--glow-font-sans);
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .btn-cancel {
    background-color: transparent;
    color: var(--glow-accent-primary);
  }

  .btn-cancel:hover {
    background-color: rgba(96, 165, 250, 0.1);
  }

  .btn-comment {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-secondary);
  }

  .btn-comment:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-comment.enabled {
    background-color: var(--glow-accent-primary);
    color: white;
  }

  .btn-comment.enabled:hover {
    background-color: var(--glow-accent-hover);
  }
</style>
