/**
 * Page Metrics Utility Module
 *
 * Provides constants and utility functions for calculating page dimensions,
 * positions, and layout for the multi-page document feature.
 *
 * All measurements are in pixels, based on US Letter size (8.5" x 11") at 96 DPI.
 */

// ============================================================================
// Page Dimension Constants
// ============================================================================

/**
 * Page width in pixels (8.5 inches at 96 DPI)
 */
export const PAGE_WIDTH = 816;

/**
 * Page height in pixels (11 inches at 96 DPI)
 */
export const PAGE_HEIGHT = 1056;

// ============================================================================
// Page Margin Constants
// ============================================================================

/**
 * Top margin in pixels (1 inch)
 */
export const PAGE_MARGIN_TOP = 96;

/**
 * Bottom margin in pixels (0.75 inch)
 */
export const PAGE_MARGIN_BOTTOM = 72;

/**
 * Horizontal margins (left and right) in pixels (1 inch each)
 */
export const PAGE_MARGIN_HORIZONTAL = 96;

// ============================================================================
// Page Layout Constants
// ============================================================================

/**
 * Gap between pages in pixels
 */
export const PAGE_GAP = 32;

/**
 * Header area height in pixels
 */
export const HEADER_HEIGHT = 72;

/**
 * Footer area height in pixels
 */
export const FOOTER_HEIGHT = 60;

/**
 * Usable content height per page in pixels (printable area)
 * Calculated as: PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT
 * = 1056 - 96 - 72 - 60 = 828
 */
export const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT;

/**
 * Content area height per page (between header and footer overlays)
 * This is the visible content area on screen, not the printable area.
 * Calculated as: PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT = 1056 - 72 - 60 = 924px
 */
export const CONTENT_AREA_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

/**
 * Spacer height between pages (for page break spacer plugin)
 * This accounts for: current page's footer + gap + next page's header
 * Content needs to skip over this zone when crossing page boundaries.
 * Calculated as: FOOTER_HEIGHT + PAGE_GAP + HEADER_HEIGHT = 60 + 32 + 72 = 164px
 */
export const SPACER_HEIGHT = FOOTER_HEIGHT + PAGE_GAP + HEADER_HEIGHT;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the number of pages needed to fit the given content height.
 *
 * @param contentHeight - The total height of the content in pixels
 * @param pageContentHeight - The usable content height per page in pixels
 * @returns The number of pages needed (minimum 1)
 *
 * @example
 * ```ts
 * // Content that fits on one page
 * calculatePageCount(500, 828) // returns 1
 *
 * // Content that needs two pages
 * calculatePageCount(1200, 828) // returns 2
 * ```
 */
export function calculatePageCount(contentHeight: number, pageContentHeight: number): number {
  if (contentHeight <= 0) {
    return 1;
  }
  return Math.ceil(contentHeight / pageContentHeight);
}

/**
 * Get the page index (0-based) for a given Y position in the document.
 *
 * This function accounts for the gap between pages. Positions within
 * the gap are considered to belong to the previous page.
 *
 * @param yPosition - The Y coordinate in the document (in pixels)
 * @param pageHeight - The height of each page in pixels
 * @param pageGap - The gap between pages in pixels
 * @returns The 0-based page index
 *
 * @example
 * ```ts
 * // Position on first page
 * getPageAtPosition(500, 1056, 32) // returns 0
 *
 * // Position on second page
 * getPageAtPosition(1200, 1056, 32) // returns 1
 * ```
 */
export function getPageAtPosition(yPosition: number, pageHeight: number, pageGap: number): number {
  if (yPosition < 0) {
    return 0;
  }

  const totalPageUnit = pageHeight + pageGap;
  const pageIndex = Math.floor(yPosition / totalPageUnit);

  // Check if position is within a page or in the gap
  const positionInUnit = yPosition % totalPageUnit;

  // If position is within the page (not in gap), return current page index
  // If position is in the gap, it's still considered part of the previous page
  if (positionInUnit >= pageHeight) {
    // Position is in the gap, belongs to current page index
    return pageIndex;
  }

  return pageIndex;
}

/**
 * Get the Y coordinate where a specific page starts in the document.
 *
 * @param pageIndex - The 0-based page index
 * @param pageHeight - The height of each page in pixels
 * @param pageGap - The gap between pages in pixels
 * @returns The Y coordinate where the page starts (in pixels)
 *
 * @example
 * ```ts
 * // First page starts at 0
 * getPageStartY(0, 1056, 32) // returns 0
 *
 * // Second page starts after first page + gap
 * getPageStartY(1, 1056, 32) // returns 1088
 * ```
 */
export function getPageStartY(pageIndex: number, pageHeight: number, pageGap: number): number {
  if (pageIndex < 0) {
    return 0;
  }
  return pageIndex * (pageHeight + pageGap);
}

/**
 * Convert a global Y position to a position relative to the content area
 * within a specific page.
 *
 * The content position accounts for the header area, so position 0 represents
 * the start of the actual content area (after the header).
 *
 * @param globalY - The global Y coordinate in the document (in pixels)
 * @param pageIndex - The 0-based page index
 * @param pageHeight - The height of each page in pixels
 * @param pageGap - The gap between pages in pixels
 * @param headerHeight - The height of the header area in pixels
 * @returns The Y position relative to the content area of the page
 *          (can be negative if position is in header area)
 *
 * @example
 * ```ts
 * // Position 200 on first page with 72px header
 * // Content position = 200 - 0 - 72 = 128
 * getContentPositionInPage(200, 0, 1056, 32, 72) // returns 128
 *
 * // Position in header area returns negative
 * getContentPositionInPage(50, 0, 1056, 32, 72) // returns -22
 * ```
 */
export function getContentPositionInPage(
  globalY: number,
  pageIndex: number,
  pageHeight: number,
  pageGap: number,
  headerHeight: number
): number {
  const pageStartY = getPageStartY(pageIndex, pageHeight, pageGap);
  const positionInPage = globalY - pageStartY;
  return positionInPage - headerHeight;
}
