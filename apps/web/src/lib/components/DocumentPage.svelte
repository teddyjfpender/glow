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
  import { PageBreakSpacerExtension } from '$lib/editor/extensions/page-break-spacer';
  import { InternalLinkMark } from '$lib/editor/extensions/internal-link';
  import { createLinkAutocompletePlugin, type LinkAutocompleteState } from '$lib/editor/plugins/link-autocomplete';
  import Toolbar from './Toolbar.svelte';
  import LinkPalette from './LinkPalette.svelte';
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
  import { headerFooterState } from '$lib/state/header-footer.svelte';
  import { paginationState } from '$lib/state/pagination.svelte';
  import { tabsState } from '$lib/state/tabs.svelte';
  import {
    PAGE_HEIGHT,
    PAGE_GAP,
    HEADER_HEIGHT,
    FOOTER_HEIGHT,
    calculatePageCount,
  } from '$lib/editor/utils/page-metrics';
  import TabsPanel from './TabsPanel.svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { documentsState } from '$lib/state/documents.svelte';

  interface Props {
    onEditorReady?: (editor: Editor) => void;
  }

  const { onEditorReady }: Props = $props();

  let editorElement: HTMLDivElement;
  let editorWrapperRef = $state<HTMLDivElement | null>(null);
  let documentAreaRef = $state<HTMLDivElement | null>(null);
  let pagesContentRef = $state<HTMLDivElement | null>(null);
  let editor: Editor | null = $state(null);
  let lastSyncedContent = '';

  // Page count based on content height
  let pageCount = $state(1);

  // Calculate total container height for all pages
  const totalPagesHeight = $derived(pageCount * PAGE_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP);

  // Editor content HTML for bionic reading overlay
  let editorContent = $state('');

  // Cursor position for side toolbar
  let cursorTop = $state(100);

  // Comment system state
  const currentAuthor = createDefaultAuthor();

  // Track selection state for side toolbar
  let hasSelection = $state(false);

  // Tabs panel collapsed state (persisted to localStorage)
  let tabsPanelCollapsed = $state(
    browser ? localStorage.getItem('glow-tabs-panel-collapsed') === 'true' : false,
  );

  function toggleTabsPanel(): void {
    tabsPanelCollapsed = !tabsPanelCollapsed;
    if (browser) {
      localStorage.setItem('glow-tabs-panel-collapsed', String(tabsPanelCollapsed));
    }
  }

  // Track the previous active tab ID to detect tab switches
  let previousActiveTabId = $state<string | null>(null);

  // Link palette state for autocomplete popup
  let linkPaletteState = $state<{
    active: boolean;
    query: string;
    from: number;
    to: number;
    position: { x: number; y: number };
  } | null>(null);

  // Store palette control methods (set by LinkPalette via onReady callback)
  let linkPaletteControls: { selectCurrent: () => void; moveUp: () => void; moveDown: () => void } | null = null;

  // Actual content area height per page (page height minus header and footer)
  const CONTENT_AREA_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT; // 924px

  // Update cached editor content and calculate page count
  function updateEditorContent(): void {
    if (!editor) return;
    editorContent = editor.getHTML();

    // Calculate page count based on editor content height
    if (editorWrapperRef) {
      const height = editorWrapperRef.scrollHeight;
      // Use actual content area height for accurate page calculation
      const newPageCount = calculatePageCount(height, CONTENT_AREA_HEIGHT);
      pageCount = newPageCount;
      // Sync with pagination state
      paginationState.setPageCount(newPageCount);
    }
  }

  // Handle scroll to track current page
  function handleScroll(): void {
    if (!documentAreaRef) return;
    const scrollY = documentAreaRef.scrollTop;
    // Calculate which page is currently visible based on scroll position
    // Each page unit = PAGE_HEIGHT + PAGE_GAP
    const pageUnit = PAGE_HEIGHT + PAGE_GAP;
    const currentPage = Math.floor(scrollY / pageUnit) + 1;
    paginationState.setCurrentPage(Math.min(currentPage, pageCount));
    paginationState.setScrollPosition(scrollY);
    // Also update comment positions on scroll
    updateCommentPositions();
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

  // Load comments when documentId changes
  $effect(() => {
    const docId = documentState.id;
    if (docId) {
      void commentsState.loadComments(docId);
    }
  });

  // Unified content synchronization effect
  // Handles both tab switching and initial document load
  $effect(() => {
    const currentActiveTabId = tabsState.activeTabId;
    const activeTab = tabsState.activeTab;

    // Skip if no active tab or editor not ready
    if (!currentActiveTabId || !activeTab || !editor) {
      return;
    }

    // Case 1: Tab switch - save old content, load new content
    if (previousActiveTabId !== null && previousActiveTabId !== currentActiveTabId) {
      // Save current editor content to the PREVIOUS tab before switching
      const currentEditorContent = editor.getHTML();
      tabsState.updateTabContent(previousActiveTabId, currentEditorContent);

      // Load new tab content into editor
      editor.commands.setContent(activeTab.content);
      lastSyncedContent = activeTab.content;
      previousActiveTabId = currentActiveTabId;
      return;
    }

    // Case 2: Initial load or editor just became ready
    if (previousActiveTabId === null) {
      const editorContent = editor.getHTML();
      if (editorContent !== activeTab.content) {
        editor.commands.setContent(activeTab.content);
        lastSyncedContent = activeTab.content;
      }
      previousActiveTabId = currentActiveTabId;
      return;
    }

    // Case 3: Content changed from external source (document reload)
    // Only sync if tab didn't change and content is different from what editor has
    const expectedContent = activeTab.content;
    if (expectedContent !== lastSyncedContent) {
      const currentEditorContent = editor.getHTML();
      if (currentEditorContent !== expectedContent) {
        editor.commands.setContent(expectedContent);
      }
      lastSyncedContent = expectedContent;
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

  // Internal link handlers
  function handleEditorClick(event: Event): void {
    const target = event.target as HTMLElement;
    const linkElement = target.closest('span[data-internal-link]') as HTMLElement | null;

    if (linkElement) {
      event.preventDefault();
      event.stopPropagation();

      const documentId = linkElement.getAttribute('data-document-id') || null;
      const title = linkElement.getAttribute('data-title') || '';

      handleInternalLinkClick(documentId, title);
    }
  }

  function handleInternalLinkClick(documentId: string | null, title: string): void {
    if (documentId) {
      // Navigate to the linked document
      window.location.href = `/doc/${documentId}`;
    } else {
      // Create new document with this title
      handleLinkCreateNew(title);
    }
  }

  function handleInternalLinkHover(
    _documentId: string | null,
    _title: string,
    _rect: DOMRect
  ): void {
    // TODO: Show link preview popup
    // For now, this is a placeholder for future link preview functionality
  }

  function handleLinkPaletteSelect(documentId: string, title: string): void {
    if (!editor || !linkPaletteState) return;

    const { from, to } = linkPaletteState;

    // Delete the [[query text and insert the link
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({
        type: 'text',
        text: title,
        marks: [
          {
            type: 'internalLink',
            attrs: {
              documentId,
              title,
              displayText: null,
              anchor: null,
              resolved: true,
            },
          },
        ],
      })
      .run();

    linkPaletteState = null;
  }

  function handleLinkCreateNew(title: string): void {
    if (!editor || !linkPaletteState) return;

    const { from, to } = linkPaletteState;

    // Create the new document
    void documentsState.create(title).then((newDoc) => {
      if (!newDoc || !editor) return;

      // Delete the [[query text and insert the link to the new document
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: 'text',
          text: title,
          marks: [
            {
              type: 'internalLink',
              attrs: {
                documentId: newDoc.id,
                title,
                displayText: null,
                anchor: null,
                resolved: true,
              },
            },
          ],
        })
        .run();
    });

    linkPaletteState = null;
  }

  function handleLinkPaletteClose(): void {
    linkPaletteState = null;
    linkPaletteControls = null;
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
    // Load documents list for internal link autocomplete
    void documentsState.load();

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
        PageBreakSpacerExtension,
        InternalLinkMark.configure({
          onLinkClick: handleInternalLinkClick,
          onLinkHover: handleInternalLinkHover,
        }),
      ],
      content: documentState.content,
      editorProps: {
        attributes: {
          class: 'document-content',
        },
        handleKeyDown: (_view, event) => {
          // Handle keyboard events when link autocomplete is active
          if (!linkPaletteState?.active) {
            return false;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            linkPaletteControls?.selectCurrent();
            return true;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            linkPaletteControls?.moveUp();
            return true;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            linkPaletteControls?.moveDown();
            return true;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            handleLinkPaletteClose();
            return true;
          }

          return false;
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

    // Register link autocomplete plugin
    const linkAutocompletePlugin = createLinkAutocompletePlugin(
      (state: LinkAutocompleteState, coords: { x: number; y: number }) => {
        linkPaletteState = {
          active: state.active,
          query: state.query,
          from: state.from,
          to: state.to,
          position: coords,
        };
      },
      () => {
        linkPaletteState = null;
        linkPaletteControls = null;
      }
    );
    editor.registerPlugin(linkAutocompletePlugin);

    // Listen for comment creation events from toolbar
    editorElement.addEventListener('glow:create-comment', handleCreateCommentEvent);

    // Listen for internal link clicks
    editorElement.addEventListener('click', handleEditorClick);

    // Listen for scroll-to-heading events from outline
    document.addEventListener('glow:scroll-to-heading', handleScrollToHeading);
  });

  onDestroy(() => {
    editorElement?.removeEventListener('glow:create-comment', handleCreateCommentEvent);
    editorElement?.removeEventListener('click', handleEditorClick);
    document.removeEventListener('glow:scroll-to-heading', handleScrollToHeading);
    editor?.destroy();
  });

  // Handle scroll to heading from outline click
  function handleScrollToHeading(event: Event): void {
    const customEvent = event as CustomEvent<{ text: string; level: number }>;
    const { text, level } = customEvent.detail;

    if (!editor || !documentAreaRef) return;

    // Find the heading node in the document
    const { doc } = editor.state;
    let targetPos: number | null = null;

    doc.descendants((node, pos) => {
      if (targetPos !== null) return false; // Already found

      // Check if this is a heading with matching level and text
      if (node.type.name === 'heading' && node.attrs.level === level) {
        const nodeText = node.textContent.trim();
        if (nodeText === text.trim()) {
          targetPos = pos;
          return false; // Stop searching
        }
      }
      return true; // Continue searching
    });

    if (targetPos !== null) {
      // Get coordinates of the heading position
      try {
        const coords = editor.view.coordsAtPos(targetPos);
        const containerRect = documentAreaRef.getBoundingClientRect();

        // Calculate scroll position to show heading near the top with some padding
        const scrollTop = coords.top - containerRect.top + documentAreaRef.scrollTop - 100;

        documentAreaRef.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });

        // Optionally, move cursor to the heading
        editor.commands.setTextSelection(targetPos);
        editor.commands.focus();
      } catch {
        // Position might be invalid
      }
    }
  }
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
      onscroll={handleScroll}
      onclick={handleDocumentAreaClick}
    >
      <div class="page-wrapper">
        <!-- Tabs Panel (floating, left of document) -->
        <div class="tabs-area">
          <TabsPanel isCollapsed={tabsPanelCollapsed} onToggleCollapse={toggleTabsPanel} />
        </div>
        <div
          class="pages-container"
          bind:this={pagesContentRef}
          style="min-height: {totalPagesHeight}px"
        >
          <!-- Layer 1: Page backgrounds -->
          {#each Array(pageCount) as _, pageIndex}
            {@const pageTop = pageIndex * (PAGE_HEIGHT + PAGE_GAP)}
            <div
              class="page-background"
              style="top: {pageTop}px"
            ></div>
          {/each}

          <!-- Layer 2: Single continuous editor with padding for headers/footers -->
          <div
            class="editor-continuous-wrapper"
            bind:this={editorWrapperRef}
          >
            <div class="editor" bind:this={editorElement}></div>
          </div>

          <!-- Layer 2.5: Bionic Reading overlay (positioned over editor content) -->
          {#if bionicState.isActive}
            <BionicOverlay html={editorContent || editor?.getHTML() || ''} {pageCount} />
          {/if}

          <!-- Layer 3: Page gaps (visual separator between pages) -->
          {#each Array(Math.max(0, pageCount - 1)) as _, gapIndex}
            {@const gapTop = (gapIndex + 1) * PAGE_HEIGHT + gapIndex * PAGE_GAP}
            <div
              class="page-gap-mask"
              style="top: {gapTop}px; height: {PAGE_GAP}px"
            ></div>
          {/each}

          <!-- Layer 4: Page headers -->
          {#each Array(pageCount) as _, pageIndex}
            {@const pageNumber = pageIndex + 1}
            {@const pageConfig = headerFooterState.getConfigForPage(pageNumber, pageCount)}
            {@const pageTop = pageIndex * (PAGE_HEIGHT + PAGE_GAP)}

            <div
              class="page-header-decoration"
              style="top: {pageTop}px"
            >
              <span class="header-left">{pageConfig.header?.left || ''}</span>
              <span class="header-center">{pageConfig.header?.center || ''}</span>
              <span class="header-right">{pageConfig.header?.right || ''}</span>
            </div>
          {/each}

          <!-- Layer 5: Page footers -->
          {#each Array(pageCount) as _, pageIndex}
            {@const pageNumber = pageIndex + 1}
            {@const pageConfig = headerFooterState.getConfigForPage(pageNumber, pageCount)}
            {@const pageTop = pageIndex * (PAGE_HEIGHT + PAGE_GAP)}

            <div
              class="page-footer-decoration"
              style="top: {pageTop + PAGE_HEIGHT - FOOTER_HEIGHT}px"
            >
              <span class="footer-left">{pageConfig.footer?.left || ''}</span>
              <span class="footer-center">{pageConfig.footer?.center || `Page ${pageNumber} of ${pageCount}`}</span>
              <span class="footer-right">{pageConfig.footer?.right || ''}</span>
            </div>
          {/each}

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

      <!-- Page Navigation Footer -->
      {#if pageCount > 1}
        <div class="page-nav-footer">
          <div class="page-nav-content">
            <span class="page-indicator">Page {paginationState.currentPage} of {pageCount}</span>
            <span class="page-hint">Scroll to navigate pages</span>
          </div>
        </div>
      {/if}
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

<!-- Link Autocomplete Palette -->
{#if linkPaletteState?.active}
  <LinkPalette
    position={linkPaletteState.position}
    query={linkPaletteState.query}
    onSelect={handleLinkPaletteSelect}
    onCreateNew={handleLinkCreateNew}
    onClose={handleLinkPaletteClose}
    onReady={(controls) => { linkPaletteControls = controls; }}
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
    position: relative;
    /* Center the pages, comments area positioned absolutely */
    justify-content: center;
  }

  .pages-container {
    position: relative;
    width: 816px;
  }

  /* Layer 1: Page backgrounds */
  .page-background {
    position: absolute;
    left: 0;
    width: 816px;
    height: 1056px;
    background-color: #121212;
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2);
    z-index: 1;
  }

  /* Layer 2: Continuous editor */
  .editor-continuous-wrapper {
    position: relative;
    z-index: 2;
    width: 816px;
    padding: 72px 96px 60px 96px; /* header, right, footer, left */
    min-height: 1056px;
  }

  /* Layer 3: Page gap masks (hide content between pages) */
  .page-gap-mask {
    position: absolute;
    left: 0;
    width: 816px;
    background-color: #525659;
    z-index: 3;
  }

  /* Layer 4: Header decorations */
  .page-header-decoration {
    position: absolute;
    left: 0;
    width: 816px;
    height: 72px;
    padding: 0 96px;
    display: flex;
    align-items: flex-end;
    padding-bottom: 12px;
    background-color: #121212;
    border-bottom: 1px solid var(--glow-border-subtle);
    font-size: 10px;
    color: var(--glow-text-tertiary);
    z-index: 4;
    pointer-events: none;
  }

  /* Layer 4: Footer decorations */
  .page-footer-decoration {
    position: absolute;
    left: 0;
    width: 816px;
    height: 60px;
    padding: 0 96px;
    display: flex;
    align-items: center;
    padding-top: 12px;
    background-color: #121212;
    border-top: 1px solid var(--glow-border-subtle);
    font-size: 10px;
    color: var(--glow-text-tertiary);
    z-index: 4;
    pointer-events: none;
  }

  .header-left, .footer-left { text-align: left; flex: 1; }
  .header-center, .footer-center { text-align: center; flex: 1; }
  .header-right, .footer-right { text-align: right; flex: 1; }

  /* Page Navigation Footer */
  .page-nav-footer {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
  }

  .page-nav-content {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 20px;
    background-color: #1a1a1a;
    border: 1px solid var(--glow-border-default);
    border-radius: 20px;
    box-shadow:
      0 4px 12px rgb(0 0 0 / 0.3),
      0 2px 4px rgb(0 0 0 / 0.2);
  }

  .page-indicator {
    font-size: 13px;
    font-weight: 500;
    color: var(--glow-text-primary);
    font-variant-numeric: tabular-nums;
  }

  .page-hint {
    font-size: 11px;
    color: var(--glow-text-tertiary);
  }

  /* Side toolbar container */
  .side-toolbar-container {
    position: absolute;
    right: -28px;
    z-index: 50;
    transition: top 0.15s ease-out;
  }

  .tabs-area {
    position: absolute;
    right: calc(50% + 408px + 24px); /* 816/2 = 408px (half page width) + 24px gap */
    top: 20px;
    /* Allow dropdowns to overflow */
    overflow: visible;
    z-index: 10;
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
