/**
 * Comprehensive Tests for Pagination State Management
 *
 * Tests the reactive state management for multi-page document pagination
 * using Svelte 5 runes pattern.
 *
 * Note: Svelte 5 $derived values may not reactively update in vitest
 * without a Svelte component context. Tests check the underlying state
 * directly when testing derived values.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { paginationState, type PageBreakInfo } from '../pagination.svelte';

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a mock PageBreakInfo for testing */
function createMockPageBreak(overrides: Partial<PageBreakInfo> = {}): PageBreakInfo {
  return {
    pageIndex: 1,
    contentStartY: 0,
    contentEndY: 1056,
    prosemirrorPos: 0,
    isManualBreak: false,
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('PaginationState', () => {
  beforeEach(() => {
    // Reset state before each test
    paginationState.reset();
  });

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('should have pageCount of 1', () => {
      expect(paginationState.pageCount).toBe(1);
    });

    it('should have currentPage of 1', () => {
      expect(paginationState.currentPage).toBe(1);
    });

    it('should have empty pageBreaks array', () => {
      expect(paginationState.pageBreaks).toEqual([]);
      expect(paginationState.pageBreaks).toHaveLength(0);
    });

    it('should have scrollPosition of 0', () => {
      expect(paginationState.scrollPosition).toBe(0);
    });

    it('should have isCalculating as false', () => {
      expect(paginationState.isCalculating).toBe(false);
    });
  });

  // ============================================================================
  // setPageCount Tests
  // ============================================================================

  describe('setPageCount', () => {
    it('should update pageCount correctly', () => {
      paginationState.setPageCount(5);
      expect(paginationState.pageCount).toBe(5);
    });

    it('should update pageCount to different values', () => {
      paginationState.setPageCount(3);
      expect(paginationState.pageCount).toBe(3);

      paginationState.setPageCount(10);
      expect(paginationState.pageCount).toBe(10);
    });

    it('should clamp pageCount to minimum of 1', () => {
      paginationState.setPageCount(0);
      expect(paginationState.pageCount).toBe(1);

      paginationState.setPageCount(-5);
      expect(paginationState.pageCount).toBe(1);
    });

    it('should clamp currentPage if it exceeds new pageCount', () => {
      paginationState.setPageCount(10);
      paginationState.setCurrentPage(8);
      expect(paginationState.currentPage).toBe(8);

      paginationState.setPageCount(5);
      expect(paginationState.currentPage).toBe(5);
    });

    it('should not change currentPage if still within valid range', () => {
      paginationState.setPageCount(10);
      paginationState.setCurrentPage(3);
      expect(paginationState.currentPage).toBe(3);

      paginationState.setPageCount(5);
      expect(paginationState.currentPage).toBe(3);
    });
  });

  // ============================================================================
  // setCurrentPage Tests
  // ============================================================================

  describe('setCurrentPage', () => {
    it('should update currentPage correctly', () => {
      paginationState.setPageCount(5);
      paginationState.setCurrentPage(3);
      expect(paginationState.currentPage).toBe(3);
    });

    it('should clamp currentPage to minimum of 1', () => {
      paginationState.setCurrentPage(0);
      expect(paginationState.currentPage).toBe(1);

      paginationState.setCurrentPage(-5);
      expect(paginationState.currentPage).toBe(1);
    });

    it('should clamp currentPage to maximum of pageCount', () => {
      paginationState.setPageCount(5);
      paginationState.setCurrentPage(10);
      expect(paginationState.currentPage).toBe(5);
    });

    it('should do nothing for NaN values', () => {
      paginationState.setPageCount(5);
      paginationState.setCurrentPage(3);
      paginationState.setCurrentPage(NaN);
      expect(paginationState.currentPage).toBe(3);
    });

    it('should handle decimal values by using them as-is (no rounding)', () => {
      paginationState.setPageCount(5);
      paginationState.setCurrentPage(2.5);
      // The state stores it, clamped to valid range
      expect(paginationState.currentPage).toBe(2.5);
    });
  });

  // ============================================================================
  // setPageBreaks Tests
  // ============================================================================

  describe('setPageBreaks', () => {
    it('should update pageBreaks array', () => {
      const breaks: PageBreakInfo[] = [
        createMockPageBreak({ pageIndex: 1, contentStartY: 0, contentEndY: 1056 }),
        createMockPageBreak({ pageIndex: 2, contentStartY: 1056, contentEndY: 2112 }),
      ];

      paginationState.setPageBreaks(breaks);

      expect(paginationState.pageBreaks).toHaveLength(2);
      expect(paginationState.pageBreaks[0].pageIndex).toBe(1);
      expect(paginationState.pageBreaks[1].pageIndex).toBe(2);
    });

    it('should sort pageBreaks by pageIndex if not already sorted', () => {
      const breaks: PageBreakInfo[] = [
        createMockPageBreak({ pageIndex: 3, contentStartY: 2112, contentEndY: 3168 }),
        createMockPageBreak({ pageIndex: 1, contentStartY: 0, contentEndY: 1056 }),
        createMockPageBreak({ pageIndex: 2, contentStartY: 1056, contentEndY: 2112 }),
      ];

      paginationState.setPageBreaks(breaks);

      expect(paginationState.pageBreaks[0].pageIndex).toBe(1);
      expect(paginationState.pageBreaks[1].pageIndex).toBe(2);
      expect(paginationState.pageBreaks[2].pageIndex).toBe(3);
    });

    it('should replace existing pageBreaks', () => {
      const initialBreaks: PageBreakInfo[] = [
        createMockPageBreak({ pageIndex: 1 }),
        createMockPageBreak({ pageIndex: 2 }),
      ];
      paginationState.setPageBreaks(initialBreaks);
      expect(paginationState.pageBreaks).toHaveLength(2);

      const newBreaks: PageBreakInfo[] = [
        createMockPageBreak({ pageIndex: 1 }),
        createMockPageBreak({ pageIndex: 2 }),
        createMockPageBreak({ pageIndex: 3 }),
      ];
      paginationState.setPageBreaks(newBreaks);
      expect(paginationState.pageBreaks).toHaveLength(3);
    });

    it('should handle empty array', () => {
      paginationState.setPageBreaks([
        createMockPageBreak({ pageIndex: 1 }),
      ]);
      expect(paginationState.pageBreaks).toHaveLength(1);

      paginationState.setPageBreaks([]);
      expect(paginationState.pageBreaks).toHaveLength(0);
    });

    it('should preserve all PageBreakInfo properties', () => {
      const breaks: PageBreakInfo[] = [
        {
          pageIndex: 1,
          contentStartY: 100,
          contentEndY: 500,
          prosemirrorPos: 42,
          isManualBreak: true,
        },
      ];

      paginationState.setPageBreaks(breaks);

      const storedBreak = paginationState.pageBreaks[0];
      expect(storedBreak.pageIndex).toBe(1);
      expect(storedBreak.contentStartY).toBe(100);
      expect(storedBreak.contentEndY).toBe(500);
      expect(storedBreak.prosemirrorPos).toBe(42);
      expect(storedBreak.isManualBreak).toBe(true);
    });
  });

  // ============================================================================
  // setScrollPosition Tests
  // ============================================================================

  describe('setScrollPosition', () => {
    it('should update scrollPosition correctly', () => {
      paginationState.setScrollPosition(500);
      expect(paginationState.scrollPosition).toBe(500);
    });

    it('should allow negative scroll positions', () => {
      paginationState.setScrollPosition(-100);
      expect(paginationState.scrollPosition).toBe(-100);
    });

    it('should allow zero scroll position', () => {
      paginationState.setScrollPosition(1000);
      paginationState.setScrollPosition(0);
      expect(paginationState.scrollPosition).toBe(0);
    });
  });

  // ============================================================================
  // setCalculating Tests
  // ============================================================================

  describe('setCalculating', () => {
    it('should update isCalculating to true', () => {
      paginationState.setCalculating(true);
      expect(paginationState.isCalculating).toBe(true);
    });

    it('should update isCalculating to false', () => {
      paginationState.setCalculating(true);
      paginationState.setCalculating(false);
      expect(paginationState.isCalculating).toBe(false);
    });
  });

  // ============================================================================
  // Navigation Methods Tests
  // ============================================================================

  describe('navigation methods', () => {
    describe('goToPage', () => {
      it('should set currentPage to specified page', () => {
        paginationState.setPageCount(5);
        paginationState.goToPage(3);
        expect(paginationState.currentPage).toBe(3);
      });

      it('should clamp to minimum page (1)', () => {
        paginationState.setPageCount(5);
        paginationState.goToPage(0);
        expect(paginationState.currentPage).toBe(1);

        paginationState.goToPage(-1);
        expect(paginationState.currentPage).toBe(1);
      });

      it('should clamp to maximum page (pageCount)', () => {
        paginationState.setPageCount(5);
        paginationState.goToPage(10);
        expect(paginationState.currentPage).toBe(5);
      });

      it('should work for single page document', () => {
        paginationState.setPageCount(1);
        paginationState.goToPage(1);
        expect(paginationState.currentPage).toBe(1);
      });
    });

    describe('nextPage', () => {
      it('should increment currentPage', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        paginationState.nextPage();
        expect(paginationState.currentPage).toBe(3);
      });

      it('should not exceed pageCount', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(5);
        paginationState.nextPage();
        expect(paginationState.currentPage).toBe(5);
      });

      it('should do nothing on single page document', () => {
        paginationState.setPageCount(1);
        paginationState.nextPage();
        expect(paginationState.currentPage).toBe(1);
      });

      it('should work multiple times in sequence', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(1);

        paginationState.nextPage();
        expect(paginationState.currentPage).toBe(2);

        paginationState.nextPage();
        expect(paginationState.currentPage).toBe(3);

        paginationState.nextPage();
        expect(paginationState.currentPage).toBe(4);
      });
    });

    describe('prevPage', () => {
      it('should decrement currentPage', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(3);
        paginationState.prevPage();
        expect(paginationState.currentPage).toBe(2);
      });

      it('should not go below 1', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(1);
        paginationState.prevPage();
        expect(paginationState.currentPage).toBe(1);
      });

      it('should do nothing on first page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(1);
        paginationState.prevPage();
        expect(paginationState.currentPage).toBe(1);
      });

      it('should work multiple times in sequence', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(5);

        paginationState.prevPage();
        expect(paginationState.currentPage).toBe(4);

        paginationState.prevPage();
        expect(paginationState.currentPage).toBe(3);

        paginationState.prevPage();
        expect(paginationState.currentPage).toBe(2);
      });
    });
  });

  // ============================================================================
  // getPageAtY Tests
  // ============================================================================

  describe('getPageAtY', () => {
    beforeEach(() => {
      // Set up a 3-page document with known break positions
      const breaks: PageBreakInfo[] = [
        createMockPageBreak({ pageIndex: 1, contentStartY: 0, contentEndY: 1000 }),
        createMockPageBreak({ pageIndex: 2, contentStartY: 1000, contentEndY: 2000 }),
        createMockPageBreak({ pageIndex: 3, contentStartY: 2000, contentEndY: 3000 }),
      ];
      paginationState.setPageBreaks(breaks);
      paginationState.setPageCount(3);
    });

    it('should return 1 for position in first page', () => {
      expect(paginationState.getPageAtY(0)).toBe(1);
      expect(paginationState.getPageAtY(500)).toBe(1);
      expect(paginationState.getPageAtY(999)).toBe(1);
    });

    it('should return correct page for middle pages', () => {
      expect(paginationState.getPageAtY(1000)).toBe(2);
      expect(paginationState.getPageAtY(1500)).toBe(2);
      expect(paginationState.getPageAtY(1999)).toBe(2);
    });

    it('should return last page for position in last page', () => {
      expect(paginationState.getPageAtY(2000)).toBe(3);
      expect(paginationState.getPageAtY(2500)).toBe(3);
      expect(paginationState.getPageAtY(2999)).toBe(3);
    });

    it('should return last page for position beyond content', () => {
      expect(paginationState.getPageAtY(5000)).toBe(3);
      expect(paginationState.getPageAtY(10000)).toBe(3);
    });

    it('should return 1 for negative Y position', () => {
      expect(paginationState.getPageAtY(-100)).toBe(1);
    });

    it('should return 1 when no page breaks are set', () => {
      paginationState.reset();
      expect(paginationState.getPageAtY(500)).toBe(1);
      expect(paginationState.getPageAtY(2000)).toBe(1);
    });

    it('should handle exact boundary positions', () => {
      // At exactly the start of page 2
      expect(paginationState.getPageAtY(1000)).toBe(2);
      // At exactly the start of page 3
      expect(paginationState.getPageAtY(2000)).toBe(3);
    });
  });

  // ============================================================================
  // getPageBreakInfo Tests
  // ============================================================================

  describe('getPageBreakInfo', () => {
    beforeEach(() => {
      const breaks: PageBreakInfo[] = [
        createMockPageBreak({
          pageIndex: 1,
          contentStartY: 0,
          contentEndY: 1000,
          prosemirrorPos: 0,
          isManualBreak: false,
        }),
        createMockPageBreak({
          pageIndex: 2,
          contentStartY: 1000,
          contentEndY: 2000,
          prosemirrorPos: 500,
          isManualBreak: true,
        }),
        createMockPageBreak({
          pageIndex: 3,
          contentStartY: 2000,
          contentEndY: 3000,
          prosemirrorPos: 1000,
          isManualBreak: false,
        }),
      ];
      paginationState.setPageBreaks(breaks);
    });

    it('should return PageBreakInfo for valid page index', () => {
      const info = paginationState.getPageBreakInfo(1);
      expect(info).toBeDefined();
      expect(info?.pageIndex).toBe(1);
      expect(info?.contentStartY).toBe(0);
      expect(info?.contentEndY).toBe(1000);
    });

    it('should return correct info for middle page', () => {
      const info = paginationState.getPageBreakInfo(2);
      expect(info).toBeDefined();
      expect(info?.pageIndex).toBe(2);
      expect(info?.prosemirrorPos).toBe(500);
      expect(info?.isManualBreak).toBe(true);
    });

    it('should return correct info for last page', () => {
      const info = paginationState.getPageBreakInfo(3);
      expect(info).toBeDefined();
      expect(info?.pageIndex).toBe(3);
      expect(info?.contentStartY).toBe(2000);
    });

    it('should return undefined for invalid page index (0)', () => {
      const info = paginationState.getPageBreakInfo(0);
      expect(info).toBeUndefined();
    });

    it('should return undefined for page index beyond pageBreaks', () => {
      const info = paginationState.getPageBreakInfo(10);
      expect(info).toBeUndefined();
    });

    it('should return undefined for negative page index', () => {
      const info = paginationState.getPageBreakInfo(-1);
      expect(info).toBeUndefined();
    });

    it('should return undefined when pageBreaks is empty', () => {
      paginationState.setPageBreaks([]);
      const info = paginationState.getPageBreakInfo(1);
      expect(info).toBeUndefined();
    });
  });

  // ============================================================================
  // reset Tests
  // ============================================================================

  describe('reset', () => {
    it('should restore pageCount to 1', () => {
      paginationState.setPageCount(10);
      paginationState.reset();
      expect(paginationState.pageCount).toBe(1);
    });

    it('should restore currentPage to 1', () => {
      paginationState.setPageCount(10);
      paginationState.setCurrentPage(5);
      paginationState.reset();
      expect(paginationState.currentPage).toBe(1);
    });

    it('should restore pageBreaks to empty array', () => {
      paginationState.setPageBreaks([
        createMockPageBreak({ pageIndex: 1 }),
        createMockPageBreak({ pageIndex: 2 }),
      ]);
      paginationState.reset();
      expect(paginationState.pageBreaks).toEqual([]);
      expect(paginationState.pageBreaks).toHaveLength(0);
    });

    it('should restore scrollPosition to 0', () => {
      paginationState.setScrollPosition(1500);
      paginationState.reset();
      expect(paginationState.scrollPosition).toBe(0);
    });

    it('should restore isCalculating to false', () => {
      paginationState.setCalculating(true);
      paginationState.reset();
      expect(paginationState.isCalculating).toBe(false);
    });

    it('should restore all values at once', () => {
      // Set up various state
      paginationState.setPageCount(10);
      paginationState.setCurrentPage(7);
      paginationState.setPageBreaks([
        createMockPageBreak({ pageIndex: 1 }),
        createMockPageBreak({ pageIndex: 2 }),
        createMockPageBreak({ pageIndex: 3 }),
      ]);
      paginationState.setScrollPosition(2500);
      paginationState.setCalculating(true);

      // Reset
      paginationState.reset();

      // Verify all values are reset
      expect(paginationState.pageCount).toBe(1);
      expect(paginationState.currentPage).toBe(1);
      expect(paginationState.pageBreaks).toEqual([]);
      expect(paginationState.scrollPosition).toBe(0);
      expect(paginationState.isCalculating).toBe(false);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('should handle complete pagination workflow', () => {
      // 1. Initialize a multi-page document
      paginationState.setPageCount(5);
      expect(paginationState.pageCount).toBe(5);
      expect(paginationState.currentPage).toBe(1);

      // 2. Set up page breaks
      const breaks: PageBreakInfo[] = [
        createMockPageBreak({ pageIndex: 1, contentStartY: 0, contentEndY: 800 }),
        createMockPageBreak({ pageIndex: 2, contentStartY: 800, contentEndY: 1600 }),
        createMockPageBreak({ pageIndex: 3, contentStartY: 1600, contentEndY: 2400 }),
        createMockPageBreak({ pageIndex: 4, contentStartY: 2400, contentEndY: 3200 }),
        createMockPageBreak({ pageIndex: 5, contentStartY: 3200, contentEndY: 4000 }),
      ];
      paginationState.setPageBreaks(breaks);

      // 3. Navigate through pages
      paginationState.goToPage(3);
      expect(paginationState.currentPage).toBe(3);

      paginationState.nextPage();
      expect(paginationState.currentPage).toBe(4);

      paginationState.prevPage();
      expect(paginationState.currentPage).toBe(3);

      // 4. Get page at Y position
      expect(paginationState.getPageAtY(900)).toBe(2);
      expect(paginationState.getPageAtY(2500)).toBe(4);

      // 5. Get page break info
      const pageInfo = paginationState.getPageBreakInfo(3);
      expect(pageInfo?.contentStartY).toBe(1600);
      expect(pageInfo?.contentEndY).toBe(2400);

      // 6. Update scroll position
      paginationState.setScrollPosition(1800);
      expect(paginationState.scrollPosition).toBe(1800);

      // 7. Reset and verify clean state
      paginationState.reset();
      expect(paginationState.pageCount).toBe(1);
      expect(paginationState.currentPage).toBe(1);
      expect(paginationState.pageBreaks).toHaveLength(0);
    });

    it('should handle page count changes with navigation', () => {
      // Start with 10 pages
      paginationState.setPageCount(10);
      paginationState.goToPage(8);
      expect(paginationState.currentPage).toBe(8);

      // Reduce page count - current page should clamp
      paginationState.setPageCount(5);
      expect(paginationState.currentPage).toBe(5);

      // Increase page count - current page should remain
      paginationState.setPageCount(15);
      expect(paginationState.currentPage).toBe(5);

      // Navigate to new page
      paginationState.goToPage(12);
      expect(paginationState.currentPage).toBe(12);
    });

    it('should handle calculation state during pagination updates', () => {
      // Start calculation
      paginationState.setCalculating(true);
      expect(paginationState.isCalculating).toBe(true);

      // Update page breaks during calculation
      paginationState.setPageBreaks([
        createMockPageBreak({ pageIndex: 1, contentStartY: 0, contentEndY: 1000 }),
        createMockPageBreak({ pageIndex: 2, contentStartY: 1000, contentEndY: 2000 }),
      ]);

      // Finish calculation
      paginationState.setCalculating(false);
      expect(paginationState.isCalculating).toBe(false);

      // Verify page breaks are set
      expect(paginationState.pageBreaks).toHaveLength(2);
    });

    it('should handle rapid state changes', () => {
      paginationState.setPageCount(100);

      // Rapid navigation
      for (let i = 0; i < 50; i++) {
        paginationState.nextPage();
      }
      expect(paginationState.currentPage).toBe(51);

      for (let i = 0; i < 30; i++) {
        paginationState.prevPage();
      }
      expect(paginationState.currentPage).toBe(21);

      // Rapid goToPage
      for (let i = 1; i <= 10; i++) {
        paginationState.goToPage(i * 10);
      }
      expect(paginationState.currentPage).toBe(100);
    });
  });
});
