<script lang="ts">
  import { onMount } from 'svelte';
  import { bionicState, transformToBionic } from '$lib/state/bionic.svelte';
  import {
    PAGE_HEIGHT,
    PAGE_GAP,
    CONTENT_AREA_HEIGHT,
    SPACER_HEIGHT,
  } from '$lib/editor/utils/page-metrics';

  interface Props {
    html: string;
    pageCount: number;
  }

  const { html, pageCount }: Props = $props();

  // Same constants as page-break-spacer plugin
  const LINE_HEIGHT_BUFFER = 24;
  const EFFECTIVE_CONTENT_AREA = CONTENT_AREA_HEIGHT - LINE_HEIGHT_BUFFER; // 900px
  const VISUAL_SPACER_HEIGHT = SPACER_HEIGHT + LINE_HEIGHT_BUFFER; // 188px

  // Calculate total height to match pages container
  const totalHeight = $derived(pageCount * PAGE_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP);

  // Transform the HTML to bionic format
  const bionicHtml = $derived(transformToBionic(html, bionicState.intensity));

  // Reference to the content container
  let contentRef = $state<HTMLDivElement | null>(null);

  /**
   * Get content-only Y position for an element (subtracting spacer heights)
   */
  function getContentOnlyTop(element: HTMLElement, containerTop: number, spacerCount: number): number {
    const rect = element.getBoundingClientRect();
    const actualTop = rect.top - containerTop;
    return actualTop - spacerCount * VISUAL_SPACER_HEIGHT;
  }

  /**
   * Insert spacer divs at page break positions
   * Uses the same algorithm as page-break-spacer plugin:
   * 1. Measure content in "content-only" coordinates (subtracting spacer heights)
   * 2. Find elements whose top crosses page boundaries
   * 3. Insert spacers before those elements
   */
  function insertPageBreakSpacers(): void {
    if (!contentRef) return;

    // Remove existing spacers first
    const existingSpacers = contentRef.querySelectorAll('.bionic-page-spacer');
    existingSpacers.forEach((spacer) => spacer.remove());

    // Get all block-level children (excluding spacers)
    const children = Array.from(contentRef.children).filter(
      (el) => !el.classList.contains('bionic-page-spacer')
    ) as HTMLElement[];

    if (children.length === 0) return;

    const containerRect = contentRef.getBoundingClientRect();
    const containerTop = containerRect.top;

    // Calculate total content height to determine number of breaks needed
    const lastChild = children[children.length - 1];
    const lastChildRect = lastChild.getBoundingClientRect();
    const totalContentHeight = lastChildRect.bottom - containerTop;

    // Number of page breaks needed
    const numBreaks = Math.floor((totalContentHeight - 1) / EFFECTIVE_CONTENT_AREA);
    if (numBreaks <= 0) return;

    // For each page break, find the element to insert spacer before
    let spacersInserted = 0;

    for (let breakNum = 1; breakNum <= numBreaks; breakNum++) {
      const targetY = breakNum * EFFECTIVE_CONTENT_AREA;

      // Find the first element whose content-only top >= targetY
      let insertBeforeElement: HTMLElement | null = null;

      for (const child of children) {
        // Skip elements we've already passed
        const contentOnlyTop = getContentOnlyTop(child, containerTop, spacersInserted);

        if (contentOnlyTop >= targetY) {
          insertBeforeElement = child;
          break;
        }
      }

      if (insertBeforeElement) {
        // Create and insert spacer
        const spacer = document.createElement('div');
        spacer.className = 'bionic-page-spacer';
        spacer.style.height = `${VISUAL_SPACER_HEIGHT}px`;
        spacer.style.width = '100%';
        spacer.setAttribute('aria-hidden', 'true');
        spacer.dataset.breakNum = String(breakNum);

        insertBeforeElement.parentNode?.insertBefore(spacer, insertBeforeElement);
        spacersInserted++;
      }
    }
  }

  // Insert spacers on mount and when content changes
  onMount(() => {
    // Small delay to ensure content is rendered
    requestAnimationFrame(() => {
      insertPageBreakSpacers();
    });
  });

  // Re-insert spacers when bionic HTML changes
  $effect(() => {
    // Track bionicHtml to trigger on changes
    void bionicHtml;

    if (contentRef) {
      // Use requestAnimationFrame to wait for DOM update
      requestAnimationFrame(() => {
        insertPageBreakSpacers();
      });
    }
  });
</script>

<!-- In-document bionic reading overlay -->
<div class="bionic-overlay" style="min-height: {totalHeight}px">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rendering bionic transformed content -->
  <div class="bionic-content" bind:this={contentRef}>{@html bionicHtml}</div>
</div>

<style>
  .bionic-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 816px;
    /* Sits above editor (z-index: 2) but below headers/footers (z-index: 4) */
    z-index: 3;
    background-color: #121212;
    /* Match editor padding: 72px top (header), 96px sides, 60px bottom (footer) */
    padding: 72px 96px 60px 96px;
    pointer-events: none; /* Allow clicks to pass through to editor if needed */
  }

  .bionic-content {
    font-family: var(--glow-font-sans);
    font-size: 11pt;
    line-height: 1.5;
    color: var(--glow-text-primary);
  }

  /* Page break spacer - matches editor's spacer styling */
  .bionic-content :global(.bionic-page-spacer) {
    display: block;
    pointer-events: none;
    user-select: none;
  }

  /* Bionic bold styling */
  .bionic-content :global(.bionic-bold) {
    font-weight: 700;
    color: var(--glow-text-primary);
  }

  /* Standard content styling - matching editor styles */
  .bionic-content :global(p) {
    margin: 0 0 12px 0;
  }

  .bionic-content :global(h1) {
    font-size: 26pt;
    font-weight: 400;
    margin: 24px 0 12px 0;
    line-height: 1.2;
  }

  .bionic-content :global(h1 .bionic-bold) {
    font-weight: 600;
  }

  .bionic-content :global(h2) {
    font-size: 18pt;
    font-weight: 400;
    margin: 20px 0 10px 0;
    line-height: 1.3;
  }

  .bionic-content :global(h2 .bionic-bold) {
    font-weight: 600;
  }

  .bionic-content :global(h3) {
    font-size: 14pt;
    font-weight: 600;
    margin: 16px 0 8px 0;
    line-height: 1.4;
  }

  .bionic-content :global(h3 .bionic-bold) {
    font-weight: 700;
  }

  .bionic-content :global(ul),
  .bionic-content :global(ol) {
    margin: 0 0 12px 0;
    padding-left: 24px;
  }

  .bionic-content :global(ul) {
    list-style-type: disc;
  }

  .bionic-content :global(ol) {
    list-style-type: decimal;
  }

  .bionic-content :global(li) {
    margin-bottom: 4px;
  }

  .bionic-content :global(blockquote) {
    border-left: 4px solid var(--glow-border-default);
    margin: 12px 0;
    padding-left: 16px;
    color: var(--glow-text-secondary);
  }

  .bionic-content :global(code) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .bionic-content :global(pre) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-surface);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .bionic-content :global(pre code) {
    background: none;
    padding: 0;
  }

  .bionic-content :global(a) {
    color: var(--glow-accent-primary);
    text-decoration: underline;
  }

  .bionic-content :global(hr) {
    border: none;
    border-top: 1px solid var(--glow-border-subtle);
    margin: 24px 0;
  }
</style>
