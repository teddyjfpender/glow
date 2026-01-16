<script lang="ts">
  import {
    PAGE_WIDTH,
    PAGE_HEIGHT,
    HEADER_HEIGHT,
    FOOTER_HEIGHT,
    PAGE_CONTENT_HEIGHT,
  } from '$lib/editor/utils/page-metrics';

  interface PrintPreviewProps {
    isOpen: boolean;
    content: string; // HTML content to preview
    pageCount: number;
    onClose: () => void;
    onPrint: () => void;
  }

  const { isOpen, content, pageCount, onClose, onPrint }: PrintPreviewProps = $props();

  // Local state
  let zoomedPage = $state<number | null>(null);
  let currentPage = $state(1);
  let zoomLevel = $state(0.5); // Default zoom for thumbnails

  // Zoom levels for the preview
  const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1];
  const ZOOM_LABELS = ['25%', '50%', '75%', '100%'];

  // Page array for iteration
  const pages = $derived(Array.from({ length: pageCount }, (_, i) => i + 1));

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      if (zoomedPage !== null) {
        zoomedPage = null;
      } else {
        onClose();
      }
      event.preventDefault();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      onPrint();
    } else if (event.key === 'ArrowLeft' && zoomedPage !== null) {
      if (zoomedPage > 1) {
        zoomedPage = zoomedPage - 1;
        currentPage = zoomedPage;
      }
      event.preventDefault();
    } else if (event.key === 'ArrowRight' && zoomedPage !== null) {
      if (zoomedPage < pageCount) {
        zoomedPage = zoomedPage + 1;
        currentPage = zoomedPage;
      }
      event.preventDefault();
    }
  }

  /**
   * Handle page click for zoom
   */
  function handlePageClick(pageNumber: number): void {
    zoomedPage = pageNumber;
    currentPage = pageNumber;
  }

  /**
   * Close zoomed view
   */
  function closeZoom(): void {
    zoomedPage = null;
  }

  /**
   * Handle overlay click (close if clicking outside content)
   */
  function handleOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('print-preview-overlay')) {
      if (zoomedPage !== null) {
        closeZoom();
      } else {
        onClose();
      }
    }
  }

  /**
   * Change zoom level
   */
  function setZoom(level: number): void {
    zoomLevel = level;
  }

  /**
   * Navigate to previous page in zoomed view
   */
  function prevZoomedPage(): void {
    if (zoomedPage !== null && zoomedPage > 1) {
      zoomedPage = zoomedPage - 1;
      currentPage = zoomedPage;
    }
  }

  /**
   * Navigate to next page in zoomed view
   */
  function nextZoomedPage(): void {
    if (zoomedPage !== null && zoomedPage < pageCount) {
      zoomedPage = zoomedPage + 1;
      currentPage = zoomedPage;
    }
  }

  /**
   * Calculate the Y offset for content clipping on a specific page
   */
  function getContentOffsetY(pageNumber: number): number {
    return (pageNumber - 1) * PAGE_CONTENT_HEIGHT;
  }

  // Reset state when dialog opens
  $effect(() => {
    if (isOpen) {
      zoomedPage = null;
      currentPage = 1;
      zoomLevel = 0.5;
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <div
    class="print-preview-overlay"
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-label="Print Preview"
    tabindex="-1"
    data-testid="print-preview-overlay"
  >
    <!-- Control Bar -->
    <div class="control-bar" data-testid="control-bar">
      <div class="control-bar-left">
        <button
          class="control-button close-button"
          onclick={onClose}
          aria-label="Close print preview"
          data-testid="close-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span class="preview-title">Print Preview</span>
      </div>

      <div class="control-bar-center">
        <span class="page-indicator" data-testid="page-indicator">
          Page {currentPage} of {pageCount}
        </span>
      </div>

      <div class="control-bar-right">
        <!-- Zoom Controls -->
        <div class="zoom-controls" data-testid="zoom-controls">
          {#each ZOOM_LEVELS as level, index}
            <button
              class="zoom-button"
              class:active={zoomLevel === level}
              onclick={() => setZoom(level)}
              aria-label="Zoom {ZOOM_LABELS[index]}"
              data-testid="zoom-button-{ZOOM_LABELS[index]}"
            >
              {ZOOM_LABELS[index]}
            </button>
          {/each}
        </div>

        <!-- Print Button -->
        <button
          class="control-button print-button"
          onclick={onPrint}
          aria-label="Print document"
          data-testid="print-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>Print</span>
        </button>
      </div>
    </div>

    <!-- Page Grid View -->
    {#if zoomedPage === null}
      <div class="pages-container" data-testid="pages-container">
        <div
          class="pages-grid"
          style="--page-scale: {zoomLevel}; --page-width: {PAGE_WIDTH}px; --page-height: {PAGE_HEIGHT}px;"
          data-testid="pages-grid"
        >
          {#each pages as pageNumber}
            <div class="page-wrapper" data-testid="page-wrapper-{pageNumber}">
              <button
                class="page-thumbnail"
                onclick={() => handlePageClick(pageNumber)}
                aria-label="View page {pageNumber}"
                data-testid="page-thumbnail-{pageNumber}"
              >
                <div class="page-frame" data-testid="page-frame-{pageNumber}">
                  <!-- Header Area -->
                  <div class="page-header" style="height: {HEADER_HEIGHT}px;">
                    <span class="header-placeholder">Header</span>
                  </div>

                  <!-- Content Area -->
                  <div
                    class="page-content"
                    style="height: {PAGE_CONTENT_HEIGHT}px;"
                  >
                    <div
                      class="content-clip"
                      style="transform: translateY(-{getContentOffsetY(pageNumber)}px);"
                    >
                      {@html content}
                    </div>
                  </div>

                  <!-- Footer Area -->
                  <div class="page-footer" style="height: {FOOTER_HEIGHT}px;">
                    <span class="footer-page-number">Page {pageNumber} of {pageCount}</span>
                  </div>
                </div>
              </button>
              <span class="page-number-label" data-testid="page-number-{pageNumber}">
                {pageNumber}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Zoomed Page View -->
      <div class="zoomed-container" data-testid="zoomed-container">
        <div class="zoomed-navigation">
          <button
            class="nav-button prev"
            onclick={prevZoomedPage}
            disabled={zoomedPage <= 1}
            aria-label="Previous page"
            data-testid="prev-page-button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div class="zoomed-page-wrapper">
            <div
              class="zoomed-page"
              data-testid="zoomed-page"
              style="--page-width: {PAGE_WIDTH}px; --page-height: {PAGE_HEIGHT}px;"
            >
              <div class="page-frame zoomed">
                <!-- Header Area -->
                <div class="page-header" style="height: {HEADER_HEIGHT}px;">
                  <span class="header-placeholder">Header</span>
                </div>

                <!-- Content Area -->
                <div
                  class="page-content"
                  style="height: {PAGE_CONTENT_HEIGHT}px;"
                >
                  <div
                    class="content-clip"
                    style="transform: translateY(-{getContentOffsetY(zoomedPage)}px);"
                  >
                    {@html content}
                  </div>
                </div>

                <!-- Footer Area -->
                <div class="page-footer" style="height: {FOOTER_HEIGHT}px;">
                  <span class="footer-page-number">Page {zoomedPage} of {pageCount}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            class="nav-button next"
            onclick={nextZoomedPage}
            disabled={zoomedPage >= pageCount}
            aria-label="Next page"
            data-testid="next-page-button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <button
          class="close-zoom-button"
          onclick={closeZoom}
          aria-label="Close zoomed view"
          data-testid="close-zoom-button"
        >
          Back to grid view
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Overlay */
  .print-preview-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    z-index: 1000;
  }

  /* Control Bar */
  .control-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: var(--glow-bg-elevated, #1a1a1a);
    border-bottom: 1px solid var(--glow-border-default, #333);
    flex-shrink: 0;
  }

  .control-bar-left,
  .control-bar-center,
  .control-bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .control-bar-left {
    flex: 1;
  }

  .control-bar-right {
    flex: 1;
    justify-content: flex-end;
  }

  .preview-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary, #fff);
  }

  .page-indicator {
    font-size: 14px;
    color: var(--glow-text-secondary, #aaa);
  }

  /* Control Buttons */
  .control-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    background-color: transparent;
    border: 1px solid var(--glow-border-default, #333);
    color: var(--glow-text-primary, #fff);
  }

  .control-button:hover {
    background-color: var(--glow-bg-surface, #222);
  }

  .close-button {
    padding: 8px;
  }

  .print-button {
    background-color: var(--glow-accent-primary, #60a5fa);
    border-color: var(--glow-accent-primary, #60a5fa);
  }

  .print-button:hover {
    background-color: var(--glow-accent-hover, #3b82f6);
    border-color: var(--glow-accent-hover, #3b82f6);
  }

  /* Zoom Controls */
  .zoom-controls {
    display: flex;
    gap: 4px;
    padding: 4px;
    background-color: var(--glow-bg-surface, #121212);
    border-radius: 6px;
    border: 1px solid var(--glow-border-default, #333);
  }

  .zoom-button {
    padding: 4px 10px;
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    background-color: transparent;
    border: none;
    color: var(--glow-text-secondary, #aaa);
  }

  .zoom-button:hover {
    background-color: var(--glow-bg-elevated, #1a1a1a);
    color: var(--glow-text-primary, #fff);
  }

  .zoom-button.active {
    background-color: var(--glow-accent-primary, #60a5fa);
    color: #fff;
  }

  /* Pages Container */
  .pages-container {
    flex: 1;
    overflow-y: auto;
    padding: 32px;
    display: flex;
    justify-content: center;
  }

  .pages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, calc(var(--page-width) * var(--page-scale) + 32px));
    gap: 32px;
    justify-content: center;
    align-content: start;
    max-width: 100%;
  }

  /* Page Wrapper */
  .page-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  /* Page Thumbnail */
  .page-thumbnail {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .page-thumbnail:hover {
    transform: scale(1.02);
  }

  .page-thumbnail:focus {
    outline: 2px solid var(--glow-accent-primary, #60a5fa);
    outline-offset: 4px;
  }

  /* Page Frame */
  .page-frame {
    width: calc(var(--page-width, 816px) * var(--page-scale, 0.5));
    height: calc(var(--page-height, 1056px) * var(--page-scale, 0.5));
    background-color: #fff;
    border-radius: 2px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 8px 24px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transform-origin: top left;
    transform: scale(var(--page-scale, 0.5));
    width: 816px;
    height: 1056px;
    margin-bottom: calc((var(--page-height, 1056px) * var(--page-scale, 0.5)) - var(--page-height, 1056px));
    margin-right: calc((var(--page-width, 816px) * var(--page-scale, 0.5)) - var(--page-width, 816px));
  }

  .page-frame.zoomed {
    transform: scale(0.75);
    margin-bottom: calc(1056px * 0.75 - 1056px);
    margin-right: calc(816px * 0.75 - 816px);
  }

  /* Page Header */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8f8f8;
    border-bottom: 1px solid #e0e0e0;
    padding: 0 96px;
    flex-shrink: 0;
  }

  .header-placeholder {
    font-size: 11px;
    color: #999;
  }

  /* Page Content */
  .page-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    background-color: #fff;
    padding: 0 96px;
  }

  .content-clip {
    position: absolute;
    top: 0;
    left: 96px;
    right: 96px;
    color: #000;
    font-size: 12pt;
    line-height: 1.5;
  }

  /* Page Footer */
  .page-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8f8f8;
    border-top: 1px solid #e0e0e0;
    padding: 0 96px;
    flex-shrink: 0;
  }

  .footer-page-number {
    font-size: 11px;
    color: #666;
  }

  /* Page Number Label */
  .page-number-label {
    font-size: 12px;
    color: var(--glow-text-secondary, #aaa);
  }

  /* Zoomed View */
  .zoomed-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    gap: 24px;
    overflow: auto;
  }

  .zoomed-navigation {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .zoomed-page-wrapper {
    overflow: auto;
    max-height: calc(100vh - 200px);
  }

  .zoomed-page {
    background-color: transparent;
  }

  .nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--glow-bg-elevated, #1a1a1a);
    border: 1px solid var(--glow-border-default, #333);
    color: var(--glow-text-primary, #fff);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .nav-button:hover:not(:disabled) {
    background-color: var(--glow-bg-surface, #222);
  }

  .nav-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .close-zoom-button {
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 6px;
    background-color: transparent;
    border: 1px solid var(--glow-border-default, #333);
    color: var(--glow-text-secondary, #aaa);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .close-zoom-button:hover {
    background-color: var(--glow-bg-surface, #222);
    color: var(--glow-text-primary, #fff);
  }

  /* Print Styles */
  @media print {
    .print-preview-overlay {
      display: none;
    }
  }
</style>

<!-- Print-specific styles that apply to the document when printing -->
<svelte:head>
  {#if isOpen}
    <style>
      @media print {
        /* Hide everything except the document content */
        body > *:not(.print-content) {
          display: none !important;
        }

        /* Page setup */
        @page {
          size: letter;
          margin: 1in 1in 0.75in 1in;
        }

        /* Page breaks */
        .page-break {
          page-break-after: always;
          break-after: page;
        }

        /* Ensure headers and footers print */
        .page-header,
        .page-footer {
          position: fixed;
        }

        .page-header {
          top: 0;
        }

        .page-footer {
          bottom: 0;
        }

        /* Prevent orphans and widows */
        p {
          orphans: 2;
          widows: 2;
        }

        /* Keep headings with content */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          break-after: avoid;
        }

        /* Avoid breaking inside elements */
        img, table, figure {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
    </style>
  {/if}
</svelte:head>
