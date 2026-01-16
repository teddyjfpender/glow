<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import Underline from '@tiptap/extension-underline';
  import TextAlign from '@tiptap/extension-text-align';
  import TextStyle from '@tiptap/extension-text-style';
  import Color from '@tiptap/extension-color';
  import Highlight from '@tiptap/extension-highlight';
  import FontFamily from '@tiptap/extension-font-family';
  import Link from '@tiptap/extension-link';
  import { FontSize } from '$lib/editor/extensions/font-size';
  import { ExcalidrawExtension } from '$lib/editor/extensions/excalidraw';
  import { CommentMark } from '$lib/editor/extensions/comment-mark';
  import { LatexExtension } from '$lib/editor/extensions/latex';
  import Toolbar from './Toolbar.svelte';
  import { CommentCardsContainer } from '$lib/components/comments';
  import { documentState } from '$lib/state/document.svelte';
  import { commentsState } from '$lib/state/comments.svelte';
  import { DrawingOverlay, drawingEditorState } from '$lib/editor/excalidraw';
  import { createDefaultAuthor, type ReactionEmoji, type Comment } from '$lib/comments/types';
  import SideToolbar from './SideToolbar.svelte';
  import RSVPReader from './rsvp/RSVPReader.svelte';
  import { rsvpState } from '$lib/state/rsvp.svelte';

  interface Props {
    onEditorReady?: (editor: Editor) => void;
  }

  const { onEditorReady }: Props = $props();

  let editorElement: HTMLDivElement;
  let documentAreaRef = $state<HTMLDivElement | null>(null);
  let editor: Editor | null = $state(null);
  let lastSyncedContent = '';
  let lastPageIndex = $state(0); // Track the last page index to detect page changes

  // Comment system state
  const currentAuthor = createDefaultAuthor();

  // Track selection state for side toolbar
  let hasSelection = $state(false);

  // RSVP playback interval
  let rsvpInterval: ReturnType<typeof setInterval> | null = null;

  // Handle RSVP playback
  $effect(() => {
    if (rsvpState.isPlaying) {
      const intervalMs = (60 / rsvpState.wordsPerMinute) * 1000;
      rsvpInterval = setInterval(() => {
        rsvpState.nextWord();
      }, intervalMs);
    } else {
      if (rsvpInterval) {
        clearInterval(rsvpInterval);
        rsvpInterval = null;
      }
    }

    return () => {
      if (rsvpInterval) {
        clearInterval(rsvpInterval);
        rsvpInterval = null;
      }
    };
  });

  // Expose function to activate draw-anywhere mode
  export function activateDrawAnywhere(): void {
    drawingEditorState.activateOverlay();
  }

  // Watch for page changes - load content when switching pages
  $effect(() => {
    const currentPageIndex = documentState.currentPageIndex;
    if (editor && currentPageIndex !== lastPageIndex) {
      // Page changed - load the new page's content
      const newContent = documentState.content;
      editor.commands.setContent(newContent);
      lastSyncedContent = newContent;
      lastPageIndex = currentPageIndex;
    }
  });

  // Watch for external content changes (from loading documents)
  $effect(() => {
    const content = documentState.content;
    if (editor && content !== lastSyncedContent) {
      // Only update if the change came from loading, not from typing
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
      lastSyncedContent = content;
    }
  });

  // Load comments when documentId changes
  $effect(() => {
    const docId = documentState.id;
    if (docId) {
      void commentsState.loadComments(docId);
    }
  });

  // Track selection state for side toolbar
  $effect(() => {
    if (!editor) {
      hasSelection = false;
      return;
    }

    const updateSelection = (): void => {
      const { from, to } = editor.state.selection;
      hasSelection = from !== to;
    };

    editor.on('selectionUpdate', updateSelection);
    editor.on('transaction', updateSelection);

    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('transaction', updateSelection);
    };
  });

  // Side toolbar handlers
  function handleSideToolbarDraw(): void {
    drawingEditorState.activateOverlay();
  }

  function handleSideToolbarComment(): void {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    commentsState.openPanel();

    const event = new CustomEvent('glow:create-comment', {
      bubbles: true,
      detail: { from, to, quotedText: selectedText },
    });
    editor.view.dom.dispatchEvent(event);
  }

  function handleSideToolbarRSVP(): void {
    if (!editor) return;

    // Extract plain text from the document
    const text = editor.state.doc.textContent;
    if (text.trim()) {
      rsvpState.start(text);
    }
  }

  // State for new comment creation (floating card input)
  let newCommentState: { from: number; to: number; quotedText: string; top: number } | null =
    $state(null);

  // Track comment positions based on their highlighted text Y position
  interface CommentPosition {
    commentId: string;
    top: number;
  }
  let commentPositions = $state<CommentPosition[]>([]);

  // Update comment positions when editor content changes or on scroll
  function updateCommentPositions(): void {
    if (!editor || !documentAreaRef) return;

    // Store references for use in callback
    const editorRef = editor;
    const containerRef = documentAreaRef;

    const positions: CommentPosition[] = [];
    const { doc } = editorRef.state;
    const containerRect = containerRef.getBoundingClientRect();

    doc.descendants((node, pos) => {
      if (!node.isText) return true;

      for (const mark of node.marks) {
        if (mark.type.name === 'comment') {
          const commentId = mark.attrs.commentId as string;
          // Check if we already have this comment's position
          if (!positions.find((p) => p.commentId === commentId)) {
            try {
              const coords = editorRef.view.coordsAtPos(pos);
              // Calculate position relative to the document area, accounting for scroll
              const top = coords.top - containerRect.top + containerRef.scrollTop;
              positions.push({ commentId, top });
            } catch {
              // Position might be invalid, skip
            }
          }
        }
      }
      return true;
    });

    commentPositions = positions;
  }

  // Update positions on editor transaction and scroll
  $effect(() => {
    if (!editor) return;

    const handleUpdate = (): void => {
      // Use requestAnimationFrame to debounce position updates
      requestAnimationFrame(updateCommentPositions);
    };

    editor.on('transaction', handleUpdate);

    // Initial position calculation
    updateCommentPositions();

    return () => {
      editor.off('transaction', handleUpdate);
    };
  });

  // Comment creation handler - creates comment and applies mark
  function handleSubmitNewComment(content: string): void {
    const docId = documentState.id;
    if (!docId || !newCommentState) return;

    const { from, to, quotedText } = newCommentState;

    void commentsState
      .addComment({
        documentId: docId,
        textRange: { from, to, quotedText },
        content,
        author: currentAuthor,
      })
      .then((comment) => {
        if (comment && editor) {
          // Select the text range and apply the comment mark
          editor.commands.setTextSelection({ from, to });
          editor.commands.setComment(comment.id);
          editor.commands.setActiveComment(comment.id);
          // Update positions to include new comment
          updateCommentPositions();
        }
        newCommentState = null;
      });
  }

  function handleCancelNewComment(): void {
    newCommentState = null;
  }

  // Handle the custom event from toolbar to initiate comment creation
  function handleCreateCommentEvent(event: Event): void {
    const customEvent = event as CustomEvent<{ from: number; to: number; quotedText: string }>;
    const { from, to, quotedText } = customEvent.detail;

    if (!editor || !documentAreaRef) return;

    // Get the Y position of the selected text
    try {
      const coords = editor.view.coordsAtPos(from);
      const containerRect = documentAreaRef.getBoundingClientRect();
      const top = coords.top - containerRect.top + documentAreaRef.scrollTop;

      // Set state to show the floating comment input card
      newCommentState = { from, to, quotedText, top };
    } catch {
      // Fallback: show at a default position
      newCommentState = { from, to, quotedText, top: 100 };
    }
  }

  // Get comments with their positions for the container
  const commentsWithPositions = $derived.by(() => {
    const comments = commentsState.commentsArray;
    return comments
      .map((comment: Comment) => {
        const pos = commentPositions.find((p) => p.commentId === comment.id);
        return {
          comment,
          top: pos?.top ?? 0,
        };
      })
      .filter((c) => c.top > 0); // Only show comments that have valid positions
  });

  // Scroll to comment in editor
  function scrollToCommentInEditor(commentId: string): void {
    if (!editor) return;

    // Set this comment as active
    editor.commands.setActiveComment(commentId);

    // Find the mark position in the document
    const { doc } = editor.state;
    let targetPos: number | null = null;

    doc.descendants((node, pos) => {
      if (targetPos !== null) return false;
      if (!node.isText) return true;

      const commentMark = node.marks.find(
        (mark) => mark.type.name === 'comment' && mark.attrs.commentId === commentId,
      );

      if (commentMark) {
        targetPos = pos;
        return false;
      }
      return true;
    });

    if (targetPos !== null && documentAreaRef) {
      // Get coordinates of the mark position
      const coords = editor.view.coordsAtPos(targetPos);
      const containerRect = documentAreaRef.getBoundingClientRect();

      // Scroll the container to show the comment
      const scrollTop = coords.top - containerRect.top + documentAreaRef.scrollTop - 100;
      documentAreaRef.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      });
    }
  }

  // Clear active comment when clicking outside comment cards
  function handleDocumentAreaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Don't clear if clicking inside the comments area
    if (target.closest('.comments-area')) return;
    // Clear active comment
    commentsState.setActiveComment(null);
    if (editor) {
      editor.commands.clearActiveComment();
    }
  }

  // Comment panel handlers
  function handleResolveComment(commentId: string): void {
    void commentsState.resolveComment(commentId, currentAuthor);
  }

  function handleUnresolveComment(commentId: string): void {
    void commentsState.unresolveComment(commentId);
  }

  function handleDeleteComment(commentId: string): void {
    void commentsState.deleteComment(commentId);
    if (editor) {
      editor.commands.unsetComment(commentId);
    }
  }

  function handleReplyToComment(commentId: string, content: string): void {
    void commentsState.addReply({
      commentId,
      content,
      author: currentAuthor,
    });
  }

  function handleReaction(commentId: string, _replyId: string | null, emoji: ReactionEmoji): void {
    void commentsState.addReaction(commentId, emoji, currentAuthor);
  }

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Placeholder.configure({
          placeholder: 'Type something...',
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        FontFamily,
        FontSize,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'editor-link',
          },
        }),
        ExcalidrawExtension.configure({
          defaultTheme: 'dark',
        }),
        CommentMark,
        LatexExtension,
      ],
      content: documentState.content,
      editorProps: {
        attributes: {
          class: 'document-content',
        },
      },
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        lastSyncedContent = html;
        documentState.setContent(html);
      },
    });
    lastSyncedContent = documentState.content;
    onEditorReady?.(editor);

    // Listen for comment creation events from toolbar
    editorElement.addEventListener('glow:create-comment', handleCreateCommentEvent);
  });

  onDestroy(() => {
    editorElement?.removeEventListener('glow:create-comment', handleCreateCommentEvent);
    editor?.destroy();
  });
