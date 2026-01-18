<script lang="ts">
  import type { Comment, Author, ReactionEmoji } from '$lib/comments/types';
  import { SvelteMap } from 'svelte/reactivity';
  import ReactionPicker from './ReactionPicker.svelte';
  import { aiFeedbackState, detectMention, type SuggestedEdit } from '$lib/ai';

  interface Props {
    comment: Comment;
    currentAuthor: Author;
    isActive?: boolean;
    onActivate?: () => void;
    onResolve?: () => void;
    onUnresolve?: () => void;
    onDelete?: () => void;
    onReply?: (content: string) => void;
    onReact?: (replyId: string | null, emoji: ReactionEmoji) => void;
    onApplyEdit?: (edit: SuggestedEdit) => void;
    onRejectEdit?: (edit: SuggestedEdit) => void;
  }

  const {
    comment,
    currentAuthor,
    isActive = false,
    onActivate,
    onResolve,
    onUnresolve,
    onDelete,
    onReply,
    onReact,
    onApplyEdit,
    onRejectEdit,
  }: Props = $props();

  let showMenu = $state(false);
  let showReactionPicker = $state(false);
  let showReplyInput = $state(false);
  let replyContent = $state('');
  let replyTextareaRef = $state<HTMLTextAreaElement | null>(null);

  const hasReplies = $derived(comment.replies.length > 0);
  const isOwnComment = $derived(comment.author.id === currentAuthor.id);
  const hasReplyContent = $derived(replyContent.trim().length > 0);

  // AI feedback state
  const aiFeedback = $derived(aiFeedbackState.getFeedback(comment.id));
  const mentionMatch = $derived(detectMention(comment.content));
  const isAIComment = $derived(mentionMatch !== null);
  const aiStatus = $derived(aiFeedback?.metadata.status ?? null);
  const suggestedEdits = $derived(aiFeedback?.suggestedEdits ?? []);
  const pendingEdits = $derived(suggestedEdits.filter(e => !e.applied && !e.rejected));
  const isAIWorking = $derived(aiStatus === 'pending' || aiStatus === 'processing');

  // Get agent display name for the working indicator
  const agentDisplayName = $derived.by(() => {
    if (!mentionMatch) return 'AI';
    const names: Record<string, string> = {
      claude: 'Claude',
      codex: 'Codex',
      gemini: 'Gemini',
      ai: 'AI'
    };
    return names[mentionMatch.agentName] || 'AI';
  });

  // Format content with highlighted @mention
  const formattedContent = $derived.by(() => {
    if (!isAIComment || !mentionMatch) {
      // Escape HTML to prevent XSS
      return escapeHtml(comment.content);
    }
    // Highlight the @mention
    const mentionText = `@${mentionMatch.agentName}`;
    const escapedContent = escapeHtml(comment.content);
    const escapedMention = escapeHtml(mentionText);
    return escapedContent.replace(
      new RegExp(`(${escapedMention})`, 'i'),
      '<span class="mention-highlight">$1</span>'
    );
  });

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

  function handleCardClick(event: MouseEvent): void {
    // Don't activate if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('textarea')) {
      return;
    }
    if (!isActive) {
      onActivate?.();
    }
  }

  function handleCardKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !isActive) {
      onActivate?.();
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
    onReact?.(null, emoji);
  }

  function handleResolve(event: MouseEvent): void {
    event.stopPropagation();
    if (comment.resolved) {
      onUnresolve?.();
    } else {
      onResolve?.();
    }
  }

  function handleReplyClick(): void {
    showReplyInput = true;
  }

  function adjustReplyHeight(): void {
    if (replyTextareaRef) {
      replyTextareaRef.style.height = 'auto';
      replyTextareaRef.style.height = `${String(Math.min(replyTextareaRef.scrollHeight, 100))}px`;
    }
  }

  function handleReplyInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    replyContent = target.value;
    adjustReplyHeight();
  }

  function handleReplyKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submitReply();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelReply();
    }
  }

  function submitReply(): void {
    const trimmed = replyContent.trim();
    if (trimmed) {
      onReply?.(trimmed);
      replyContent = '';
      showReplyInput = false;
    }
  }

  function cancelReply(): void {
    replyContent = '';
    showReplyInput = false;
  }

  $effect(() => {
    if (showReplyInput && replyTextareaRef) {
      replyTextareaRef.focus();
    }
  });

  $effect(() => {
    if (showMenu) {
      const handleClickOutside = (_event: MouseEvent) => {
        showMenu = false;
      };
      setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div
  class="comment-card"
  class:active={isActive}
  class:resolved={comment.resolved}
  onclick={handleCardClick}
  onkeydown={handleCardKeydown}
  role="button"
  tabindex="0"
>
  <!-- Main Comment -->
  <div class="comment-main">
    <div class="card-header">
      <div class="author-info">
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
      </div>

      <div class="header-actions">
        {#if onReact}
          <div class="action-container">
            <button
              type="button"
              class="action-btn"
              onclick={handleReactionToggle}
              aria-label="Add reaction"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path
                  d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM5.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-5.9 4.8a.75.75 0 0 1 1.05-.15 3.5 3.5 0 0 0 4.7 0 .75.75 0 1 1 .9 1.2 5 5 0 0 1-6.5 0 .75.75 0 0 1-.15-1.05z"
                />
              </svg>
            </button>
            {#if showReactionPicker}
              <div class="reaction-picker-wrapper">
                <ReactionPicker
                  onSelect={handleReactionSelect}
                  onClose={() => (showReactionPicker = false)}
                />
              </div>
            {/if}
          </div>
        {/if}

        {#if onResolve || onUnresolve}
          <button
            type="button"
            class="action-btn resolve-btn"
            class:resolved={comment.resolved}
            onclick={handleResolve}
            aria-label={comment.resolved ? 'Unresolve comment' : 'Resolve comment'}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
              />
            </svg>
          </button>
        {/if}

        <div class="action-container">
          <button
            type="button"
            class="action-btn"
            onclick={handleMenuToggle}
            aria-label="More options"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="13" cy="8" r="1.5" />
            </svg>
          </button>

          {#if showMenu}
            <div class="menu-dropdown">
              {#if onReply}
                <button type="button" class="menu-item" onclick={handleReplyClick}> Reply </button>
              {/if}
              {#if isOwnComment && onDelete}
                <button
                  type="button"
                  class="menu-item menu-item-danger"
                  onclick={() => {
                    showMenu = false;
                    onDelete?.();
                  }}
                >
                  Delete
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="content">{@html formattedContent}</div>

    <!-- AI Error Status (only show when failed) -->
    {#if isAIComment && aiStatus === 'failed'}
      <div class="ai-status failed">
        <span class="status-icon">!</span>
        <span>AI feedback failed</span>
        {#if aiFeedback?.metadata.error}
          <span class="error-message">{aiFeedback.metadata.error}</span>
        {/if}
      </div>
    {/if}

    <!-- Suggested Edits -->
    {#if pendingEdits.length > 0}
      <div class="suggested-edits">
        <div class="edits-header">
          <span class="edits-title">Suggested Edits ({pendingEdits.length})</span>
        </div>
        {#each pendingEdits as edit (edit.id)}
          <div class="edit-suggestion">
            <div class="edit-diff">
              <div class="diff-remove">{edit.originalText}</div>
              <div class="diff-add">{edit.suggestedText}</div>
            </div>
            {#if edit.explanation}
              <div class="edit-explanation">{edit.explanation}</div>
            {/if}
            <div class="edit-actions">
              <button
                type="button"
                class="edit-btn apply"
                onclick={() => onApplyEdit?.(edit)}
              >
                Apply
              </button>
              <button
                type="button"
                class="edit-btn reject"
                onclick={() => onRejectEdit?.(edit)}
              >
                Reject
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if groupedReactions.length > 0}
      <div class="reactions">
        {#each groupedReactions as reaction}
          <button
            type="button"
            class="reaction-badge"
            class:own={reaction.hasOwn}
            onclick={() => onReact?.(null, reaction.emoji as ReactionEmoji)}
            title={`${String(reaction.count)} reaction${reaction.count > 1 ? 's' : ''}`}
          >
            <span class="reaction-emoji">{reaction.emoji}</span>
            <span class="reaction-count">{reaction.count}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- AI Working Indicator (shows as a typing reply) -->
  {#if isAIWorking}
    <div class="replies">
      <div class="reply-item ai-working">
        <div class="reply-header">
          <div class="avatar small ai-avatar" title={agentDisplayName}>
            <span class="initials">AI</span>
          </div>
          <div class="meta">
            <span class="author-name">{agentDisplayName}</span>
          </div>
        </div>
        <div class="reply-content typing-indicator">
          <span class="typing-text">{agentDisplayName} is thinking</span>
          <span class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Replies -->
  {#if hasReplies}
    <div class="replies">
      {#each comment.replies as reply (reply.id)}
        <div class="reply-item">
          <div class="reply-header">
            <div class="avatar small" title={reply.author.name}>
              {#if reply.author.avatarUrl}
                <img src={reply.author.avatarUrl} alt={reply.author.name} />
              {:else}
                <span class="initials">{reply.author.initials}</span>
              {/if}
            </div>
            <div class="meta">
              <span class="author-name">{reply.author.name}</span>
              <span class="timestamp">{formatTimestamp(reply.createdAt)}</span>
            </div>
          </div>
          <div class="reply-content">{reply.content}</div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Reply Input -->
  {#if isActive && showReplyInput}
    <div class="reply-input-container">
      <div class="reply-input-header">
        <div class="avatar small" title={currentAuthor.name}>
          {#if currentAuthor.avatarUrl}
            <img src={currentAuthor.avatarUrl} alt={currentAuthor.name} />
          {:else}
            <span class="initials">{currentAuthor.initials}</span>
          {/if}
        </div>
      </div>
      <textarea
        bind:this={replyTextareaRef}
        value={replyContent}
        oninput={handleReplyInput}
        onkeydown={handleReplyKeydown}
        placeholder="Reply..."
        rows="1"
        class="reply-textarea"
      ></textarea>
      <div class="reply-actions">
        <button type="button" class="btn btn-cancel" onclick={cancelReply}> Cancel </button>
        <button
          type="button"
          class="btn btn-reply"
          class:enabled={hasReplyContent}
          disabled={!hasReplyContent}
          onclick={submitReply}
        >
          Reply
        </button>
      </div>
    </div>
  {:else if isActive && onReply}
    <button type="button" class="quick-reply-btn" onclick={handleReplyClick}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M6.78 1.97a.75.75 0 0 1 0 1.06L3.81 6h6.44A4.75 4.75 0 0 1 15 10.75v2.5a.75.75 0 0 1-1.5 0v-2.5a3.25 3.25 0 0 0-3.25-3.25H3.81l2.97 2.97a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0z"
        />
      </svg>
      Reply
    </button>
  {/if}
</div>

<style>
  .comment-card {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition:
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .comment-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border-color: var(--glow-border-default);
  }

  .comment-card.active {
    border-color: var(--glow-accent-primary);
  }

  .comment-card.resolved {
    opacity: 0.6;
  }

  .comment-main {
    padding: 16px;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .author-info {
    display: flex;
    align-items: center;
    gap: 10px;
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

  .avatar.small {
    width: 24px;
    height: 24px;
  }

  .avatar.small .initials {
    font-size: 10px;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .initials {
    font-size: 12px;
    font-weight: 500;
    color: white;
    text-transform: uppercase;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .author-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--glow-text-primary);
  }

  .timestamp {
    font-size: 11px;
    color: var(--glow-text-tertiary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .comment-card:hover .header-actions,
  .comment-card.active .header-actions {
    opacity: 1;
  }

  .action-container {
    position: relative;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .action-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .resolve-btn.resolved {
    color: var(--glow-accent-success);
  }

  .resolve-btn:hover {
    color: var(--glow-accent-success);
  }

  .reaction-picker-wrapper {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 110;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-default);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    z-index: 110;
    min-width: 120px;
  }

  .menu-item {
    width: 100%;
    padding: 8px 16px;
    background: none;
    border: none;
    font-size: 13px;
    color: var(--glow-text-primary);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .menu-item:hover {
    background-color: var(--glow-bg-surface);
  }

  .menu-item-danger {
    color: var(--glow-accent-error);
  }

  .menu-item-danger:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }

  .content {
    font-size: 13px;
    line-height: 1.5;
    color: var(--glow-text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .content :global(.mention-highlight) {
    font-weight: 600;
    color: var(--glow-accent-primary);
    background-color: rgba(96, 165, 250, 0.15);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .reaction-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 12px;
    font-size: 12px;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }

  .reaction-badge:hover {
    background-color: var(--glow-bg-base);
    border-color: var(--glow-border-default);
  }

  .reaction-badge.own {
    background-color: rgba(96, 165, 250, 0.15);
    border-color: var(--glow-accent-primary);
  }

  .reaction-emoji {
    font-size: 14px;
  }

  .reaction-count {
    color: var(--glow-text-secondary);
    font-weight: 500;
  }

  .replies {
    border-top: 1px solid var(--glow-border-subtle);
    padding-top: 8px;
    margin-top: 8px;
  }

  .reply-item {
    padding: 12px 16px;
  }

  .reply-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .reply-content {
    font-size: 13px;
    line-height: 1.4;
    color: var(--glow-text-primary);
    margin-left: 32px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .reply-input-container {
    border-top: 1px solid var(--glow-border-subtle);
    padding: 16px;
  }

  .reply-input-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .reply-textarea {
    width: 100%;
    min-height: 32px;
    max-height: 100px;
    padding: 8px 12px;
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    color: var(--glow-text-primary);
    font-family: var(--glow-font-sans);
    font-size: 13px;
    line-height: 1.4;
    resize: none;
    overflow-y: auto;
    transition: border-color 0.2s ease;
  }

  .reply-textarea::placeholder {
    color: var(--glow-text-tertiary);
  }

  .reply-textarea:focus {
    outline: none;
    border-color: var(--glow-accent-primary);
  }

  .reply-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .btn {
    padding: 6px 14px;
    font-size: 13px;
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

  .btn-reply {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-secondary);
  }

  .btn-reply:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-reply.enabled {
    background-color: var(--glow-accent-primary);
    color: white;
  }

  .btn-reply.enabled:hover {
    background-color: var(--glow-accent-hover);
  }

  .quick-reply-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 12px 16px;
    background-color: var(--glow-bg-elevated);
    border: none;
    border-top: 1px solid var(--glow-border-subtle);
    font-size: 13px;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .quick-reply-btn:hover {
    background-color: var(--glow-bg-base);
    color: var(--glow-text-primary);
  }

  .quick-reply-btn svg {
    transform: scaleX(-1);
  }

  /* AI Status Indicator (error only) */
  .ai-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-top: 10px;
    border-radius: 6px;
    font-size: 12px;
  }

  .ai-status.failed {
    color: var(--glow-accent-error);
    border: 1px solid var(--glow-accent-error);
    background-color: rgba(239, 68, 68, 0.1);
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: var(--glow-accent-error);
    color: white;
    font-size: 12px;
    font-weight: bold;
  }

  .error-message {
    font-size: 11px;
    opacity: 0.8;
    margin-left: 4px;
  }

  /* Suggested Edits */
  .suggested-edits {
    margin-top: 12px;
    border: 1px solid var(--glow-border-subtle);
    border-radius: 6px;
    overflow: hidden;
  }

  .edits-header {
    padding: 8px 12px;
    background-color: var(--glow-bg-elevated);
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .edits-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--glow-text-secondary);
  }

  .edit-suggestion {
    padding: 12px;
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .edit-suggestion:last-child {
    border-bottom: none;
  }

  .edit-diff {
    font-family: var(--glow-font-mono, monospace);
    font-size: 12px;
    line-height: 1.5;
    border-radius: 4px;
    overflow: hidden;
  }

  .diff-remove {
    padding: 6px 10px;
    background-color: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    text-decoration: line-through;
  }

  .diff-add {
    padding: 6px 10px;
    background-color: rgba(34, 197, 94, 0.15);
    color: #86efac;
  }

  .edit-explanation {
    margin-top: 8px;
    font-size: 12px;
    color: var(--glow-text-tertiary);
    font-style: italic;
  }

  .edit-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .edit-btn {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .edit-btn.apply {
    background-color: var(--glow-accent-success);
    color: white;
  }

  .edit-btn.apply:hover {
    background-color: #16a34a;
  }

  .edit-btn.reject {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-secondary);
    border: 1px solid var(--glow-border-default);
  }

  .edit-btn.reject:hover {
    background-color: var(--glow-bg-base);
  }

  /* AI Working / Typing Indicator */
  .ai-working {
    background-color: rgba(96, 165, 250, 0.05);
  }

  .ai-avatar {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--glow-text-secondary);
    font-style: italic;
  }

  .typing-text {
    font-size: 13px;
  }

  .typing-dots {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .typing-dots .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--glow-accent-primary);
    animation: typing-bounce 1.4s ease-in-out infinite;
  }

  .typing-dots .dot:nth-child(1) {
    animation-delay: 0s;
  }

  .typing-dots .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dots .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing-bounce {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }
</style>
