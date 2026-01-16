<script lang="ts">
  import type { Comment, Reply, Author, ReactionEmoji } from '$lib/comments/types';
  import { SvelteMap } from 'svelte/reactivity';
  import ReactionPicker from './ReactionPicker.svelte';

  interface Props {
    comment: Comment | Reply;
    currentAuthor: Author;
    isMainComment?: boolean;
    onResolve?: () => void;
    onUnresolve?: () => void;
    onDelete?: () => void;
    onReply?: () => void;
    onReact?: (emoji: ReactionEmoji) => void;
  }

  const {
    comment,
    currentAuthor,
    isMainComment = false,
    onResolve,
    onUnresolve,
    onDelete,
    onReply,
    onReact,
  }: Props = $props();

  let showMenu = $state(false);
  let showReactionPicker = $state(false);

  const isResolved = $derived('resolved' in comment && comment.resolved);
  const quotedText = $derived('textRange' in comment ? comment.textRange.quotedText : null);
  const isOwnComment = $derived(comment.author.id === currentAuthor.id);

  interface GroupedReaction {
    emoji: string;
    count: number;
    authors: string[];
    hasOwn: boolean;
  }

  const groupedReactions = $derived.by(() => {
    const groups = new SvelteMap<string, GroupedReaction>();

    for (const reaction of comment.reactions) {
      const existing = groups.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.authors.push(reaction.authorId);
        if (reaction.authorId === currentAuthor.id) {
          existing.hasOwn = true;
        }
      } else {
        groups.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          authors: [reaction.authorId],
          hasOwn: reaction.authorId === currentAuthor.id,
        });
      }
    }

    return Array.from(groups.values());
  });

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${String(diffMins)}m ago`;
    } else if (diffHours < 24) {
      return `${String(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${String(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  function handleMenuToggle(event: MouseEvent): void {
    event.stopPropagation();
    showMenu = !showMenu;
  }

  function handleReactionToggle(event: MouseEvent): void {
    event.stopPropagation();
    showReactionPicker = !showReactionPicker;
  }

  function handleReactionSelect(emoji: ReactionEmoji): void {
    showReactionPicker = false;
    onReact?.(emoji);
  }

  function handleMenuAction(action: () => void): void {
    showMenu = false;
    action();
  }
</script>

<div class="comment-item" class:resolved={isResolved} class:main-comment={isMainComment}>
  <div class="header">
    <div class="avatar" title={comment.author.name}>
      {#if comment.author.avatarUrl}
        <img src={comment.author.avatarUrl} alt={comment.author.name} />
      {:else}
        <span class="initials">{comment.author.initials}</span>
      {/if}
    </div>

    <div class="meta">
      <span class="author-name">{comment.author.name}</span>
      <span class="timestamp">{formatTimestamp(comment.createdAt)}</span>
    </div>

    <div class="actions">
      {#if onReact}
        <div class="reaction-container">
          <button
            type="button"
            class="action-btn"
            onclick={handleReactionToggle}
            aria-label="Add reaction"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM5.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-5.9 4.8a.75.75 0 0 1 1.05-.15 3.5 3.5 0 0 0 4.7 0 .75.75 0 1 1 .9 1.2 5 5 0 0 1-6.5 0 .75.75 0 0 1-.15-1.05z"
              />
            </svg>
          </button>
          {#if showReactionPicker}
            <ReactionPicker
              onSelect={handleReactionSelect}
              onClose={() => (showReactionPicker = false)}
            />
          {/if}
        </div>
      {/if}

      {#if isMainComment && onResolve && !isResolved}
        <button
          type="button"
          class="action-btn resolve-btn"
          onclick={onResolve}
          aria-label="Resolve comment"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
            />
          </svg>
        </button>
      {/if}

      {#if isMainComment && onUnresolve && isResolved}
        <button
          type="button"
          class="action-btn"
          onclick={onUnresolve}
          aria-label="Unresolve comment"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"
            />
          </svg>
        </button>
      {/if}

      <div class="menu-container">
        <button
          type="button"
          class="action-btn"
          onclick={handleMenuToggle}
          aria-label="More options"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="13" cy="8" r="1.5" />
          </svg>
        </button>

        {#if showMenu}
          <div class="menu-dropdown">
            {#if onReply}
              <button type="button" class="menu-item" onclick={() => handleMenuAction(onReply)}>
                Reply
              </button>
            {/if}
            {#if isOwnComment && onDelete}
              <button
                type="button"
                class="menu-item menu-item-danger"
                onclick={() => handleMenuAction(onDelete)}
              >
                Delete
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if isMainComment && quotedText}
    <div class="quoted-text">
      <span class="quote-mark">"</span>
      {quotedText}
      <span class="quote-mark">"</span>
    </div>
  {/if}

  <div class="content">{comment.content}</div>

  {#if groupedReactions.length > 0}
    <div class="reactions">
      {#each groupedReactions as reaction}
        <button
          type="button"
          class="reaction-badge"
          class:own={reaction.hasOwn}
          onclick={() => onReact?.(reaction.emoji as ReactionEmoji)}
          title={`${String(reaction.count)} reaction${reaction.count > 1 ? 's' : ''}`}
        >
          <span class="reaction-emoji">{reaction.emoji}</span>
          <span class="reaction-count">{reaction.count}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .comment-item {
    padding: 12px;
    border-radius: 8px;
    transition: background-color var(--glow-transition-fast);
  }

  .comment-item:hover {
    background-color: var(--glow-bg-elevated);
  }

  .comment-item.resolved {
    opacity: 0.6;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .avatar {
    width: 28px;
    height: 28px;
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
    font-size: 11px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
  }

  .meta {
    flex: 1;
    min-width: 0;
  }

  .author-name {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--glow-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timestamp {
    font-size: 11px;
    color: var(--glow-text-tertiary);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--glow-transition-fast);
  }

  .comment-item:hover .actions {
    opacity: 1;
  }

  .action-btn {
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

  .action-btn:hover {
    background-color: var(--glow-bg-surface);
    color: var(--glow-text-primary);
  }

  .resolve-btn:hover {
    color: var(--glow-accent-success);
  }

  .reaction-container,
  .menu-container {
    position: relative;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    z-index: 100;
    min-width: 120px;
  }

  .menu-item {
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    font-size: 13px;
    color: var(--glow-text-primary);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .menu-item:hover {
    background-color: var(--glow-bg-elevated);
  }

  .menu-item-danger {
    color: var(--glow-accent-error);
  }

  .menu-item-danger:hover {
    background-color: rgba(248, 113, 113, 0.1);
  }

  .quoted-text {
    font-size: 12px;
    color: var(--glow-text-secondary);
    background-color: var(--glow-bg-surface);
    border-left: 3px solid var(--glow-accent-primary);
    padding: 8px 12px;
    margin-bottom: 8px;
    border-radius: 0 4px 4px 0;
    font-style: italic;
  }

  .quote-mark {
    color: var(--glow-text-tertiary);
  }

  .content {
    font-size: 13px;
    line-height: 1.5;
    color: var(--glow-text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .reaction-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 12px;
    font-size: 12px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast);
  }

  .reaction-badge:hover {
    background-color: var(--glow-bg-elevated);
    border-color: var(--glow-border-default);
  }

  .reaction-badge.own {
    background-color: rgba(99, 102, 241, 0.15);
    border-color: var(--glow-accent-primary);
  }

  .reaction-emoji {
    font-size: 14px;
  }

  .reaction-count {
    color: var(--glow-text-secondary);
    font-weight: 500;
  }
</style>
