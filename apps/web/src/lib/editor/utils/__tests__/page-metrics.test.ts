/**
 * Tests for Page Metrics Utility Module
 * TDD approach: Tests written before implementation
 */
import { describe, it, expect } from 'vitest';
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_MARGIN_TOP,
  PAGE_MARGIN_BOTTOM,
  PAGE_MARGIN_HORIZONTAL,
  PAGE_GAP,
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  PAGE_CONTENT_HEIGHT,
  CONTENT_AREA_HEIGHT,
  SPACER_HEIGHT,
  calculatePageCount,
  getPageAtPosition,
  getPageStartY,
  getContentPositionInPage,
} from '../page-metrics';

describe('Page Metrics Constants', () => {
  describe('Page Dimensions', () => {
    it('should have PAGE_WIDTH of 816 pixels (8.5 inches at 96 DPI)', () => {
      expect(PAGE_WIDTH).toBe(816);
    });

    it('should have PAGE_HEIGHT of 1056 pixels (11 inches at 96 DPI)', () => {
      expect(PAGE_HEIGHT).toBe(1056);
    });
  });

  describe('Page Margins', () => {
    it('should have PAGE_MARGIN_TOP of 96 pixels (1 inch)', () => {
      expect(PAGE_MARGIN_TOP).toBe(96);
    });

    it('should have PAGE_MARGIN_BOTTOM of 72 pixels (0.75 inch)', () => {
      expect(PAGE_MARGIN_BOTTOM).toBe(72);
    });

    it('should have PAGE_MARGIN_HORIZONTAL of 96 pixels (1 inch)', () => {
      expect(PAGE_MARGIN_HORIZONTAL).toBe(96);
    });
  });

  describe('Page Layout', () => {
    it('should have PAGE_GAP of 32 pixels between pages', () => {
      expect(PAGE_GAP).toBe(32);
    });

    it('should have HEADER_HEIGHT of 72 pixels', () => {
      expect(HEADER_HEIGHT).toBe(72);
    });

    it('should have FOOTER_HEIGHT of 60 pixels', () => {
      expect(FOOTER_HEIGHT).toBe(60);
    });
  });

  describe('Derived Constants', () => {
    it('should have PAGE_CONTENT_HEIGHT of 828 pixels (PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT)', () => {
      expect(PAGE_CONTENT_HEIGHT).toBe(828);
      // Verify the calculation: 1056 - 96 - 72 - 60 = 828
      expect(PAGE_CONTENT_HEIGHT).toBe(PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT);
    });

    it('should have CONTENT_AREA_HEIGHT of 924 pixels (PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT)', () => {
      expect(CONTENT_AREA_HEIGHT).toBe(924);
      // Verify the calculation: 1056 - 72 - 60 = 924
      expect(CONTENT_AREA_HEIGHT).toBe(PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT);
    });

    it('should have SPACER_HEIGHT of 164 pixels (FOOTER_HEIGHT + PAGE_GAP + HEADER_HEIGHT)', () => {
      expect(SPACER_HEIGHT).toBe(164);
      // Verify the calculation: 60 + 32 + 72 = 164
      expect(SPACER_HEIGHT).toBe(FOOTER_HEIGHT + PAGE_GAP + HEADER_HEIGHT);
    });
  });
});

describe('calculatePageCount', () => {
  describe('Basic Calculations', () => {
    it('should return 1 for content that fits on a single page', () => {
      expect(calculatePageCount(500, PAGE_CONTENT_HEIGHT)).toBe(1);
    });

    it('should return 1 for content exactly equal to page content height', () => {
      expect(calculatePageCount(PAGE_CONTENT_HEIGHT, PAGE_CONTENT_HEIGHT)).toBe(1);
    });

    it('should return 2 for content slightly exceeding one page', () => {
      expect(calculatePageCount(PAGE_CONTENT_HEIGHT + 1, PAGE_CONTENT_HEIGHT)).toBe(2);
    });

    it('should return 2 for content that needs exactly two pages', () => {
      expect(calculatePageCount(PAGE_CONTENT_HEIGHT * 2, PAGE_CONTENT_HEIGHT)).toBe(2);
    });

    it('should return 3 for content slightly exceeding two pages', () => {
      expect(calculatePageCount(PAGE_CONTENT_HEIGHT * 2 + 1, PAGE_CONTENT_HEIGHT)).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should return 1 for zero content height', () => {
      expect(calculatePageCount(0, PAGE_CONTENT_HEIGHT)).toBe(1);
    });

    it('should return 1 for negative content height', () => {
      expect(calculatePageCount(-100, PAGE_CONTENT_HEIGHT)).toBe(1);
    });

    it('should handle very large content heights', () => {
      const largeContent = PAGE_CONTENT_HEIGHT * 100;
      expect(calculatePageCount(largeContent, PAGE_CONTENT_HEIGHT)).toBe(100);
    });

    it('should handle fractional content heights by rounding up', () => {
      expect(calculatePageCount(PAGE_CONTENT_HEIGHT * 1.5, PAGE_CONTENT_HEIGHT)).toBe(2);
    });
  });

  describe('Custom Page Content Heights', () => {
    it('should work with custom page content height of 500', () => {
      expect(calculatePageCount(1000, 500)).toBe(2);
    });

    it('should work with custom page content height of 1000', () => {
      expect(calculatePageCount(2500, 1000)).toBe(3);
    });
  });
});

