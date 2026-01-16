<script lang="ts">
  import type { Comment, Author, ReactionEmoji } from '$lib/comments/types';
  import CommentCard from './CommentCard.svelte';
  import CommentCardInput from './CommentCardInput.svelte';

  interface CommentWithPosition {
    comment: Comment;
    top: number;
  }

  interface PositionedComment {
    comment: Comment;
    originalTop: number;
    displayTop: number;
  }

  interface NewCommentState {
    from: number;
    to: number;
    quotedText: string;
    top: number;
  }

  interface Props {
    comments: CommentWithPosition[];
    currentAuthor: Author;
    activeCommentId?: string | null;
    newComment?: NewCommentState | null;
    showResolved?: boolean;
    onActivate?: (commentId: string) => void;
    onResolve?: (commentId: string) => void;
    onUnresolve?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onReply?: (commentId: string, content: string) => void;
    onReact?: (commentId: string, replyId: string | null, emoji: ReactionEmoji) => void;
    onNewCommentSubmit?: (content: string) => void;
    onNewCommentCancel?: () => void;
  }

  const {
    comments,
    currentAuthor,
    activeCommentId = null,
    newComment = null,
    showResolved = false,
    onActivate,
    onResolve,
    onUnresolve,
    onDelete,
    onReply,
    onReact,
    onNewCommentSubmit,
    onNewCommentCancel,
  }: Props = $props();

  // Minimum vertical gap between cards to prevent overlap
  const MIN_CARD_GAP = 8;
  const ESTIMATED_CARD_HEIGHT = 120;

  // Filter and sort comments
  const filteredComments = $derived.by(() => {
    let result = comments;

    if (!showResolved) {
      result = result.filter((c) => !c.comment.resolved);
    }

    // Sort by position (top to bottom)
    return result.sort((a, b) => a.top - b.top);
  });

  // Calculate positioned comments to prevent overlap
  const positionedComments = $derived.by(() => {
    const positioned: PositionedComment[] = [];
    let lastBottom = 0;

    for (const item of filteredComments) {
      let displayTop = item.top;

      // If this card would overlap with the previous one, push it down
      if (displayTop < lastBottom + MIN_CARD_GAP) {
        displayTop = lastBottom + MIN_CARD_GAP;
      }

      positioned.push({
        comment: item.comment,
        originalTop: item.top,
        displayTop,
      });

      // Estimate the bottom of this card
      const estimatedHeight = ESTIMATED_CARD_HEIGHT + item.comment.replies.length * 60;
      lastBottom = displayTop + estimatedHeight;
    }

    return positioned;
  });

  // Calculate new comment position, considering existing cards
  const newCommentDisplayTop = $derived.by(() => {
    if (!newComment) return 0;

    let displayTop = newComment.top;

    // Check if it would overlap with any existing card
    for (const positioned of positionedComments) {
      const cardBottom =
        positioned.displayTop + ESTIMATED_CARD_HEIGHT + positioned.comment.replies.length * 60;

      // If the new comment would be within this card's range
      if (displayTop >= positioned.displayTop && displayTop < cardBottom + MIN_CARD_GAP) {
        // Move it below this card
        displayTop = cardBottom + MIN_CARD_GAP;
      }
    }

    return displayTop;
  });
</script>

<div class="comment-cards-container">
  <!-- Existing comments -->
  {#each positionedComments as { comment, originalTop, displayTop } (comment.id)}
    <div class="card-wrapper" style="top: {displayTop}px">
      <!-- Connecting line from highlighted text to card if card was pushed down -->
      {#if originalTop !== displayTop}
        <svg
          class="connector-line"
          style="height: {displayTop - originalTop + 10}px; top: {originalTop - displayTop}px"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={displayTop - originalTop + 10}
            stroke="#dadce0"
            stroke-width="1"
            stroke-dasharray="4,2"
          />
        </svg>
      {/if}

      <CommentCard
        {comment}
        {currentAuthor}
        isActive={activeCommentId === comment.id}
        onActivate={onActivate ? () => onActivate(comment.id) : undefined}
        onResolve={onResolve ? () => onResolve(comment.id) : undefined}
        onUnresolve={onUnresolve ? () => onUnresolve(comment.id) : undefined}
        onDelete={onDelete ? () => onDelete(comment.id) : undefined}
        onReply={onReply ? (content: string) => onReply(comment.id, content) : undefined}
        onReact={onReact
          ? (replyId: string | null, emoji: ReactionEmoji) => onReact(comment.id, replyId, emoji)
          : undefined}
      />
    </div>
  {/each}

  <!-- New comment input -->
  {#if newComment && onNewCommentSubmit && onNewCommentCancel}
    <div class="card-wrapper" style="top: {newCommentDisplayTop}px">
      <!-- Connecting line for new comment if pushed down -->
      {#if newComment.top !== newCommentDisplayTop}
        <svg
          class="connector-line"
          style="height: {newCommentDisplayTop - newComment.top + 10}px; top: {newComment.top -
            newCommentDisplayTop}px"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={newCommentDisplayTop - newComment.top + 10}
            stroke="#1a73e8"
            stroke-width="1"
            stroke-dasharray="4,2"
          />
        </svg>
      {/if}

      <CommentCardInput
        author={currentAuthor}
        onSubmit={onNewCommentSubmit}
        onCancel={onNewCommentCancel}
      />
    </div>
  {/if}
</div>

<style>
  .comment-cards-container {
    position: relative;
    width: 100%;
    min-height: 100%;
    /* Allow dropdowns to overflow */
    overflow: visible;
  }

  .card-wrapper {
    position: absolute;
    right: 0;
    left: 0;
    /* Allow dropdowns to overflow */
    overflow: visible;
  }

  .connector-line {
    position: absolute;
    left: -20px;
    width: 20px;
    pointer-events: none;
    overflow: visible;
  }

  /* Ensure cards appear above the document content */
  .card-wrapper :global(.comment-card),
  .card-wrapper :global(.comment-card-input) {
    position: relative;
    top: 0 !important;
    width: 100%;
  }
</style>
