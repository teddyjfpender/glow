<script lang="ts">
  import { bionicState, transformToBionic } from '$lib/state/bionic.svelte';

  interface Props {
    html: string;
    pageCount: number;
  }

  const { html, pageCount }: Props = $props();

  // Page dimensions (matching DocumentPage.svelte)
  const PAGE_HEIGHT = 1056;
  const PAGE_GAP = 40;

  // Calculate total height to match pages container
  const totalHeight = $derived(pageCount * PAGE_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP);

  // Transform the HTML to bionic format
  const bionicHtml = $derived(transformToBionic(html, bionicState.intensity));
</script>

<!-- In-document bionic reading overlay -->
<div class="bionic-overlay" style="min-height: {totalHeight}px">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rendering bionic transformed content -->
  <div class="bionic-content">{@html bionicHtml}</div>
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
