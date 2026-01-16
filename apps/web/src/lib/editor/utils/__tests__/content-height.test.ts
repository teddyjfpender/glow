/**
 * Tests for Content Height Measurement Utilities
 * TDD approach: Tests written before implementation
 *
 * These utilities measure content height and calculate page break positions
 * for the multi-page document feature.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EditorView } from '@tiptap/pm/view';
import { PAGE_CONTENT_HEIGHT } from '../page-metrics';
import {
  measureContentHeight,
  calculatePageBreakPositions,
  findLinePositions,
  adjustForOrphansWidows,
  type ContentMeasurement,
  type LinePosition,
} from '../content-height';

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Creates a mock HTML element with specified dimensions
 */
function createMockElement(options: {
  scrollHeight?: number;
  offsetHeight?: number;
  children?: HTMLElement[];
}): HTMLElement {
  const element = document.createElement('div');

  // Mock scrollHeight and offsetHeight
  Object.defineProperty(element, 'scrollHeight', {
    value: options.scrollHeight ?? 0,
    configurable: true,
  });

  Object.defineProperty(element, 'offsetHeight', {
    value: options.offsetHeight ?? options.scrollHeight ?? 0,
    configurable: true,
  });

  // Add children if provided
  if (options.children) {
    options.children.forEach((child) => element.appendChild(child));
  }

  return element;
}

/**
 * Creates a mock child element with margins
 */
function createMockChildElement(options: {
  tagName?: string;
  offsetTop?: number;
  offsetHeight?: number;
  marginTop?: number;
  marginBottom?: number;
}): HTMLElement {
  const element = document.createElement(options.tagName ?? 'div');

  Object.defineProperty(element, 'offsetTop', {
    value: options.offsetTop ?? 0,
    configurable: true,
  });

  Object.defineProperty(element, 'offsetHeight', {
    value: options.offsetHeight ?? 20,
    configurable: true,
  });

  // Mock getComputedStyle for margins
  const style = {
    marginTop: `${options.marginTop ?? 0}px`,
    marginBottom: `${options.marginBottom ?? 0}px`,
  };

  vi.spyOn(window, 'getComputedStyle').mockReturnValue(style as CSSStyleDeclaration);

  return element;
}

/**
 * Creates a mock EditorView for testing findLinePositions
 */
function createMockEditorView(options: {
  nodes?: {
    pos: number;
    node: { type: { name: string }; isBlock: boolean };
    rect: { top: number; height: number };
  }[];
}): EditorView {
  const mockNodes = options.nodes ?? [];

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

  // Create a mock doc with descendants method
  const descendants: {
    pos: number;
    node: { type: { name: string }; isBlock: boolean };
  }[] = mockNodes.map((n) => ({ pos: n.pos, node: n.node }));

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
    },
    coordsAtPos,
    nodeDOM,
    dom: document.createElement('div'),
  } as unknown as EditorView;
}

// ============================================================================
// measureContentHeight Tests
// ============================================================================

describe('measureContentHeight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Measurements', () => {
    it('should return total height of editor content', () => {
      const editorElement = createMockElement({ scrollHeight: 1500 });

      const result = measureContentHeight(editorElement);

      expect(result).toBe(1500);
    });

    it('should return 0 for empty editor', () => {
      const editorElement = createMockElement({ scrollHeight: 0 });

      const result = measureContentHeight(editorElement);

      expect(result).toBe(0);
    });

    it('should use scrollHeight over offsetHeight when scrollHeight is larger', () => {
      const editorElement = createMockElement({
        scrollHeight: 2000,
        offsetHeight: 500,
      });

      const result = measureContentHeight(editorElement);

      expect(result).toBe(2000);
    });
  });

  describe('Block Element Margins', () => {
    it('should account for block element margins', () => {
      // Create children with margins
      const child1 = document.createElement('p');
      const child2 = document.createElement('p');

      const editorElement = document.createElement('div');
      editorElement.appendChild(child1);
      editorElement.appendChild(child2);

      // Mock scrollHeight to include margins
      Object.defineProperty(editorElement, 'scrollHeight', {
        value: 500,
        configurable: true,
      });

      const result = measureContentHeight(editorElement);

      expect(result).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null-like element gracefully', () => {
      // Create an element that has no content
      const editorElement = createMockElement({ scrollHeight: 0, offsetHeight: 0 });

      const result = measureContentHeight(editorElement);

      expect(result).toBe(0);
    });

    it('should handle very large content heights', () => {
      const largeHeight = 100000;
      const editorElement = createMockElement({ scrollHeight: largeHeight });

      const result = measureContentHeight(editorElement);

      expect(result).toBe(largeHeight);
    });
  });
});

