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
  import BionicOverlay from './BionicOverlay.svelte';
  import { rsvpState } from '$lib/state/rsvp.svelte';
  import { bionicState } from '$lib/state/bionic.svelte';

  interface Props {
    onEditorReady?: (editor: Editor) => void;
  }

  const { onEditorReady }: Props = $props();

  let editorElement: HTMLDivElement;
  let documentAreaRef = $state<HTMLDivElement | null>(null);
  let pagesContentRef = $state<HTMLDivElement | null>(null);
  let editor: Editor | null = $state(null);
  let lastSyncedContent = '';

  // Editor content HTML for bionic reading overlay
  let editorContent = $state('');

  // Cursor position for side toolbar
  let cursorTop = $state(100);

  // Comment system state
  const currentAuthor = createDefaultAuthor();

  // Track selection state for side toolbar
  let hasSelection = $state(false);

  // Update cached editor content (used for bionic reading overlay)
  function updateEditorContent(): void {
    if (!editor) return;
    editorContent = editor.getHTML();
  }

  // Update cursor position for side toolbar
  function updateCursorPosition(): void {
    if (!editor || !pagesContentRef) return;
    try {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const containerRect = pagesContentRef.getBoundingClientRect();
      // Calculate position relative to the pages content container
      const relativeTop = coords.top - containerRect.top + pagesContentRef.scrollTop;
      cursorTop = Math.max(50, relativeTop);
    } catch {
      // Position might be invalid
    }
  }

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

  // Track cursor position and page count on editor updates
  $effect(() => {
    if (!editor) return;

    const handleUpdate = (): void => {
      requestAnimationFrame(() => {
        updateEditorContent();
        updateCursorPosition();
      });
    };

    editor.on('transaction', handleUpdate);
    editor.on('selectionUpdate', updateCursorPosition);

    // Initial calculation
    handleUpdate();

    return () => {
      editor.off('transaction', handleUpdate);
      editor.off('selectionUpdate', updateCursorPosition);
    };
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

  function handleSideToolbarBionic(): void {
    // Update editor content before showing bionic overlay
    if (editor && !bionicState.isActive) {
      editorContent = editor.getHTML();
    }
    bionicState.toggle();
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
        <div class="pages-container">
          <!-- Single page frame that grows with content -->
          <div class="page-frame" bind:this={pagesContentRef}>
            <!-- Content area -->
            <div class="page-content-area">
              <div class="editor" bind:this={editorElement}></div>
            </div>
          </div>

          <!-- Side Toolbar follows cursor position -->
          <div class="side-toolbar-container" style="top: {cursorTop}px">
            <SideToolbar
              {hasSelection}
              bionicReadingActive={bionicState.isActive}
              onDraw={handleSideToolbarDraw}
              onComment={handleSideToolbarComment}
              onRSVPReader={handleSideToolbarRSVP}
              onBionicReading={handleSideToolbarBionic}
            />
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

<!-- Bionic Reading (fullscreen overlay) -->
{#if bionicState.isActive}
  <BionicOverlay html={editorContent || editor?.getHTML() || ''} />
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
    position: relative;
    /* Center the pages, comments area positioned absolutely */
    justify-content: center;
  }

  .pages-container {
    position: relative;
  }

  /* Single page frame that grows with content */
  .page-frame {
    position: relative;
    width: 816px;
    min-height: 1056px;
    background-color: #121212;
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2);
  }

  /* Content area with page margins */
  .page-content-area {
    padding: 96px 96px 72px 96px;
  }

  /* Side toolbar container */
  .side-toolbar-container {
    position: absolute;
    right: -28px;
    z-index: 50;
    transition: top 0.15s ease-out;
  }

  .comments-area {
    position: absolute;
    left: calc(50% + 408px + 24px); /* 816/2 = 408px (half page width) + 24px gap */
    top: 0;
    width: 300px;
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
