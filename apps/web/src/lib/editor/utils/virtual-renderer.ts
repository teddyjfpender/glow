/**
 * Virtual Renderer Utility Module
 *
 * Provides efficient rendering of large multi-page documents by only rendering
 * pages that are visible or near the viewport. This enables smooth 60 FPS
 * scrolling for documents with 100+ pages.
 *
 * Key Features:
 * - Only renders visible pages plus a configurable buffer
 * - Debounced render calculations for fast scrolling
 * - Integration with existing pagination state
 * - Placeholder heights for non-rendered pages
 */

import { PAGE_HEIGHT, PAGE_GAP } from './page-metrics';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Represents the current state of the virtual renderer.
 */
export interface VirtualRenderState {
  /** Page indices (0-based) currently visible in the viewport */
  visiblePages: number[];
  /** Pages near the viewport that are pre-rendered (includes visiblePages) */
  bufferedPages: number[];
  /** Total number of pages in the document */
  totalPages: number;
  /** Current scroll position from top */
  scrollTop: number;
  /** Height of the viewport */
  viewportHeight: number;
}

/**
 * Configuration options for the virtual renderer.
 */
export interface VirtualRendererConfig {
  /** Number of pages to render above and below the viewport (default: 2) */
  bufferSize?: number;
  /** Height of each page including any gap (uses PAGE_HEIGHT + PAGE_GAP by default) */
  pageHeight?: number;
  /** Total number of pages in the document */
  totalPages: number;
  /** Gap between pages (uses PAGE_GAP by default) */
  pageGap?: number;
}

/**
 * Represents a range of pages (inclusive).
 */
export interface PageRange {
  /** First page index (0-based) */
  start: number;
  /** Last page index (0-based, inclusive) */
  end: number;
}

/**
 * API returned by createVirtualRenderer.
 */
export interface VirtualRendererAPI {
  /** Get the range of pages that should be rendered for given scroll position */
  getVisibleRange(scrollTop: number, viewportHeight: number): PageRange;
  /** Check if a specific page should be rendered */
  shouldRenderPage(pageIndex: number, scrollTop: number, viewportHeight: number): boolean;
  /** Get the Y position where a page starts (top of page) */
  getPageTop(pageIndex: number): number;
  /** Get the scroll position to bring a page into view */
  getScrollTopForPage(pageIndex: number): number;
  /** Get the current complete state */
  getState(scrollTop: number, viewportHeight: number): VirtualRenderState;
  /** Update the total page count */
  setTotalPages(count: number): void;
  /** Get the total document height (all pages + gaps) */
  getTotalHeight(): number;
  /** Get placeholder height for non-rendered pages */
  getPlaceholderHeight(): number;
  /** Get the page index at a given Y position */
  getPageAtY(yPosition: number): number;
  /** Get all pages that intersect with the viewport */
  getIntersectingPages(scrollTop: number, viewportHeight: number): number[];
  /** Get buffered pages (visible + buffer) */
  getBufferedPages(scrollTop: number, viewportHeight: number): number[];
}

// ============================================================================
// Constants
// ============================================================================

/** Default number of pages to buffer above and below viewport */
export const DEFAULT_BUFFER_SIZE = 2;

/** Default page height including content */
const DEFAULT_PAGE_HEIGHT = PAGE_HEIGHT;

/** Default gap between pages */
const DEFAULT_PAGE_GAP = PAGE_GAP;

// ============================================================================
// Virtual Renderer Factory
// ============================================================================

/**
 * Creates a virtual renderer instance for efficient large document rendering.
 *
 * The virtual renderer calculates which pages should be rendered based on
 * the current scroll position and viewport size. It maintains a buffer of
 * pages above and below the visible area to ensure smooth scrolling.
 *
 * @param config - Configuration options for the renderer
 * @returns VirtualRendererAPI object with methods to query render state
 *
 * @example
 * ```ts
 * const renderer = createVirtualRenderer({
 *   totalPages: 50,
 *   bufferSize: 2,
 * });
 *
 * // Get pages to render based on scroll position
 * const range = renderer.getVisibleRange(scrollTop, viewportHeight);
 * // { start: 3, end: 7 }
 *
 * // Check if a specific page should be rendered
 * const shouldRender = renderer.shouldRenderPage(5, scrollTop, viewportHeight);
 * // true
 * ```
 */