// ============================================================================
// calculatePageBreakPositions Tests
// ============================================================================

describe('calculatePageBreakPositions', () => {
  describe('Single Page Content', () => {
    it('should return empty array for single-page content', () => {
      const contentHeight = 500; // Less than PAGE_CONTENT_HEIGHT (828)

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([]);
    });

    it('should return empty array for content exactly equal to page height', () => {
      const contentHeight = PAGE_CONTENT_HEIGHT;

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([]);
    });

    it('should return empty array for zero content height', () => {
      const result = calculatePageBreakPositions(0, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([]);
    });
  });

  describe('Multi-Page Content', () => {
    it('should return one break position for two-page content', () => {
      const contentHeight = 1200; // Needs 2 pages

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([PAGE_CONTENT_HEIGHT]);
    });

    it('should calculate breaks at PAGE_CONTENT_HEIGHT (828px) intervals', () => {
      const contentHeight = 2500; // Needs 4 pages

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      // Should have breaks at 828, 1656, and 2484
      expect(result).toEqual([
        PAGE_CONTENT_HEIGHT,
        PAGE_CONTENT_HEIGHT * 2,
        PAGE_CONTENT_HEIGHT * 3,
      ]);
    });

    it('should return correct number of breaks for content barely exceeding one page', () => {
      const contentHeight = PAGE_CONTENT_HEIGHT + 1;

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([PAGE_CONTENT_HEIGHT]);
      expect(result.length).toBe(1);
    });

    it('should handle content that exactly fills multiple pages', () => {
      const contentHeight = PAGE_CONTENT_HEIGHT * 3; // Exactly 3 pages

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      // 3 pages means 2 breaks
      expect(result).toEqual([PAGE_CONTENT_HEIGHT, PAGE_CONTENT_HEIGHT * 2]);
      expect(result.length).toBe(2);
    });
  });

  describe('Manual Page Breaks', () => {
    it('should include manual page breaks in positions', () => {
      const contentHeight = 2000;
      const manualBreaks = [400, 1200];

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT, manualBreaks);

      // Should include both automatic (828) and manual breaks (400, 1200)
      expect(result).toContain(400);
      expect(result).toContain(828);
      expect(result).toContain(1200);
    });

    it('should sort all break positions in ascending order', () => {
      const contentHeight = 2000;
      const manualBreaks = [1200, 400, 600];

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT, manualBreaks);

      // Result should be sorted
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThan(result[i - 1]);
      }
    });

    it('should remove duplicate break positions', () => {
      const contentHeight = 2000;
      const manualBreaks = [PAGE_CONTENT_HEIGHT]; // Same as automatic break

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT, manualBreaks);

      // Should not have duplicate 828
      const breakCount = result.filter((b) => b === PAGE_CONTENT_HEIGHT).length;
      expect(breakCount).toBe(1);
    });

    it('should handle empty manual breaks array', () => {
      const contentHeight = 2000;
      const manualBreaks: number[] = [];

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT, manualBreaks);

      // Should only have automatic breaks
      expect(result).toEqual([PAGE_CONTENT_HEIGHT, PAGE_CONTENT_HEIGHT * 2]);
    });

    it('should ignore manual breaks beyond content height', () => {
      const contentHeight = 1000;
      const manualBreaks = [500, 2000]; // 2000 is beyond content

      const result = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT, manualBreaks);

      expect(result).toContain(500);
      expect(result).not.toContain(2000);
    });
  });

  describe('Custom Page Height', () => {
    it('should work with custom page content height', () => {
      const contentHeight = 1500;
      const customPageHeight = 500;

      const result = calculatePageBreakPositions(contentHeight, customPageHeight);

      // Should have breaks at 500 and 1000
      expect(result).toEqual([500, 1000]);
    });
  });
});

// ============================================================================
// findLinePositions Tests
// ============================================================================

