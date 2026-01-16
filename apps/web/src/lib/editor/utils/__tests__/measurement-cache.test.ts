/**
 * Tests for Measurement Cache Utility
 * TDD approach: Tests written before implementation
 *
 * This utility provides caching for content measurements to optimize
 * performance in multi-page documents. Key features:
 * - Cache line positions by document version
 * - Cache page break positions
 * - Partial invalidation for edited sections
 * - Lazy measurement with requestIdleCallback
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EditorView } from '@tiptap/pm/view';
import { PAGE_CONTENT_HEIGHT } from '../page-metrics';
import {
  createMeasurementCache,
  type MeasurementCache,
  type LinePosition,
  type CacheStats,
} from '../measurement-cache';

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Creates a mock EditorView for testing
 */
function createMockEditorView(options: {
  docVersion?: number;
  nodes?: {
    pos: number;
    node: { type: { name: string }; isBlock: boolean };
    rect: { top: number; height: number };
  }[];
  scrollHeight?: number;
}): EditorView {
  const mockNodes = options.nodes ?? [];
  const version = options.docVersion ?? 1;

  const coordsAtPos = vi.fn((pos: number) => {
    const node = mockNodes.find((n) => n.pos === pos);
    if (node) {
      return {
        top: node.rect.top,
        bottom: node.rect.top + node.rect.height,
        left: 0,
        right: 100,
      };
    }
    return { top: 0, bottom: 20, left: 0, right: 100 };
  });

  const nodeDOM = vi.fn((pos: number) => {
    const node = mockNodes.find((n) => n.pos === pos);
    if (node) {
      const element = document.createElement('div');
      Object.defineProperty(element, 'getBoundingClientRect', {
        value: () => ({
          top: node.rect.top,
          height: node.rect.height,
          bottom: node.rect.top + node.rect.height,
          left: 0,
          right: 100,
          width: 100,
        }),
      });
      return element;
    }
    return null;
  });

  const descendants: {
    pos: number;
    node: { type: { name: string }; isBlock: boolean };
  }[] = mockNodes.map((n) => ({ pos: n.pos, node: n.node }));

  const dom = document.createElement('div');
  Object.defineProperty(dom, 'scrollHeight', {
    value: options.scrollHeight ?? 1000,
    configurable: true,
  });
  Object.defineProperty(dom, 'offsetHeight', {
    value: options.scrollHeight ?? 1000,
    configurable: true,
  });

  return {
    state: {
      doc: {
        descendants: vi.fn((callback: (node: any, pos: number) => boolean | void) => {
          descendants.forEach(({ node, pos }) => {
            callback(node, pos);
          });
        }),
        nodeSize: mockNodes.length > 0 ? Math.max(...mockNodes.map((n) => n.pos)) + 10 : 10,
      },
      // Simulate document version tracking
      tr: {
        doc: {
          content: {
            size: mockNodes.length * 10,
          },
        },
      },
    },
    coordsAtPos,
    nodeDOM,
    dom,
    // Custom version tracking for cache invalidation
    _docVersion: version,
  } as unknown as EditorView;
}

/**
 * Creates sample line positions for testing
 */
function createSampleLinePositions(count = 10): LinePosition[] {
  const positions: LinePosition[] = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      top: i * 30,
      height: 24,
      nodePos: i * 10,
      isParagraphStart: i % 3 === 0,
      isParagraphEnd: i % 3 === 2,
      isHeading: i === 0 || i === 5,
    });
  }
  return positions;
}

// ============================================================================
// createMeasurementCache Tests
// ============================================================================

describe('createMeasurementCache', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create a cache instance with all required methods', () => {
      expect(cache).toBeDefined();
      expect(typeof cache.getLinePositions).toBe('function');
      expect(typeof cache.getPageBreaks).toBe('function');
      expect(typeof cache.invalidateRange).toBe('function');
      expect(typeof cache.invalidateAll).toBe('function');
      expect(typeof cache.isCached).toBe('function');
      expect(typeof cache.getStats).toBe('function');
    });

    it('should initialize with zero cache hits and misses', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });
});

// ============================================================================
// getLinePositions Tests
// ============================================================================