</script>

<div class="document-container">
  <!-- Toolbar -->
  <Toolbar {editor} />

  <!-- Ruler (optional - simplified version) -->
  <div class="ruler">
    <div class="ruler-content">
      {#each Array(17) as _, i}
        <div class="ruler-mark" style="left: {i * 48}px">
          <span class="ruler-number">{i}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Main content area with document and floating comment cards -->
  <div class="main-content">
    <!-- Document area with page -->
    <div
      class="document-area"
      bind:this={documentAreaRef}
      onscroll={updateCommentPositions}
      onclick={handleDocumentAreaClick}
    >
      <div class="page-wrapper">
        <div class="pages-stack">
          {#each documentState.pages as page, index (page.id)}
            <!-- Page break between pages -->
            {#if index > 0}
              <div class="page-break">
                <div class="page-break-line"></div>
              </div>
            {/if}

            <div class="page-container" class:active={index === documentState.currentPageIndex}>
              <!-- Page number indicator -->
              <div class="page-number">Page {index + 1}</div>

              <div
                class="page"
                class:editable={index === documentState.currentPageIndex}
                onclick={() => {
                  if (index !== documentState.currentPageIndex) {
                    documentState.goToPage(index);
                  }
                }}
                onkeydown={(e) => {
                  if (e.key === 'Enter' && index !== documentState.currentPageIndex) {
                    documentState.goToPage(index);
                  }
                }}
                role="button"
                tabindex={index === documentState.currentPageIndex ? -1 : 0}
              >
                {#if index === documentState.currentPageIndex}
                  <div class="editor" bind:this={editorElement}></div>
                {:else}
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rendering saved document content -->
                  <div class="page-content-preview document-content">{@html page.content || '<p class="empty-page-hint">Click to edit this page</p>'}</div>
                {/if}
              </div>

              <!-- Page actions (delete) - only show for non-active pages with multiple pages -->
              {#if documentState.totalPages > 1 && index !== documentState.currentPageIndex}
                <button
                  class="page-delete-btn"
                  onclick={(e) => {
                    e.stopPropagation();
                    documentState.deletePage(index);
                  }}
                  title="Delete this page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              {/if}

              <!-- Side Toolbar - only show on active page -->
              {#if index === documentState.currentPageIndex}
                <SideToolbar
                  {hasSelection}
                  onDraw={handleSideToolbarDraw}
                  onComment={handleSideToolbarComment}
                  onRSVPReader={handleSideToolbarRSVP}
                />
              {/if}
            </div>
          {/each}

          <!-- Add page button at the end -->
          <div class="add-page-section">
            <button
              class="add-page-btn"
              onclick={() => documentState.addPage()}
              title="Add new page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Page</span>
            </button>
          </div>
        </div>

        <!-- Floating comment cards positioned to the right of the page -->
        <div class="comments-area">
          <CommentCardsContainer
            comments={commentsWithPositions}
            {currentAuthor}
            activeCommentId={commentsState.activeCommentId}
            showResolved={commentsState.showResolved}
            newComment={newCommentState}
            onNewCommentSubmit={handleSubmitNewComment}
            onNewCommentCancel={handleCancelNewComment}
            onActivate={(commentId: string) => {
              commentsState.setActiveComment(commentId);
              scrollToCommentInEditor(commentId);
            }}
            onResolve={handleResolveComment}
            onUnresolve={handleUnresolveComment}
            onDelete={handleDeleteComment}
            onReply={handleReplyToComment}
            onReact={handleReaction}
          />
        </div>
      </div>

      <!-- Drawing Overlay for "draw anywhere" functionality -->
      <DrawingOverlay editor={editor ?? undefined} containerRef={documentAreaRef} theme="dark" />
    </div>
  </div>

</div>

<!-- RSVP Reader (fullscreen overlay) -->
{#if rsvpState.isActive}
  <RSVPReader
    words={rsvpState.words}
    currentIndex={rsvpState.currentIndex}
    isPlaying={rsvpState.isPlaying}
    wordsPerMinute={rsvpState.wordsPerMinute}
    onClose={() => rsvpState.close()}
    onPlayPause={() => rsvpState.togglePlayPause()}
    onNext={() => rsvpState.nextWord()}
    onPrev={() => rsvpState.prevWord()}
    onSkipToStart={() => rsvpState.reset()}
    onSkipToEnd={() => rsvpState.seekTo(rsvpState.totalWords - 1)}
    onSpeedChange={(wpm: number) => rsvpState.setSpeed(wpm)}
    onSeek={(index: number) => rsvpState.seekTo(index)}
  />
{/if}

<style>
  .document-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #525659;
  }

  .main-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .ruler {
    height: 24px;
    background-color: var(--glow-bg-surface);
    border-bottom: 1px solid var(--glow-border-subtle);
    display: flex;
    justify-content: center;
    overflow: hidden;
  }

  .ruler-content {
    width: 816px;
    position: relative;
    background-color: var(--glow-bg-elevated);
    margin: 0 auto;
  }

  .ruler-mark {
    position: absolute;
    top: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ruler-mark::after {
    content: '';
    width: 1px;
    height: 8px;
    background-color: var(--glow-text-tertiary);
    margin-top: auto;
  }

  .ruler-number {
    font-size: 9px;
    color: var(--glow-text-tertiary);
    margin-top: 2px;
  }

  .document-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px 40px 60px;
    display: flex;
    justify-content: center;
    position: relative; /* For DrawingOverlay positioning */
  }

  .page-wrapper {
    display: flex;
    gap: 24px;
    position: relative;
  }

  .pages-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .page-container {
    position: relative;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Page break between pages */
  .page-break {
    width: 816px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .page-break-line {
    width: 100%;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.15) 10%,
      rgba(255, 255, 255, 0.15) 90%,
      transparent
    );
    position: relative;
  }

  .page-break-line::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 3px;
    background-color: #525659;
  }

  /* Page number indicator */
  .page-number {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: var(--glow-text-tertiary, #666);
    background-color: #525659;
    padding: 2px 12px;
    border-radius: 4px;
    z-index: 10;
  }

  /* Page delete button for inactive pages */
  .page-delete-btn {
    position: absolute;
    top: 8px;
    right: -36px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: var(--glow-error, #ef4444);
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s ease;
  }

  .page-container:hover .page-delete-btn {
    opacity: 1;
  }

  .page-delete-btn:hover {
    background-color: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  /* Add page section at the end */
  .add-page-section {
    margin-top: 24px;
    margin-bottom: 40px;
  }

  .add-page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    background-color: var(--glow-bg-elevated, #1e1e1e);
    border: 2px dashed var(--glow-border-default, #3a3a3a);
    border-radius: 8px;
    color: var(--glow-text-secondary, #a0a0a0);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s ease;
  }

  .add-page-btn:hover {
    background-color: var(--glow-bg-surface, #2a2a2a);
    border-color: var(--glow-accent-primary, #3b82f6);
    color: var(--glow-accent-primary, #3b82f6);
  }

  .page {
    width: 816px;
    min-height: 1056px;
    background-color: #121212;
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2);
    padding: 96px 96px 72px;
    flex-shrink: 0;
    transition: box-shadow 0.15s ease, opacity 0.15s ease;
  }

  /* Non-editable pages are clickable */
  .page:not(.editable) {
    cursor: pointer;
    opacity: 0.85;
  }

  .page:not(.editable):hover {
    opacity: 1;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2),
      0 0 0 2px var(--glow-accent-primary, #3b82f6);
  }

  /* Active page indicator */
  .page-container.active .page {
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2),
      0 0 0 2px var(--glow-accent-primary, #3b82f6);
  }

  /* Page content preview for non-active pages */
  .page-content-preview {
    min-height: 100%;
    font-family: var(--glow-font-sans);
    font-size: 11pt;
    line-height: 1.5;
    color: var(--glow-text-primary);
  }

  .page-content-preview :global(p) {
    margin: 0 0 12px 0;
  }

  .page-content-preview :global(h1) {
    font-size: 26pt;
    font-weight: 400;
    margin: 24px 0 12px 0;
    line-height: 1.2;
  }

  .page-content-preview :global(h2) {
    font-size: 18pt;
    font-weight: 400;
    margin: 20px 0 10px 0;
    line-height: 1.3;
  }

  .page-content-preview :global(h3) {
    font-size: 14pt;
    font-weight: 600;
    margin: 16px 0 8px 0;
    line-height: 1.4;
  }

  .page-content-preview :global(ul),
  .page-content-preview :global(ol) {
    margin: 0 0 12px 0;
    padding-left: 24px;
  }

  .page-content-preview :global(li) {
    margin-bottom: 4px;
  }

  /* Empty page hint */
  .page-content-preview :global(.empty-page-hint) {
    color: var(--glow-text-tertiary, #666);
    font-style: italic;
  }

  .comments-area {
    width: 300px;
    flex-shrink: 0;
    position: relative;
    /* Allow dropdowns to overflow */
    overflow: visible;
  }

  .editor {
    min-height: 100%;
  }

  .editor :global(.document-content) {
    outline: none;
    min-height: 100%;
    font-family: var(--glow-font-sans);
    font-size: 11pt;
    line-height: 1.5;
    color: var(--glow-text-primary);
  }

  .editor :global(.document-content p) {
    margin: 0 0 12px 0;
  }

  .editor :global(.document-content h1) {
    font-size: 26pt;
    font-weight: 400;
    margin: 24px 0 12px 0;
    line-height: 1.2;
  }

  .editor :global(.document-content h2) {
    font-size: 18pt;
    font-weight: 400;
    margin: 20px 0 10px 0;
    line-height: 1.3;
  }

  .editor :global(.document-content h3) {
    font-size: 14pt;
    font-weight: 600;
    margin: 16px 0 8px 0;
    line-height: 1.4;
  }

  .editor :global(.document-content ul) {
    margin: 0 0 12px 0;
    padding-left: 24px;
    color: var(--glow-text-primary);
    list-style-type: disc !important;
    list-style-position: outside;
  }

  .editor :global(.document-content ol) {
    margin: 0 0 12px 0;
    padding-left: 24px;
    color: var(--glow-text-primary);
    list-style-type: decimal !important;
    list-style-position: outside;
  }

  .editor :global(.document-content li) {
    margin-bottom: 4px;
    color: var(--glow-text-primary);
    display: list-item !important;
  }

  .editor :global(.document-content li::marker) {
    color: var(--glow-text-primary) !important;
  }

  /* Nested list styles */
  .editor :global(.document-content ul ul),
  .editor :global(.document-content ol ul) {
    list-style-type: circle !important;
  }

  .editor :global(.document-content ul ul ul),
  .editor :global(.document-content ol ul ul) {
    list-style-type: square !important;
  }

  .editor :global(.document-content blockquote) {
    border-left: 4px solid var(--glow-border-default);
    margin: 12px 0;
    padding-left: 16px;
    color: var(--glow-text-secondary);
  }

  .editor :global(.document-content code) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .editor :global(.document-content pre) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-surface);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .editor :global(.document-content pre code) {
    background: none;
    padding: 0;
  }

  .editor :global(.document-content hr) {
    border: none;
    border-top: 1px solid var(--glow-border-subtle);
    margin: 24px 0;
  }

  .editor :global(.document-content p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: var(--glow-text-tertiary);
    pointer-events: none;
    float: left;
    height: 0;
  }

  /* Text alignment */
  .editor :global(.document-content [style*='text-align: center']) {
    text-align: center;
  }

  .editor :global(.document-content [style*='text-align: right']) {
    text-align: right;
  }

  .editor :global(.document-content [style*='text-align: justify']) {
    text-align: justify;
  }

  /* Excalidraw node styles */
  .editor :global(.document-content [data-node-view-wrapper]) {
    margin: 16px 0;
  }

  .editor :global(.document-content .excalidraw-node) {
    margin: 16px 0;
  }

  /* Link styles */
  .editor :global(.document-content a),
  .editor :global(.document-content .editor-link) {
    color: var(--glow-accent-primary, #60a5fa);
    text-decoration: underline;
    cursor: pointer;
  }

  .editor :global(.document-content a:hover),
  .editor :global(.document-content .editor-link:hover) {
    color: var(--glow-accent-hover, #93c5fd);
  }

  /* Comment highlight styles */
  .editor :global(.document-content .comment-highlight) {
    background-color: rgba(251, 191, 36, 0.3);
    border-bottom: 2px solid rgb(251, 191, 36);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .editor :global(.document-content .comment-highlight:hover) {
    background-color: rgba(251, 191, 36, 0.45);
  }

  .editor :global(.document-content .comment-highlight[data-comment-active='true']) {
    background-color: rgba(251, 191, 36, 0.5);
    border-bottom-width: 3px;
  }
</style>