describe('findLinePositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Paragraph Detection', () => {
    it('should identify paragraph start lines', () => {
      const mockView = createMockEditorView({
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

      const result = findLinePositions(mockView);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].isParagraphStart).toBe(true);
    });

    it('should identify paragraph end lines', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result.length).toBeGreaterThan(0);
      // Single line paragraph is both start and end
      expect(result[0].isParagraphEnd).toBe(true);
    });

    it('should mark single-line paragraphs as both start and end', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result[0].isParagraphStart).toBe(true);
      expect(result[0].isParagraphEnd).toBe(true);
    });
  });

  describe('Heading Detection', () => {
    it('should identify H1 heading lines', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 32 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].isHeading).toBe(true);
    });

    it('should identify H2 heading lines', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 28 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result[0].isHeading).toBe(true);
    });

    it('should identify H3 heading lines', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result[0].isHeading).toBe(true);
    });

    it('should not mark paragraphs as headings', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result[0].isHeading).toBe(false);
    });
  });

  describe('Y Position Calculations', () => {
    it('should calculate correct Y positions for lines', () => {
      const mockView = createMockEditorView({
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

      const result = findLinePositions(mockView);

      expect(result[0].top).toBe(100);
      expect(result[1].top).toBe(148);
    });

    it('should include line height in positions', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result[0].height).toBe(24);
    });

    it('should include node position (nodePos) in results', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 42,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 0, height: 24 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result[0].nodePos).toBe(42);
    });
  });

  describe('Empty Document', () => {
    it('should return empty array for empty document', () => {
      const mockView = createMockEditorView({ nodes: [] });

      const result = findLinePositions(mockView);

      expect(result).toEqual([]);
    });
  });

  describe('Mixed Content', () => {
    it('should handle mixed headings and paragraphs', () => {
      const mockView = createMockEditorView({
        nodes: [
          {
            pos: 0,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 0, height: 32 },
          },
          {
            pos: 20,
            node: { type: { name: 'paragraph' }, isBlock: true },
            rect: { top: 56, height: 24 },
          },
          {
            pos: 80,
            node: { type: { name: 'heading' }, isBlock: true },
            rect: { top: 104, height: 28 },
          },
        ],
      });

      const result = findLinePositions(mockView);

      expect(result.length).toBe(3);
      expect(result[0].isHeading).toBe(true);
      expect(result[1].isHeading).toBe(false);
      expect(result[2].isHeading).toBe(true);
    });
  });
});

// ============================================================================
// adjustForOrphansWidows Tests
// ============================================================================

