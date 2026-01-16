<script lang="ts">
  import {
    PAGE_CONTENT_HEIGHT,
    PAGE_WIDTH,
    PAGE_MARGIN_HORIZONTAL,
  } from '$lib/editor/utils/page-metrics';

  interface Props {
    /** 0-indexed page number */
    pageIndex: number;
    /** The TipTap editor DOM element */
    editorElement: HTMLElement | null;
    /** Y offset where this page's content starts in the full document */
    contentStartY: number;
    /** Total height of all content in the document */
    totalContentHeight: number;
  }

  const { pageIndex, editorElement, contentStartY, totalContentHeight }: Props = $props();

  /**
   * Calculate the viewport width based on page dimensions and horizontal margins.
   * Viewport width = PAGE_WIDTH - (2 * PAGE_MARGIN_HORIZONTAL)
   * = 816px - 192px = 624px
   */
  const VIEWPORT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_HORIZONTAL * 2;

  /**
   * The viewport height is the usable content height per page.
   */
  const VIEWPORT_HEIGHT = PAGE_CONTENT_HEIGHT;

  /**
   * Calculate the CSS transform to position the content so only this page's
   * portion is visible within the clipped viewport.
   *
   * For page 0: translateY(0)
   * For page 1: translateY(-828px) (negative PAGE_CONTENT_HEIGHT)
   * For page N: translateY(-N * PAGE_CONTENT_HEIGHT)
   */
  const transformY = $derived(-contentStartY);
</script>

<div
  class="page-viewport"
  style:width="{VIEWPORT_WIDTH}px"
  style:height="{VIEWPORT_HEIGHT}px"
  data-page-index={pageIndex}
  data-testid="page-viewport"
>
  <div
    class="content-clip"
    style="
      transform: translateY({transformY}px);
      height: {totalContentHeight}px;
    "
    data-testid="content-clip"
  >
    {#if editorElement}
      <!--
        The editor element is rendered elsewhere and shared across all page viewports.
        This slot allows parent components to provide the editor reference or content.
        In practice, the parent component manages the editor positioning.
      -->
      <slot />
    {:else}
      <!-- Placeholder when no editor element is provided -->
      <div class="placeholder" data-testid="viewport-placeholder"></div>
    {/if}
  </div>
</div>

<style>
  .page-viewport {
    overflow: hidden;
    position: relative;
    background-color: transparent;
  }

  .content-clip {
    position: absolute;
    width: 100%;
    left: 0;
    top: 0;
  }

  .placeholder {
    width: 100%;
    height: 100%;
  }
</style>
