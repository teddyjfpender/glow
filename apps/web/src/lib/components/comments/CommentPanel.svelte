<script lang="ts">
  import type {
    Author,
    CommentThread as CommentThreadType,
    ReactionEmoji,
  } from '$lib/comments/types';
  import CommentThread from './CommentThread.svelte';

  interface Props {
    threads: CommentThreadType[];
    currentAuthor: Author;
    isLoading?: boolean;
    activeThreadId?: string | null;
    showResolved?: boolean;
    onClose?: () => void;
    onToggleResolved?: () => void;
    onScrollToComment?: (commentId: string) => void;
    onActivateThread?: (commentId: string) => void;
    onResolve?: (commentId: string) => void;
    onUnresolve?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onReply?: (commentId: string, content: string) => void;
    onReact?: (commentId: string, replyId: string | null, emoji: ReactionEmoji) => void;
  }

  const {
    threads,
    currentAuthor,
    isLoading = false,
    activeThreadId = null,
    showResolved = false,
    onClose,
    onToggleResolved,
    onScrollToComment,
    onActivateThread,
    onResolve,
    onUnresolve,
    onDelete,
    onReply,
    onReact,
  }: Props = $props();

  const filteredThreads = $derived.by(() => {
    let result = threads;

    if (!showResolved) {
      result = result.filter((t) => !t.comment.resolved);
    }

    // Sort by editor position (top to bottom)
    return result.sort((a, b) => a.editorPosition - b.editorPosition);
  });

  const totalCount = $derived(threads.length);
  const unresolvedCount = $derived(threads.filter((t) => !t.comment.resolved).length);
  const resolvedCount = $derived(totalCount - unresolvedCount);

  function handleActivateThread(commentId: string): void {
    onActivateThread?.(commentId);
    onScrollToComment?.(commentId);
  }
</script>

<aside class="comment-panel">
  <header class="panel-header">
    <div class="header-left">
      <h2 class="panel-title">Comments</h2>
      {#if unresolvedCount > 0}
        <span class="count-badge">{unresolvedCount}</span>
      {/if}
    </div>

    <div class="header-actions">
      {#if resolvedCount > 0}
        <button
          type="button"
          class="toggle-resolved-btn"
          class:active={showResolved}
          onclick={onToggleResolved}
          aria-label={showResolved ? 'Hide resolved comments' : 'Show resolved comments'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
            />
          </svg>
          <span class="resolved-count">{resolvedCount}</span>
        </button>
      {/if}

      {#if onClose}
        <button type="button" class="close-btn" onclick={onClose} aria-label="Close comments panel">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"
            />
          </svg>
        </button>
      {/if}
    </div>
  </header>

  <div class="panel-content">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <span>Loading comments...</span>
      </div>
    {:else if filteredThreads.length === 0}
      <div class="empty-state">
        {#if totalCount === 0}
          <svg
            class="empty-icon"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p class="empty-title">No comments yet</p>
          <p class="empty-description">Select text in the document to add a comment</p>
        {:else}
          <svg
            class="empty-icon"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p class="empty-title">All comments resolved</p>
          <p class="empty-description">
            <button type="button" class="show-resolved-link" onclick={onToggleResolved}>
              Show {resolvedCount} resolved comment{resolvedCount > 1 ? 's' : ''}
            </button>
          </p>
        {/if}
      </div>
    {:else}
      <div class="threads-list">
        {#each filteredThreads as thread (thread.comment.id)}
          <CommentThread
            {thread}
            {currentAuthor}
            isActive={activeThreadId === thread.comment.id}
            onActivate={() => handleActivateThread(thread.comment.id)}
            {onResolve}
            {onUnresolve}
            {onDelete}
            {onReply}
            {onReact}
          />
        {/each}
      </div>
    {/if}
  </div>
</aside>

<style>
  .comment-panel {
    width: 320px;
    height: 100%;
    background-color: var(--glow-bg-surface);
    border-left: 1px solid var(--glow-border-subtle);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--glow-text-primary);
    margin: 0;
  }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background-color: var(--glow-accent-primary);
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    color: white;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toggle-resolved-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: none;
    border: 1px solid var(--glow-border-subtle);
    border-radius: 4px;
    font-size: 12px;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .toggle-resolved-btn:hover {
    background-color: var(--glow-bg-elevated);
    border-color: var(--glow-border-default);
    color: var(--glow-text-secondary);
  }

  .toggle-resolved-btn.active {
    background-color: rgba(52, 211, 153, 0.15);
    border-color: var(--glow-accent-success);
    color: var(--glow-accent-success);
  }

  .resolved-count {
    font-weight: 500;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .close-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 24px;
    color: var(--glow-text-tertiary);
    font-size: 13px;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--glow-border-subtle);
    border-top-color: var(--glow-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-icon {
    color: var(--glow-text-tertiary);
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-secondary);
    margin: 0 0 4px;
  }

  .empty-description {
    font-size: 13px;
    color: var(--glow-text-tertiary);
    margin: 0;
  }

  .show-resolved-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 13px;
    color: var(--glow-accent-primary);
    cursor: pointer;
    text-decoration: underline;
  }

  .show-resolved-link:hover {
    color: var(--glow-accent-primary-hover);
  }

  .threads-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
