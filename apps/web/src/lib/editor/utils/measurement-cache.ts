/**
 * Measurement Cache Utility
 *
 * Provides caching for content measurements to optimize performance in
 * multi-page documents. Key features:
 * - Cache line positions by document version
 * - Cache page break positions
 * - Partial invalidation for edited sections
 * - Lazy measurement with requestIdleCallback
 *
 * Performance Goals:
 * - < 16ms for page calculation
 * - Avoid re-measuring unchanged content
 * - Support 100+ page documents
 */

import type { EditorView } from '@tiptap/pm/view';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Position and metadata for a single line in the document
 */
export interface LinePosition {
  /** Y coordinate of the line top (relative to content area) */
  top: number;
  /** Height of the line in pixels */
  height: number;
  /** ProseMirror document position of the node */
  nodePos: number;
  /** Whether this line is the first line of a paragraph */
  isParagraphStart: boolean;
  /** Whether this line is the last line of a paragraph */
  isParagraphEnd: boolean;
  /** Whether this line is a heading (H1, H2, H3, etc.) */
  isHeading: boolean;
}

/**
 * Cache statistics for monitoring performance
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current number of cached line positions */
  size: number;
}

/**
 * Interface for the measurement cache
 */
export interface MeasurementCache {
  /**
   * Get cached or compute line positions from the editor view
   * @param editorView - The ProseMirror EditorView instance
   * @returns Array of LinePosition objects for each line in the document
   */
  getLinePositions(editorView: EditorView): LinePosition[];

  /**
   * Get cached or compute page break positions
   * @param contentHeight - Total height of the content in pixels
   * @param pageHeight - Usable content height per page in pixels
   * @returns Array of Y positions where pages should break
   */
  getPageBreaks(contentHeight: number, pageHeight: number): number[];

  /**
   * Invalidate cache for a specific document range
   * Only positions within the range will be marked dirty
   * @param from - Start position of the range
   * @param to - End position of the range
   */
  invalidateRange(from: number, to: number): void;

  /**
   * Invalidate the entire cache
   * Clears all cached data and resets statistics
   */
  invalidateAll(): void;

  /**
   * Check if a position is currently cached and valid
   * @param position - The document position to check
   * @returns True if the position is cached, false otherwise
   */
  isCached(position: number): boolean;

  /**
   * Get cache statistics for monitoring performance
   * @returns Object containing hits, misses, and current cache size
   */
  getStats(): CacheStats;
}

// ============================================================================
// Internal Types
// ============================================================================

interface CachedLinePosition extends LinePosition {
  /** Whether this position has been invalidated */
  dirty: boolean;
}

interface PageBreakCacheKey {
  contentHeight: number;
  pageHeight: number;
}

interface PageBreakCacheEntry {
  key: PageBreakCacheKey;
  breaks: number[];
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a new measurement cache instance
 *
 * @returns A new MeasurementCache instance
 *
 * @example
 * ```ts
 * const cache = createMeasurementCache();
 *
 * // Get line positions (computes on first call, cached after)
 * const lines = cache.getLinePositions(editor.view);
 *
 * // Get page breaks
 * const breaks = cache.getPageBreaks(contentHeight, pageHeight);
 *
 * // Check cache stats
 * const stats = cache.getStats();
 * console.log(`Cache hit rate: ${stats.hits / (stats.hits + stats.misses)}`);
 * ```
 */
export function createMeasurementCache(): MeasurementCache {
  // ============================================================================
  // State
  // ============================================================================

  /** Cached line positions by node position */
  const linePositionCache = new Map<number, CachedLinePosition>();

  /** Last computed line positions array */
  let cachedLinePositions: LinePosition[] = [];

  /** Last document version that was cached */
  let lastDocVersion: number | null = null;

  /** Cached page break calculations */
  let pageBreakCache: PageBreakCacheEntry | null = null;

  /** Dirty ranges that need re-measurement */
  let dirtyRanges: { from: number; to: number }[] = [];

  /** Cache statistics */
  let stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
  };

  /** Pending idle callback ID */
  let pendingIdleCallback: number | ReturnType<typeof setTimeout> | null = null;

  /** Maximum cache size to prevent memory leaks */
  const MAX_CACHE_SIZE = 1000;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Get document version from EditorView
   */
  function getDocVersion(editorView: EditorView): number {
    // Try to get version from custom property first (for testing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const customVersion = (editorView as any)._docVersion;
    if (typeof customVersion === 'number') {
      return customVersion;
    }

    // Fall back to using document content size as a proxy for version
    try {
      return editorView.state.doc.content.size;
    } catch {
      return 0;
    }
  }

  /**
   * Check if a position is within any dirty range
   */
  function isPositionDirty(position: number): boolean {
    return dirtyRanges.some(
      (range) => position >= Math.min(range.from, range.to) && position <= Math.max(range.from, range.to)
    );
  }

