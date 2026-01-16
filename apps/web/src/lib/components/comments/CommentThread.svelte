<script lang="ts">
  import type {
    CommentThread as CommentThreadType,
    Author,
    ReactionEmoji,
  } from '$lib/comments/types';
  import CommentItem from './CommentItem.svelte';
  import CommentInput from './CommentInput.svelte';

  interface Props {
    thread: CommentThreadType;
    currentAuthor: Author;
    isActive: boolean;
    onActivate: () => void;
    onResolve?: (commentId: string) => void;
    onUnresolve?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onReply?: (commentId: string, content: string) => void;
    onReact?: (commentId: string, replyId: string | null, emoji: ReactionEmoji) => void;
  }

  const {
    thread,
    currentAuthor,
    isActive,
    onActivate,
    onResolve,
    onUnresolve,
    onDelete,
    onReply,
    onReact,
  }: Props = $props();

  let showReplyInput = $state(false);

  const comment = $derived(thread.comment);
  const replies = $derived(thread.comment.replies);
  const hasReplies = $derived(replies.length > 0);

  function handleReply(content: string): void {
    onReply?.(comment.id, content);
    showReplyInput = false;
  }

  function handleReplyCancel(): void {
    showReplyInput = false;
  }

  function handleQuickReply(): void {
    showReplyInput = true;
  }

  function handleThreadClick(): void {
    if (!isActive) {
      onActivate();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !isActive) {
      onActivate();
    }
  }
</script>

<div
  class="comment-thread"
  class:active={isActive}
  class:resolved={comment.resolved}
  onclick={handleThreadClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <CommentItem
    {comment}
    {currentAuthor}
    isMainComment={true}
    onResolve={onResolve ? () => onResolve(comment.id) : undefined}
    onUnresolve={onUnresolve ? () => onUnresolve(comment.id) : undefined}
    onDelete={onDelete ? () => onDelete(comment.id) : undefined}
    onReply={handleQuickReply}
    onReact={onReact ? (emoji: ReactionEmoji) => onReact(comment.id, null, emoji) : undefined}
  />

  {#if hasReplies}
    <div class="replies">
      {#each replies as reply (reply.id)}
        <CommentItem
          comment={reply}
          {currentAuthor}
          isMainComment={false}
          onReact={onReact
            ? (emoji: ReactionEmoji) => onReact(comment.id, reply.id, emoji)
            : undefined}
        />
      {/each}
    </div>
  {/if}

  {#if isActive && showReplyInput}
    <div class="reply-input-container">
      <CommentInput
        placeholder="Reply..."
        autoFocus={true}
        onSubmit={handleReply}
        onCancel={handleReplyCancel}
      />
    </div>
  {:else if isActive && !showReplyInput}
    <button type="button" class="quick-reply-btn" onclick={handleQuickReply}>
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
  .comment-thread {
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 4px;
    cursor: pointer;
    transition:
      border-color var(--glow-transition-fast),
      background-color var(--glow-transition-fast);
  }

  .comment-thread:hover {
    background-color: rgba(99, 102, 241, 0.05);
  }

  .comment-thread.active {
    border-color: var(--glow-accent-primary);
    background-color: rgba(99, 102, 241, 0.08);
  }

  .comment-thread.resolved {
    opacity: 0.7;
  }

  .replies {
    margin-left: 20px;
    padding-left: 12px;
    border-left: 2px solid var(--glow-border-subtle);
  }

  .reply-input-container {
    margin-top: 8px;
    margin-left: 20px;
    padding-left: 12px;
    border-left: 2px solid var(--glow-accent-primary);
  }

  .quick-reply-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    margin-left: 32px;
    padding: 6px 12px;
    background: none;
    border: 1px solid var(--glow-border-default);
    border-radius: 6px;
    font-size: 13px;
    color: var(--glow-text-secondary);
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .quick-reply-btn:hover {
    background-color: var(--glow-bg-elevated);
    border-color: var(--glow-accent-primary);
    color: var(--glow-text-primary);
  }

  .quick-reply-btn svg {
    transform: scaleX(-1);
  }
</style>