describe('MeasurementCache.getLinePositions', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Cache Miss Behavior', () => {
    it('should compute line positions on cache miss', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      const result = cache.getLinePositions(mockView);

      expect(result.length).toBeGreaterThan(0);
      expect(cache.getStats().misses).toBe(1);
    });

    it('should return empty array for empty editor', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [],
      });

      const result = cache.getLinePositions(mockView);

      expect(result).toEqual([]);
    });
  });

  describe('Cache Hit Behavior', () => {
    it('should return cached line positions on subsequent calls with same version', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      // First call - cache miss
      const result1 = cache.getLinePositions(mockView);

      // Second call - cache hit
      const result2 = cache.getLinePositions(mockView);

      expect(result1).toEqual(result2);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);
    });

    it('should recompute when document version changes', () => {
      const mockView1 = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const mockView2 = createMockEditorView({
        docVersion: 2,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      // First call with version 1
      cache.getLinePositions(mockView1);

      // Second call with version 2 - should miss
      cache.getLinePositions(mockView2);

      expect(cache.getStats().misses).toBe(2);
    });
  });

  describe('Line Position Accuracy', () => {
    it('should correctly identify paragraph start lines', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = cache.getLinePositions(mockView);

      expect(result[0].isParagraphStart).toBe(true);
    });

    it('should correctly identify heading lines', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 32 },
          },
        ],
      });

      const result = cache.getLinePositions(mockView);

      expect(result[0].isHeading).toBe(true);
    });

    it('should include correct Y positions', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 100, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 148, height: 24 },
          },
        ],
      });

      const result = cache.getLinePositions(mockView);

      expect(result[0].top).toBe(100);
      expect(result[1].top).toBe(148);
    });
  });
});

// ============================================================================
// getPageBreaks Tests
// ============================================================================

describe('MeasurementCache.getPageBreaks', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Cache Miss Behavior', () => {
    it('should compute page breaks on cache miss', () => {
      const contentHeight = 2000;
      const pageHeight = PAGE_CONTENT_HEIGHT;

      const result = cache.getPageBreaks(contentHeight, pageHeight);

      expect(result.length).toBeGreaterThan(0);
      expect(cache.getStats().misses).toBe(1);
    });

    it('should return empty array for single-page content', () => {
      const contentHeight = 500;
      const pageHeight = PAGE_CONTENT_HEIGHT;

      const result = cache.getPageBreaks(contentHeight, pageHeight);

      expect(result).toEqual([]);
    });
  });

  describe('Cache Hit Behavior', () => {
    it('should return cached page breaks for same parameters', () => {
      const contentHeight = 2000;
      const pageHeight = PAGE_CONTENT_HEIGHT;

      // First call - cache miss
      const result1 = cache.getPageBreaks(contentHeight, pageHeight);

      // Second call - cache hit
      const result2 = cache.getPageBreaks(contentHeight, pageHeight);

      expect(result1).toEqual(result2);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);
    });

    it('should recompute when content height changes', () => {
      const pageHeight = PAGE_CONTENT_HEIGHT;

      // First call
      cache.getPageBreaks(2000, pageHeight);

      // Second call with different height - cache miss
      cache.getPageBreaks(3000, pageHeight);

      expect(cache.getStats().misses).toBe(2);
    });

    it('should recompute when page height changes', () => {
      const contentHeight = 2000;

      // First call
      cache.getPageBreaks(contentHeight, 828);

      // Second call with different page height - cache miss
      cache.getPageBreaks(contentHeight, 500);

      expect(cache.getStats().misses).toBe(2);
    });
  });

  describe('Page Break Accuracy', () => {
    it('should calculate breaks at correct intervals', () => {
      const contentHeight = 2500;
      const pageHeight = PAGE_CONTENT_HEIGHT;

      const result = cache.getPageBreaks(contentHeight, pageHeight);

      expect(result).toEqual([
        PAGE_CONTENT_HEIGHT,
        PAGE_CONTENT_HEIGHT * 2,
        PAGE_CONTENT_HEIGHT * 3,
      ]);
    });

    it('should return one break for two-page content', () => {
      const contentHeight = 1200;
      const pageHeight = PAGE_CONTENT_HEIGHT;

      const result = cache.getPageBreaks(contentHeight, pageHeight);

      expect(result).toEqual([PAGE_CONTENT_HEIGHT]);
    });
  });
});