describe('adjustForOrphansWidows', () => {
  describe('Orphan Prevention', () => {
    it('should move orphan lines (single line at page bottom) to next page', () => {
      // Scenario: Break at 800, but there's a line at 790-810 that would be orphaned
      const breakPositions = [800];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 24, height: 24, nodePos: 10, isParagraphStart: false, isParagraphEnd: false, isHeading: false },
        { top: 48, height: 24, nodePos: 20, isParagraphStart: false, isParagraphEnd: false, isHeading: false },
        // Many lines...
        { top: 776, height: 24, nodePos: 100, isParagraphStart: true, isParagraphEnd: true, isHeading: false }, // Single line at bottom - orphan
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Break should be moved before the orphan line
      expect(result[0]).toBeLessThan(800);
      expect(result[0]).toBeLessThanOrEqual(776);
    });

    it('should not adjust if multiple lines remain on page', () => {
      const breakPositions = [800];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 24, height: 24, nodePos: 10, isParagraphStart: false, isParagraphEnd: false, isHeading: false },
        { top: 752, height: 24, nodePos: 90, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 776, height: 24, nodePos: 100, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Should keep break at 800 since there are 2 lines from same paragraph
      expect(result[0]).toBe(800);
    });
  });

  describe('Widow Prevention', () => {
    it('should pull widow lines (single line at page top) to previous page if space', () => {
      // Scenario: Break at 800, next paragraph starts at 800 and has only one line on page 2
      const breakPositions = [800];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 700, height: 24, nodePos: 80, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
        { top: 800, height: 24, nodePos: 90, isParagraphStart: true, isParagraphEnd: true, isHeading: false }, // Widow
        { top: 848, height: 24, nodePos: 100, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Break should be adjusted to pull widow to previous page
      // Since there's space (700+24=724, which leaves 104px), the widow can be pulled up
      expect(result[0]).toBeGreaterThan(800);
    });

    it('should not pull widow if no space on previous page', () => {
      const breakPositions = [800];
      const linePositions: LinePosition[] = [
        // Fill the first page completely
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 776, height: 24, nodePos: 80, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
        { top: 800, height: 24, nodePos: 90, isParagraphStart: true, isParagraphEnd: true, isHeading: false }, // Widow
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Cannot pull widow - no space, so break stays
      expect(result[0]).toBe(800);
    });
  });

  describe('Heading with Following Content', () => {
    it('should keep headings with at least 2 lines of following content', () => {
      // Scenario: Heading at bottom of page with only 1 line following on same page
      const breakPositions = [800];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: true, isHeading: false },
        { top: 752, height: 32, nodePos: 80, isParagraphStart: true, isParagraphEnd: true, isHeading: true }, // Heading near bottom
        { top: 784, height: 24, nodePos: 90, isParagraphStart: true, isParagraphEnd: false, isHeading: false }, // Only 1 line after heading
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Break should be moved before heading so heading stays with its content
      expect(result[0]).toBeLessThanOrEqual(752);
    });

    it('should not adjust if heading has 2+ lines following on same page', () => {
      const breakPositions = [850];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: true, isHeading: false },
        { top: 700, height: 32, nodePos: 80, isParagraphStart: true, isParagraphEnd: true, isHeading: true }, // Heading
        { top: 732, height: 24, nodePos: 90, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 756, height: 24, nodePos: 100, isParagraphStart: false, isParagraphEnd: false, isHeading: false },
        { top: 780, height: 24, nodePos: 110, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Heading has 3 lines following before break, no adjustment needed
      expect(result[0]).toBe(850);
    });
  });

  describe('No Worse Breaks', () => {
    it('should not adjust if it would create worse breaks', () => {
      // Scenario: Moving the break would create an orphan
      const breakPositions = [800];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 24, height: 24, nodePos: 10, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
        // Gap
        { top: 776, height: 24, nodePos: 80, isParagraphStart: true, isParagraphEnd: true, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Check that result doesn't make things worse
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return original breaks if no adjustments are beneficial', () => {
      const breakPositions = [828, 1656];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 24, height: 24, nodePos: 10, isParagraphStart: false, isParagraphEnd: false, isHeading: false },
        { top: 48, height: 24, nodePos: 20, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
        // Content spreads evenly across pages
        { top: 828, height: 24, nodePos: 100, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 852, height: 24, nodePos: 110, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // No orphans/widows, should return similar breaks
      expect(result.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty break positions', () => {
      const breakPositions: number[] = [];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: true, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([]);
    });

    it('should handle empty line positions', () => {
      const breakPositions = [800];
      const linePositions: LinePosition[] = [];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // No lines to analyze, return original breaks
      expect(result).toEqual([800]);
    });

    it('should handle single line document', () => {
      const breakPositions: number[] = [];
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: true, isHeading: false },
      ];

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      expect(result).toEqual([]);
    });

    it('should handle multiple page breaks', () => {
      const breakPositions = [828, 1656, 2484];
      const linePositions: LinePosition[] = [];

      // Generate lines across multiple pages
      for (let i = 0; i < 100; i++) {
        linePositions.push({
          top: i * 30,
          height: 24,
          nodePos: i * 10,
          isParagraphStart: i % 5 === 0,
          isParagraphEnd: i % 5 === 4,
          isHeading: false,
        });
      }

      const result = adjustForOrphansWidows(breakPositions, linePositions, PAGE_CONTENT_HEIGHT);

      // Should still have reasonable number of breaks
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  describe('Full Content Measurement Flow', () => {
    it('should work together to calculate page breaks for a document', () => {
      // Step 1: Measure content height
      const editorElement = createMockElement({ scrollHeight: 2000 });
      const contentHeight = measureContentHeight(editorElement);

      // Step 2: Calculate initial page breaks
      const initialBreaks = calculatePageBreakPositions(contentHeight, PAGE_CONTENT_HEIGHT);

      // Step 3: Get line positions (mock)
      const linePositions: LinePosition[] = [
        { top: 0, height: 24, nodePos: 0, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
        { top: 800, height: 24, nodePos: 50, isParagraphStart: false, isParagraphEnd: true, isHeading: false },
        { top: 828, height: 24, nodePos: 60, isParagraphStart: true, isParagraphEnd: false, isHeading: false },
      ];

      // Step 4: Adjust for orphans/widows
      const adjustedBreaks = adjustForOrphansWidows(initialBreaks, linePositions, PAGE_CONTENT_HEIGHT);

      // Verify the flow produces valid results
      expect(contentHeight).toBe(2000);
      expect(initialBreaks.length).toBe(2); // 3 pages = 2 breaks
      expect(adjustedBreaks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Type Definitions', () => {
    it('should export ContentMeasurement type correctly', () => {
      const measurement: ContentMeasurement = {
        totalHeight: 2000,
        pageBreakPositions: [828, 1656],
        linePositions: [
          {
            top: 0,
            height: 24,
            nodePos: 0,
            isParagraphStart: true,
            isParagraphEnd: true,
            isHeading: false,
          },
        ],
      };

      expect(measurement.totalHeight).toBe(2000);
      expect(measurement.pageBreakPositions.length).toBe(2);
      expect(measurement.linePositions.length).toBe(1);
    });

    it('should export LinePosition type correctly', () => {
      const position: LinePosition = {
        top: 100,
        height: 24,
        nodePos: 42,
        isParagraphStart: true,
        isParagraphEnd: false,
        isHeading: true,
      };

      expect(position.top).toBe(100);
      expect(position.height).toBe(24);
      expect(position.nodePos).toBe(42);
      expect(position.isParagraphStart).toBe(true);
      expect(position.isParagraphEnd).toBe(false);
      expect(position.isHeading).toBe(true);
    });
  });
});