export function createVirtualRenderer(config: VirtualRendererConfig): VirtualRendererAPI {
  // Initialize configuration with defaults
  let totalPages = Math.max(1, config.totalPages);
  const bufferSize = config.bufferSize ?? DEFAULT_BUFFER_SIZE;
  const pageHeight = config.pageHeight ?? DEFAULT_PAGE_HEIGHT;
  const pageGap = config.pageGap ?? DEFAULT_PAGE_GAP;

  // Calculate the total unit height (page + gap)
  const pageUnit = pageHeight + pageGap;

  /**
   * Get the Y position where a page starts (top of the page frame).
   */
  function getPageTop(pageIndex: number): number {
    if (pageIndex < 0) {
      return 0;
    }
    if (pageIndex >= totalPages) {
      return (totalPages - 1) * pageUnit;
    }
    return pageIndex * pageUnit;
  }

  /**
   * Get the page index at a given Y position.
   */
  function getPageAtY(yPosition: number): number {
    if (yPosition < 0) {
      return 0;
    }

    const pageIndex = Math.floor(yPosition / pageUnit);

    // Clamp to valid range
    return Math.min(Math.max(0, pageIndex), totalPages - 1);
  }

  /**
   * Get all pages that intersect with the viewport (without buffer).
   */
  function getIntersectingPages(scrollTop: number, viewportHeight: number): number[] {
    if (totalPages === 0 || viewportHeight <= 0) {
      return [];
    }

    const viewportTop = Math.max(0, scrollTop);
    const viewportBottom = viewportTop + viewportHeight;

    const pages: number[] = [];

    for (let i = 0; i < totalPages; i++) {
      const pageTop = getPageTop(i);
      const pageBottom = pageTop + pageHeight;

      // Check if page intersects with viewport
      // A page intersects if its top is before viewport bottom AND its bottom is after viewport top
      if (pageTop < viewportBottom && pageBottom > viewportTop) {
        pages.push(i);
      }
    }

    return pages;
  }

  /**
   * Get the range of pages that should be rendered (visible + buffer).
   */
  function getVisibleRange(scrollTop: number, viewportHeight: number): PageRange {
    if (totalPages === 0) {
      return { start: 0, end: 0 };
    }

    const intersecting = getIntersectingPages(scrollTop, viewportHeight);

    if (intersecting.length === 0) {
      // If no pages intersect (shouldn't happen normally), return first page
      return { start: 0, end: 0 };
    }

    const firstVisible = intersecting[0];
    const lastVisible = intersecting[intersecting.length - 1];

    // Add buffer pages
    const start = Math.max(0, firstVisible - bufferSize);
    const end = Math.min(totalPages - 1, lastVisible + bufferSize);

    return { start, end };
  }

  /**
   * Get all buffered pages (visible + buffer above/below).
   */
  function getBufferedPages(scrollTop: number, viewportHeight: number): number[] {
    const range = getVisibleRange(scrollTop, viewportHeight);
    const pages: number[] = [];

    for (let i = range.start; i <= range.end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Check if a specific page should be rendered.
   */
  function shouldRenderPage(
    pageIndex: number,
    scrollTop: number,
    viewportHeight: number
  ): boolean {
    if (pageIndex < 0 || pageIndex >= totalPages) {
      return false;
    }

    const range = getVisibleRange(scrollTop, viewportHeight);
    return pageIndex >= range.start && pageIndex <= range.end;
  }

  /**
   * Get the scroll position to bring a page into view (top aligned).
   */
  function getScrollTopForPage(pageIndex: number): number {
    return getPageTop(pageIndex);
  }

  /**
   * Get the complete virtual render state.
   */
  function getState(scrollTop: number, viewportHeight: number): VirtualRenderState {
    const visiblePages = getIntersectingPages(scrollTop, viewportHeight);
    const bufferedPages = getBufferedPages(scrollTop, viewportHeight);

    return {
      visiblePages,
      bufferedPages,
      totalPages,
      scrollTop,
      viewportHeight,
    };
  }

  /**
   * Update the total page count.
   */
  function setTotalPages(count: number): void {
    totalPages = Math.max(1, count);
  }

  /**
   * Get the total document height (all pages + gaps between them).
   */
  function getTotalHeight(): number {
    if (totalPages <= 0) {
      return 0;
    }
    // Total height = (pages * pageHeight) + ((pages - 1) * pageGap)
    return totalPages * pageHeight + (totalPages - 1) * pageGap;
  }

  /**
   * Get the placeholder height for non-rendered pages.
   * This is the height that should be used for virtual spacing.
   */
  function getPlaceholderHeight(): number {
    return pageUnit;
  }

  return {
    getVisibleRange,
    shouldRenderPage,
    getPageTop,
    getScrollTopForPage,
    getState,
    setTotalPages,
    getTotalHeight,
    getPlaceholderHeight,
    getPageAtY,
    getIntersectingPages,
    getBufferedPages,
  };
}

// ============================================================================
// Debounced Scroll Handler
// ============================================================================

/**
 * Configuration for the debounced scroll handler.
 */
export interface ScrollHandlerConfig {
  /** Debounce delay in milliseconds (default: 16ms for ~60fps) */
  debounceMs?: number;
  /** Callback when render state changes */
  onRenderStateChange?: (state: VirtualRenderState) => void;
  /** The virtual renderer instance to use */
  renderer: VirtualRendererAPI;
}

/**
 * API for the debounced scroll handler.
 */
export interface ScrollHandlerAPI {
  /** Handle a scroll event */
  handleScroll(scrollTop: number, viewportHeight: number): void;
  /** Force an immediate update (bypasses debounce) */
  forceUpdate(scrollTop: number, viewportHeight: number): void;
  /** Cancel any pending debounced updates */
  cancel(): void;
  /** Get the last computed state */
  getLastState(): VirtualRenderState | null;
}

/** Default debounce delay for scroll handling */
export const DEFAULT_DEBOUNCE_MS = 16;

/**
 * Creates a debounced scroll handler for efficient scroll-based rendering updates.
 *
 * This handler debounces rapid scroll events to prevent excessive re-renders
 * while maintaining smooth visual updates. It's optimized for 60 FPS performance.
 *
 * @param config - Configuration for the scroll handler
 * @returns ScrollHandlerAPI with methods to handle scroll events
 *
 * @example
 * ```ts
 * const handler = createScrollHandler({
 *   renderer,
 *   debounceMs: 16,
 *   onRenderStateChange: (state) => {
 *     // Update UI with new render state
 *     updateVisiblePages(state.bufferedPages);
 *   },
 * });
 *
 * // In scroll event listener
 * element.addEventListener('scroll', () => {
 *   handler.handleScroll(element.scrollTop, element.clientHeight);
 * });
 * ```
 */
export function createScrollHandler(config: ScrollHandlerConfig): ScrollHandlerAPI {
  const { renderer, onRenderStateChange } = config;
  const debounceMs = config.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastState: VirtualRenderState | null = null;
  let pendingScrollTop = 0;
  let pendingViewportHeight = 0;

  /**
   * Perform the actual state update and callback.
   */
  function performUpdate(scrollTop: number, viewportHeight: number): void {
    const newState = renderer.getState(scrollTop, viewportHeight);

    // Check if state actually changed (compare buffered pages)
    const stateChanged =
      !lastState ||
      newState.bufferedPages.length !== lastState.bufferedPages.length ||
      newState.bufferedPages.some((page, i) => page !== lastState.bufferedPages[i]);

    if (stateChanged) {
      lastState = newState;
      onRenderStateChange?.(newState);
    }
  }

  /**
   * Handle a scroll event with debouncing.
   */
  function handleScroll(scrollTop: number, viewportHeight: number): void {
    pendingScrollTop = scrollTop;
    pendingViewportHeight = viewportHeight;

    if (timeoutId !== null) {
      // Already have a pending update
      return;
    }

    // Schedule an update
    timeoutId = setTimeout(() => {
      timeoutId = null;
      performUpdate(pendingScrollTop, pendingViewportHeight);
    }, debounceMs);
  }

  /**
   * Force an immediate update, bypassing debounce.
   */
  function forceUpdate(scrollTop: number, viewportHeight: number): void {
    // Cancel any pending debounced update
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    performUpdate(scrollTop, viewportHeight);
  }

  /**
   * Cancel any pending debounced updates.
   */
  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  /**
   * Get the last computed state.
   */
  function getLastState(): VirtualRenderState | null {
    return lastState;
  }

  return {
    handleScroll,
    forceUpdate,
    cancel,
    getLastState,
  };
}

// ============================================================================
// Fast Scroll Detection
// ============================================================================

/**
 * Configuration for fast scroll detection.
 */
export interface FastScrollConfig {
  /** Threshold in pixels per frame to consider "fast" scrolling (default: 200) */
  velocityThreshold?: number;
  /** Time window to measure velocity in milliseconds (default: 100) */
  timeWindowMs?: number;
}

/**
 * API for fast scroll detection.
 */
export interface FastScrollAPI {
  /** Update with new scroll position, returns true if scrolling fast */
  update(scrollTop: number): boolean;
  /** Get the current scroll velocity (pixels per second) */
  getVelocity(): number;
  /** Check if currently scrolling fast */
  isFastScrolling(): boolean;
  /** Reset the detector state */
  reset(): void;
}

/** Default velocity threshold for fast scroll detection */
export const DEFAULT_VELOCITY_THRESHOLD = 200;

/** Default time window for velocity calculation */
export const DEFAULT_TIME_WINDOW_MS = 100;

/**
 * Creates a fast scroll detector for optimizing render behavior during rapid scrolling.
 *
 * During fast scrolling, you may want to skip rendering intermediate pages
 * or reduce render quality to maintain performance.
 *
 * @param config - Configuration for the detector
 * @returns FastScrollAPI for detecting fast scroll state
 *
 * @example
 * ```ts
 * const fastScroll = createFastScrollDetector({
 *   velocityThreshold: 200,
 *   timeWindowMs: 100,
 * });
 *
 * element.addEventListener('scroll', () => {
 *   const isFast = fastScroll.update(element.scrollTop);
 *   if (isFast) {
 *     // Skip intermediate page renders
 *   }
 * });
 * ```
 */
export function createFastScrollDetector(config: FastScrollConfig = {}): FastScrollAPI {
  const velocityThreshold = config.velocityThreshold ?? DEFAULT_VELOCITY_THRESHOLD;
  const timeWindowMs = config.timeWindowMs ?? DEFAULT_TIME_WINDOW_MS;

  let lastScrollTop = 0;
  let lastTimestamp = 0;
  let currentVelocity = 0;
  let fastScrolling = false;

  /**
   * Update with new scroll position.
   */
  function update(scrollTop: number): boolean {
    const now = performance.now();
    const timeDelta = now - lastTimestamp;

    if (timeDelta > 0 && timeDelta <= timeWindowMs * 2) {
      // Calculate velocity in pixels per second
      const distance = Math.abs(scrollTop - lastScrollTop);
      currentVelocity = (distance / timeDelta) * 1000;
      fastScrolling = currentVelocity > velocityThreshold;
    } else {
      // Too much time passed, reset velocity
      currentVelocity = 0;
      fastScrolling = false;
    }

    lastScrollTop = scrollTop;
    lastTimestamp = now;

    return fastScrolling;
  }

  /**
   * Get current scroll velocity.
   */
  function getVelocity(): number {
    return currentVelocity;
  }

  /**
   * Check if currently scrolling fast.
   */
  function isFastScrolling(): boolean {
    return fastScrolling;
  }

  /**
   * Reset the detector state.
   */
  function reset(): void {
    lastScrollTop = 0;
    lastTimestamp = 0;
    currentVelocity = 0;
    fastScrolling = false;
  }

  return {
    update,
    getVelocity,
    isFastScrolling,
    reset,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate which pages need to transition (enter/exit) between two states.
 *
 * @param previousState - The previous render state (or null for initial)
 * @param currentState - The current render state
 * @returns Object containing arrays of entering and exiting page indices
 */
export function calculatePageTransitions(
  previousState: VirtualRenderState | null,
  currentState: VirtualRenderState
): { entering: number[]; exiting: number[] } {
  const previousPages = previousState?.bufferedPages ?? [];
  const currentPages = currentState.bufferedPages;

  const previousSet = new Set(previousPages);
  const currentSet = new Set(currentPages);

  const entering = currentPages.filter((page) => !previousSet.has(page));
  const exiting = previousPages.filter((page) => !currentSet.has(page));

  return { entering, exiting };
}

/**
 * Check if a page is fully visible within the viewport.
 *
 * @param pageIndex - The page index to check
 * @param scrollTop - Current scroll position
 * @param viewportHeight - Height of the viewport
 * @param pageHeight - Height of each page
 * @param pageGap - Gap between pages
 * @returns True if the entire page is visible
 */
export function isPageFullyVisible(
  pageIndex: number,
  scrollTop: number,
  viewportHeight: number,
  pageHeight: number = PAGE_HEIGHT,
  pageGap: number = PAGE_GAP
): boolean {
  const pageUnit = pageHeight + pageGap;
  const pageTop = pageIndex * pageUnit;
  const pageBottom = pageTop + pageHeight;

  const viewportTop = scrollTop;
  const viewportBottom = scrollTop + viewportHeight;

  return pageTop >= viewportTop && pageBottom <= viewportBottom;
}

/**
 * Calculate the visibility percentage of a page within the viewport.
 *
 * @param pageIndex - The page index to check
 * @param scrollTop - Current scroll position
 * @param viewportHeight - Height of the viewport
 * @param pageHeight - Height of each page
 * @param pageGap - Gap between pages
 * @returns Visibility percentage (0 to 1)
 */
export function getPageVisibilityPercentage(
  pageIndex: number,
  scrollTop: number,
  viewportHeight: number,
  pageHeight: number = PAGE_HEIGHT,
  pageGap: number = PAGE_GAP
): number {
  const pageUnit = pageHeight + pageGap;
  const pageTop = pageIndex * pageUnit;
  const pageBottom = pageTop + pageHeight;

  const viewportTop = scrollTop;
  const viewportBottom = scrollTop + viewportHeight;

  // No intersection
  if (pageBottom <= viewportTop || pageTop >= viewportBottom) {
    return 0;
  }

  // Calculate intersection
  const intersectionTop = Math.max(pageTop, viewportTop);
  const intersectionBottom = Math.min(pageBottom, viewportBottom);
  const intersectionHeight = intersectionBottom - intersectionTop;

  return intersectionHeight / pageHeight;
}

/**
 * Get the most visible page (the one with the highest visibility percentage).
 *
 * @param scrollTop - Current scroll position
 * @param viewportHeight - Height of the viewport
 * @param totalPages - Total number of pages
 * @param pageHeight - Height of each page
 * @param pageGap - Gap between pages
 * @returns The index of the most visible page
 */
export function getMostVisiblePage(
  scrollTop: number,
  viewportHeight: number,
  totalPages: number,
  pageHeight: number = PAGE_HEIGHT,
  pageGap: number = PAGE_GAP
): number {
  if (totalPages <= 0) {
    return 0;
  }

  let maxVisibility = 0;
  let mostVisiblePage = 0;

  // Only check pages that could possibly be visible
  const pageUnit = pageHeight + pageGap;
  const firstPossible = Math.max(0, Math.floor(scrollTop / pageUnit));
  const lastPossible = Math.min(
    totalPages - 1,
    Math.ceil((scrollTop + viewportHeight) / pageUnit)
  );

  for (let i = firstPossible; i <= lastPossible; i++) {
    const visibility = getPageVisibilityPercentage(
      i,
      scrollTop,
      viewportHeight,
      pageHeight,
      pageGap
    );
    if (visibility > maxVisibility) {
      maxVisibility = visibility;
      mostVisiblePage = i;
    }
  }

  return mostVisiblePage;
}