// ============================================================================
// invalidateRange Tests
// ============================================================================

describe('MeasurementCache.invalidateRange', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Partial Invalidation', () => {
    it('should invalidate cached data for specified range', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
          {
            pos: 100,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 96, height: 24 },
          },
        ],
      });

      // Populate cache
      cache.getLinePositions(mockView);
      expect(cache.isCached(50)).toBe(true);

      // Invalidate range containing position 50
      cache.invalidateRange(40, 60);

      // Position 50 should no longer be cached
      expect(cache.isCached(50)).toBe(false);
    });

    it('should not invalidate positions outside the range', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 100,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 96, height: 24 },
          },
        ],
      });

      // Populate cache
      cache.getLinePositions(mockView);

      // Invalidate range not containing position 100
      cache.invalidateRange(40, 60);

      // Position 100 should still be cached
      expect(cache.isCached(100)).toBe(true);
    });

    it('should mark affected positions as dirty', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      // Populate cache
      cache.getLinePositions(mockView);

      // Invalidate range
      cache.invalidateRange(0, 100);

      // After invalidation, getting line positions should result in cache miss
      cache.getLinePositions(mockView);
      expect(cache.getStats().misses).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache gracefully', () => {
      expect(() => {
        cache.invalidateRange(0, 100);
      }).not.toThrow();
    });

    it('should handle reversed range (from > to)', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);

      // Reversed range should still work
      cache.invalidateRange(100, 0);

      expect(cache.isCached(50)).toBe(false);
    });

    it('should handle negative positions', () => {
      expect(() => {
        cache.invalidateRange(-100, 100);
      }).not.toThrow();
    });
  });
});

// ============================================================================
// invalidateAll Tests
// ============================================================================

describe('MeasurementCache.invalidateAll', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Full Invalidation', () => {
    it('should clear all cached line positions', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      // Populate cache
      cache.getLinePositions(mockView);
      expect(cache.getStats().size).toBeGreaterThan(0);

      // Invalidate all
      cache.invalidateAll();

      expect(cache.getStats().size).toBe(0);
    });

    it('should clear all cached page breaks', () => {
      // Populate cache
      cache.getPageBreaks(2000, PAGE_CONTENT_HEIGHT);

      // Invalidate all (this resets stats)
      cache.invalidateAll();

      // Next call should be a miss (stats were reset, so this is miss #1)
      cache.getPageBreaks(2000, PAGE_CONTENT_HEIGHT);
      expect(cache.getStats().misses).toBe(1);
    });

    it('should reset cache statistics', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      // Generate some hits and misses
      cache.getLinePositions(mockView);
      cache.getLinePositions(mockView);

      // Invalidate all
      cache.invalidateAll();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });
});

// ============================================================================
// isCached Tests
// ============================================================================

describe('MeasurementCache.isCached', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Position Checking', () => {
    it('should return false for uncached position', () => {
      expect(cache.isCached(100)).toBe(false);
    });

    it('should return true for cached position', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 100,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);

      expect(cache.isCached(100)).toBe(true);
    });

    it('should return false after invalidation', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 100,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);
      cache.invalidateAll();

      expect(cache.isCached(100)).toBe(false);
    });
  });
});

// ============================================================================
// getStats Tests
// ============================================================================

describe('MeasurementCache.getStats', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Statistics Tracking', () => {
    it('should track cache hits correctly', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView); // miss
      cache.getLinePositions(mockView); // hit
      cache.getLinePositions(mockView); // hit

      expect(cache.getStats().hits).toBe(2);
    });

    it('should track cache misses correctly', () => {
      const mockView1 = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const mockView2 = createMockEditorView({
        docVersion: 2,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView1); // miss
      cache.getLinePositions(mockView2); // miss (different version)

      expect(cache.getStats().misses).toBe(2);
    });

    it('should track cache size correctly', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);

      expect(cache.getStats().size).toBe(2);
    });

    it('should return correct stats after multiple operations', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView); // miss
      cache.getLinePositions(mockView); // hit
      cache.getPageBreaks(2000, PAGE_CONTENT_HEIGHT); // miss
      cache.getPageBreaks(2000, PAGE_CONTENT_HEIGHT); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });
  });

  describe('Statistics Return Type', () => {
    it('should return stats with correct shape', () => {
      const stats = cache.getStats();

      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });
});