  /**
   * Schedule deferred measurement work using requestIdleCallback
   */
  function scheduleDeferredMeasurement(callback: () => void): void {
    // Cancel any pending callback
    if (pendingIdleCallback !== null) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(pendingIdleCallback as number);
      } else {
        clearTimeout(pendingIdleCallback as ReturnType<typeof setTimeout>);
      }
    }

    // Schedule new callback
    if (typeof requestIdleCallback !== 'undefined') {
      pendingIdleCallback = requestIdleCallback(
        (deadline) => {
          // Only execute if we have time remaining
          if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
            callback();
          }
        },
        { timeout: 100 } // Fallback timeout of 100ms
      );
    } else {
      // Fallback to setTimeout for browsers without requestIdleCallback
      pendingIdleCallback = setTimeout(callback, 0);
    }
  }

  /**
   * Measure line positions from the editor view
   */
  function measureLinePositions(editorView: EditorView): LinePosition[] {
    const linePositions: LinePosition[] = [];
    const doc = editorView.state.doc;

    // Track paragraph groupings for start/end detection
    const nodeData: {
      pos: number;
      typeName: string;
      top: number;
      height: number;
    }[] = [];

    // Traverse all nodes in the document
    doc.descendants((node, pos) => {
      // Only process block-level nodes
      if (!node.isBlock) {
        return true;
      }

      const typeName = node.type.name;

      // Skip document-level nodes
      if (typeName === 'doc') {
        return true;
      }

      // Get coordinates for this node
      try {
        const coords = editorView.coordsAtPos(pos);
        const domNode = editorView.nodeDOM(pos);

        let top = coords.top;
        let height = coords.bottom - coords.top;

        // If we have a DOM node, use its measurements for better accuracy
        if (domNode && domNode instanceof HTMLElement) {
          const rect = domNode.getBoundingClientRect();
          top = rect.top;
          height = rect.height;
        }

        nodeData.push({
          pos,
          typeName,
          top,
          height: Math.max(height, 1),
        });
      } catch {
        // Node might not be rendered yet, skip it
      }

      // Don't descend into block nodes
      return false;
    });

    // Convert node data to line positions
    for (const node of nodeData) {
      const isParagraphStart = true;
      const isParagraphEnd = true;
      const isHeading = node.typeName === 'heading';

      linePositions.push({
        top: node.top,
        height: node.height,
        nodePos: node.pos,
        isParagraphStart,
        isParagraphEnd,
        isHeading,
      });
    }

    return linePositions;
  }

  /**
   * Calculate page break positions
   */
  function calculatePageBreaks(contentHeight: number, pageHeight: number): number[] {
    if (contentHeight <= pageHeight) {
      return [];
    }

    const breaks: number[] = [];
    let currentBreak = pageHeight;

    while (currentBreak < contentHeight) {
      breaks.push(currentBreak);
      currentBreak += pageHeight;
    }

    return breaks;
  }

  /**
   * Update the line position cache
   */
  function updateLinePositionCache(positions: LinePosition[]): void {
    // Clear old cache if too large
    if (linePositionCache.size > MAX_CACHE_SIZE) {
      linePositionCache.clear();
    }

    // Add new positions to cache
    for (const pos of positions) {
      linePositionCache.set(pos.nodePos, {
        ...pos,
        dirty: false,
      });
    }

    stats.size = linePositionCache.size;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  function getLinePositions(editorView: EditorView): LinePosition[] {
    const currentVersion = getDocVersion(editorView);

    // Check if we have valid cached data
    if (lastDocVersion === currentVersion && cachedLinePositions.length > 0 && dirtyRanges.length === 0) {
      stats.hits++;
      return cachedLinePositions;
    }

    // Cache miss - need to measure
    stats.misses++;

    // Measure line positions
    const positions = measureLinePositions(editorView);

    // Update cache
    cachedLinePositions = positions;
    lastDocVersion = currentVersion;
    dirtyRanges = [];
    updateLinePositionCache(positions);

    // Schedule deferred measurement for any remaining work
    if (positions.length > 50) {
      scheduleDeferredMeasurement(() => {
        // Additional deferred processing could happen here
        // For example, pre-computing orphan/widow adjustments
      });
    }

    return positions;
  }

  function getPageBreaks(contentHeight: number, pageHeight: number): number[] {
    // Check if we have valid cached data
    if (
      pageBreakCache?.key.contentHeight === contentHeight &&
      pageBreakCache.key.pageHeight === pageHeight
    ) {
      stats.hits++;
      return pageBreakCache.breaks;
    }

    // Cache miss - need to calculate
    stats.misses++;

    const breaks = calculatePageBreaks(contentHeight, pageHeight);

    // Update cache
    pageBreakCache = {
      key: { contentHeight, pageHeight },
      breaks,
    };

    return breaks;
  }

  function invalidateRange(from: number, to: number): void {
    // Normalize the range
    const normalizedFrom = Math.min(from, to);
    const normalizedTo = Math.max(from, to);

    // Add to dirty ranges
    dirtyRanges.push({ from: normalizedFrom, to: normalizedTo });

    // Mark affected positions as dirty in the cache
    for (const [pos, entry] of linePositionCache.entries()) {
      if (pos >= normalizedFrom && pos <= normalizedTo) {
        entry.dirty = true;
      }
    }
  }

  function invalidateAll(): void {
    // Clear all caches
    linePositionCache.clear();
    cachedLinePositions = [];
    lastDocVersion = null;
    pageBreakCache = null;
    dirtyRanges = [];

    // Reset stats
    stats = {
      hits: 0,
      misses: 0,
      size: 0,
    };

    // Cancel any pending idle callback
    if (pendingIdleCallback !== null) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(pendingIdleCallback as number);
      } else {
        clearTimeout(pendingIdleCallback as ReturnType<typeof setTimeout>);
      }
      pendingIdleCallback = null;
    }
  }

  function isCached(position: number): boolean {
    // Check if position is in cache and not dirty
    const cached = linePositionCache.get(position);
    if (!cached) {
      return false;
    }

    // Check if position is in a dirty range
    if (cached.dirty || isPositionDirty(position)) {
      return false;
    }

    return true;
  }

  function getStats(): CacheStats {
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: linePositionCache.size,
    };
  }

  // ============================================================================
  // Return Public Interface
  // ============================================================================

  return {
    getLinePositions,
    getPageBreaks,
    invalidateRange,
    invalidateAll,
    isCached,
    getStats,
  };
}