describe('getPageAtPosition', () => {
  describe('Basic Position Calculations', () => {
    it('should return 0 for position at the start of the first page', () => {
      expect(getPageAtPosition(0, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should return 0 for position within the first page', () => {
      expect(getPageAtPosition(500, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should return 0 for position at the end of the first page', () => {
      expect(getPageAtPosition(PAGE_HEIGHT - 1, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should return 1 for position at the start of the second page', () => {
      // Second page starts at PAGE_HEIGHT + PAGE_GAP
      const secondPageStart = PAGE_HEIGHT + PAGE_GAP;
      expect(getPageAtPosition(secondPageStart, PAGE_HEIGHT, PAGE_GAP)).toBe(1);
    });

    it('should return 1 for position within the second page', () => {
      const secondPageMiddle = PAGE_HEIGHT + PAGE_GAP + 500;
      expect(getPageAtPosition(secondPageMiddle, PAGE_HEIGHT, PAGE_GAP)).toBe(1);
    });

    it('should return 2 for position at the start of the third page', () => {
      // Third page starts at 2 * (PAGE_HEIGHT + PAGE_GAP)
      const thirdPageStart = 2 * (PAGE_HEIGHT + PAGE_GAP);
      expect(getPageAtPosition(thirdPageStart, PAGE_HEIGHT, PAGE_GAP)).toBe(2);
    });
  });

  describe('Positions in Gap Areas', () => {
    it('should return previous page index for position in gap between pages', () => {
      // Gap is after first page, between PAGE_HEIGHT and PAGE_HEIGHT + PAGE_GAP
      const gapPosition = PAGE_HEIGHT + 10;
      expect(getPageAtPosition(gapPosition, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should return page index for position at exact gap boundary', () => {
      const gapEnd = PAGE_HEIGHT + PAGE_GAP;
      expect(getPageAtPosition(gapEnd, PAGE_HEIGHT, PAGE_GAP)).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should return 0 for negative positions', () => {
      expect(getPageAtPosition(-100, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should handle very large positions', () => {
      const largePosition = 10 * (PAGE_HEIGHT + PAGE_GAP) + 500;
      expect(getPageAtPosition(largePosition, PAGE_HEIGHT, PAGE_GAP)).toBe(10);
    });

    it('should work with zero gap', () => {
      expect(getPageAtPosition(PAGE_HEIGHT * 2 + 100, PAGE_HEIGHT, 0)).toBe(2);
    });
  });

  describe('Custom Dimensions', () => {
    it('should work with custom page height of 500 and gap of 20', () => {
      const pageHeight = 500;
      const gap = 20;
      // Position 1050 = 2 * (500 + 20) + 10 = page 2, 10px into it
      expect(getPageAtPosition(1050, pageHeight, gap)).toBe(2);
    });
  });
});

describe('getPageStartY', () => {
  describe('Basic Page Start Calculations', () => {
    it('should return 0 for first page (index 0)', () => {
      expect(getPageStartY(0, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should return PAGE_HEIGHT + PAGE_GAP for second page (index 1)', () => {
      const expected = PAGE_HEIGHT + PAGE_GAP;
      expect(getPageStartY(1, PAGE_HEIGHT, PAGE_GAP)).toBe(expected);
    });

    it('should return 2 * (PAGE_HEIGHT + PAGE_GAP) for third page (index 2)', () => {
      const expected = 2 * (PAGE_HEIGHT + PAGE_GAP);
      expect(getPageStartY(2, PAGE_HEIGHT, PAGE_GAP)).toBe(expected);
    });

    it('should return correct Y for page 10', () => {
      const expected = 10 * (PAGE_HEIGHT + PAGE_GAP);
      expect(getPageStartY(10, PAGE_HEIGHT, PAGE_GAP)).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should return 0 for negative page index', () => {
      expect(getPageStartY(-1, PAGE_HEIGHT, PAGE_GAP)).toBe(0);
    });

    it('should handle very large page indices', () => {
      const expected = 1000 * (PAGE_HEIGHT + PAGE_GAP);
      expect(getPageStartY(1000, PAGE_HEIGHT, PAGE_GAP)).toBe(expected);
    });

    it('should work with zero gap', () => {
      expect(getPageStartY(3, PAGE_HEIGHT, 0)).toBe(3 * PAGE_HEIGHT);
    });
  });

  describe('Custom Dimensions', () => {
    it('should work with custom page height of 500 and gap of 20', () => {
      const pageHeight = 500;
      const gap = 20;
      expect(getPageStartY(2, pageHeight, gap)).toBe(2 * (500 + 20));
    });
  });

  describe('Consistency with getPageAtPosition', () => {
    it('should be inverse of getPageAtPosition for page starts', () => {
      for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
        const startY = getPageStartY(pageIndex, PAGE_HEIGHT, PAGE_GAP);
        expect(getPageAtPosition(startY, PAGE_HEIGHT, PAGE_GAP)).toBe(pageIndex);
      }
    });
  });
});

describe('getContentPositionInPage', () => {
  describe('Basic Position Within Page', () => {
    it('should return position relative to content area for first page', () => {
      // globalY = 200, pageIndex = 0, content starts at headerHeight = 72
      // Position in page = 200 - 0 - 72 = 128
      const result = getContentPositionInPage(200, 0, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
      expect(result).toBe(128);
    });

    it('should return 0 for position at start of content area', () => {
      // Content starts at headerHeight (72) on first page
      const result = getContentPositionInPage(HEADER_HEIGHT, 0, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
      expect(result).toBe(0);
    });

    it('should calculate correctly for second page', () => {
      // Second page starts at PAGE_HEIGHT + PAGE_GAP = 1088
      // Content area on second page starts at 1088 + 72 = 1160
      // Position 1200 should be 1200 - 1088 - 72 = 40
      const secondPageStart = PAGE_HEIGHT + PAGE_GAP;
      const globalY = secondPageStart + HEADER_HEIGHT + 40;
      const result = getContentPositionInPage(globalY, 1, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
      expect(result).toBe(40);
    });

    it('should calculate correctly for third page', () => {
      const thirdPageStart = 2 * (PAGE_HEIGHT + PAGE_GAP);
      const globalY = thirdPageStart + HEADER_HEIGHT + 100;
      const result = getContentPositionInPage(globalY, 2, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
      expect(result).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should return negative value for position in header area', () => {
      // Position before content area (in header)
      const result = getContentPositionInPage(50, 0, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
      expect(result).toBe(-22); // 50 - 0 - 72 = -22
    });

    it('should handle zero header height', () => {
      const result = getContentPositionInPage(100, 0, PAGE_HEIGHT, PAGE_GAP, 0);
      expect(result).toBe(100);
    });

    it('should handle position at exact page boundary', () => {
      const secondPageStart = PAGE_HEIGHT + PAGE_GAP;
      const result = getContentPositionInPage(secondPageStart, 1, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
      expect(result).toBe(-HEADER_HEIGHT);
    });
  });

  describe('Custom Dimensions', () => {
    it('should work with custom page dimensions', () => {
      const pageHeight = 500;
      const pageGap = 20;
      const headerHeight = 50;
      // Second page starts at 520, content at 570
      // Position 600 should be 600 - 520 - 50 = 30
      const result = getContentPositionInPage(600, 1, pageHeight, pageGap, headerHeight);
      expect(result).toBe(30);
    });
  });

  describe('Consistency Checks', () => {
    it('should produce consistent results across multiple pages', () => {
      const relativePosition = 200; // Same relative position on each page

      for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
        const pageStart = getPageStartY(pageIndex, PAGE_HEIGHT, PAGE_GAP);
        const globalY = pageStart + HEADER_HEIGHT + relativePosition;
        const result = getContentPositionInPage(globalY, pageIndex, PAGE_HEIGHT, PAGE_GAP, HEADER_HEIGHT);
        expect(result).toBe(relativePosition);
      }
    });
  });
});

describe('Integration Tests', () => {
  describe('Full Page Flow', () => {
    it('should correctly identify page and position for scrolling through document', () => {
      // Simulate scrolling through a 5-page document
      const testPositions = [
        { y: 100, expectedPage: 0 },
        { y: 1000, expectedPage: 0 },
        { y: PAGE_HEIGHT + PAGE_GAP + 100, expectedPage: 1 },
        { y: 2 * (PAGE_HEIGHT + PAGE_GAP) + 500, expectedPage: 2 },
        { y: 4 * (PAGE_HEIGHT + PAGE_GAP) + 800, expectedPage: 4 },
      ];

      for (const { y, expectedPage } of testPositions) {
        const page = getPageAtPosition(y, PAGE_HEIGHT, PAGE_GAP);
        expect(page).toBe(expectedPage);
      }
    });

    it('should allow round-trip from content height to page count and back', () => {
      const contentHeight = 2500;
      const pageCount = calculatePageCount(contentHeight, PAGE_CONTENT_HEIGHT);

      // The total content space available
      const totalContentSpace = pageCount * PAGE_CONTENT_HEIGHT;
      expect(totalContentSpace).toBeGreaterThanOrEqual(contentHeight);
      expect(totalContentSpace - PAGE_CONTENT_HEIGHT).toBeLessThan(contentHeight);
    });
  });

  describe('Document Layout', () => {
    it('should calculate correct total document height for multiple pages', () => {
      const pageCount = 5;
      const lastPageStart = getPageStartY(pageCount - 1, PAGE_HEIGHT, PAGE_GAP);
      const totalHeight = lastPageStart + PAGE_HEIGHT;

      // 4 gaps + 5 pages
      const expectedHeight = 5 * PAGE_HEIGHT + 4 * PAGE_GAP;
      expect(totalHeight).toBe(expectedHeight);
    });
  });
});