// ============================================================================
// Lazy Measurement Tests
// ============================================================================

describe('MeasurementCache Lazy Measurement', () => {
  let cache: MeasurementCache;
  let mockRequestIdleCallback: ReturnType<typeof vi.fn>;
  let mockCancelIdleCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock requestIdleCallback
    mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      const id = Math.random();
      // Store callback for later execution
      setTimeout(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => 50,
        });
      }, 0);
      return id;
    });

    mockCancelIdleCallback = vi.fn();

    // @ts-ignore - Adding mock to global
    globalThis.requestIdleCallback = mockRequestIdleCallback;
    // @ts-ignore
    globalThis.cancelIdleCallback = mockCancelIdleCallback;

    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // @ts-ignore - Clean up
    delete globalThis.requestIdleCallback;
    // @ts-ignore
    delete globalThis.cancelIdleCallback;
  });

  describe('Deferred Measurement', () => {
    it('should schedule deferred measurement for non-visible content', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: Array.from({ length: 100 }, (_, i) => ({
          pos: i * 10,
          node: { type: { name: 'paragraph' }, isBlock: true },
          rect: { top: i * 30, height: 24 },
        })),
        scrollHeight: 3000,
      });

      cache.getLinePositions(mockView);

      // Should have scheduled idle callback for deferred work
      expect(mockRequestIdleCallback).toHaveBeenCalled();
    });

    it('should use setTimeout as fallback when requestIdleCallback unavailable', () => {
      // Remove requestIdleCallback
      // @ts-ignore
      delete globalThis.requestIdleCallback;

      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      cache = createMeasurementCache();

      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: Array.from({ length: 100 }, (_, i) => ({
          pos: i * 10,
          node: { type: { name: 'paragraph' }, isBlock: true },
          rect: { top: i * 30, height: 24 },
        })),
        scrollHeight: 3000,
      });

      cache.getLinePositions(mockView);

      // Should fall back to setTimeout
      expect(setTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Visible Content Priority', () => {
    it('should measure visible content immediately', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
        scrollHeight: 100,
      });

      const result = cache.getLinePositions(mockView);

      // Visible content should be measured immediately
      expect(result.length).toBe(2);
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('MeasurementCache Performance', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Performance Goals', () => {
    it('should complete page calculation in under 16ms for typical content', () => {
      const startTime = performance.now();

      const contentHeight = 5000;
      cache.getPageBreaks(contentHeight, PAGE_CONTENT_HEIGHT);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(16);
    });

    it('should handle 100+ page documents efficiently', () => {
      // Create a large document simulation
      const contentHeight = PAGE_CONTENT_HEIGHT * 150; // 150 pages

      const startTime = performance.now();
      cache.getPageBreaks(contentHeight, PAGE_CONTENT_HEIGHT);
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Should still be fast even for large documents
      expect(duration).toBeLessThan(100);
    });

    it('should avoid re-measuring unchanged content', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: Array.from({ length: 50 }, (_, i) => ({
          pos: i * 10,
          node: { type: { name: 'paragraph' }, isBlock: true },
          rect: { top: i * 30, height: 24 },
        })),
      });

      // First call
      cache.getLinePositions(mockView);

      // Subsequent calls should hit cache
      for (let i = 0; i < 10; i++) {
        cache.getLinePositions(mockView);
      }

      // Should have 10 hits and only 1 miss
      expect(cache.getStats().hits).toBe(10);
      expect(cache.getStats().misses).toBe(1);
    });
  });

  describe('Memory Efficiency', () => {
    it('should limit cache size to prevent memory leaks', () => {
      // Simulate many different document versions
      for (let version = 1; version <= 100; version++) {
        const mockView = createMockEditorView({
          docVersion: version,
          nodes: [
            {
              pos: 0,
              node: { type: { name: 'paragraph' }, isBlock: true },
              rect: { top: 0, height: 24 },
            },
          ],
        });

        cache.getLinePositions(mockView);
      }

      // Cache should have bounded size (implementation detail)
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000); // Reasonable upper bound
    });
  });
});

// ============================================================================
// Document Version Tracking Tests
// ============================================================================

describe('MeasurementCache Document Version Tracking', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Version-Based Invalidation', () => {
    it('should invalidate cache when document version changes', () => {
      const mockView1 = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const mockView2 = createMockEditorView({
        docVersion: 2,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView1);
      const statsAfterFirst = { ...cache.getStats() };

      cache.getLinePositions(mockView2);
      const statsAfterSecond = cache.getStats();

      expect(statsAfterSecond.misses).toBe(statsAfterFirst.misses + 1);
    });

    it('should preserve cache for unchanged document version', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);
      cache.getLinePositions(mockView);
      cache.getLinePositions(mockView);

      expect(cache.getStats().hits).toBe(2);
    });
  });
});

// ============================================================================
// Dirty Range Tracking Tests
// ============================================================================

describe('MeasurementCache Dirty Range Tracking', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Dirty Range Management', () => {
    it('should track dirty ranges after invalidateRange', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);

      // Mark range as dirty
      cache.invalidateRange(40, 60);

      // Position 50 should no longer be considered cached
      expect(cache.isCached(50)).toBe(false);
    });

    it('should clear dirty ranges after full invalidation', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);
      cache.invalidateRange(40, 60);
      cache.invalidateAll();

      // After full invalidation, stats should be reset
      expect(cache.getStats().size).toBe(0);
    });

    it('should handle multiple dirty ranges', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 48, height: 24 },
          },
          {
            pos: 150,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 144, height: 24 },
          },
          {
            pos: 250,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 240, height: 24 },
          },
        ],
      });

      cache.getLinePositions(mockView);

      // Mark multiple ranges as dirty
      cache.invalidateRange(40, 60);
      cache.invalidateRange(240, 260);

      expect(cache.isCached(50)).toBe(false);
      expect(cache.isCached(150)).toBe(true);
      expect(cache.isCached(250)).toBe(false);
    });
  });
});

// ============================================================================
// Content Height Caching Tests
// ============================================================================

describe('MeasurementCache Content Height', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Content Height Caching', () => {
    it('should cache content height measurements', () => {
      const mockView = createMockEditorView({
        docVersion: 1,
        scrollHeight: 2000,
        nodes: [],
      });

      // Get line positions which should also cache content height
      cache.getLinePositions(mockView);

      // Same content height should be cached
      const result1 = cache.getPageBreaks(2000, PAGE_CONTENT_HEIGHT);
      const result2 = cache.getPageBreaks(2000, PAGE_CONTENT_HEIGHT);

      expect(result1).toEqual(result2);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('MeasurementCache Integration', () => {
  let cache: MeasurementCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cache = createMeasurementCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Full Workflow', () => {
    it('should work correctly in typical editing workflow', () => {
      // Initial document
      const mockView1 = createMockEditorView({
        docVersion: 1,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 32 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 56, height: 24 },
          },
        ],
        scrollHeight: 100,
      });

      // Step 1: Initial measurement
      const lines1 = cache.getLinePositions(mockView1);
      const breaks1 = cache.getPageBreaks(100, PAGE_CONTENT_HEIGHT);

      expect(lines1.length).toBe(2);
      expect(breaks1.length).toBe(0);

      // Step 2: User types more content (same version)
      const lines2 = cache.getLinePositions(mockView1);
      expect(cache.getStats().hits).toBe(1);

      // Step 3: Document version changes after typing
      const mockView2 = createMockEditorView({
        docVersion: 2,
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 32 },
          },
          {
            pos: 50,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 56, height: 24 },
          },
          {
            pos: 100,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 104, height: 24 },
          },
        ],
        scrollHeight: 150,
      });

      const lines3 = cache.getLinePositions(mockView2);
      expect(lines3.length).toBe(3);
      // Misses: 1 (getLinePositions v1) + 1 (getPageBreaks) + 1 (getLinePositions v2) = 3
      expect(cache.getStats().misses).toBe(3);
    });

    it('should handle rapid document changes efficiently', () => {
      // Simulate rapid typing - many version changes
      for (let version = 1; version <= 10; version++) {
        const mockView = createMockEditorView({
          docVersion: version,
          nodes: Array.from({ length: version }, (_, i) => ({
            pos: i * 10,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: i * 30, height: 24 },
          })),
        });

        cache.getLinePositions(mockView);
      }

      // Should handle all versions without error
      expect(cache.getStats().misses).toBe(10);
    });
  });
});
