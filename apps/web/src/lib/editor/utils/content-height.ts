/**
 * Content Height Measurement Utilities
 *
 * Provides functions for measuring content height, calculating page breaks,
 * finding line positions, and adjusting breaks for orphans/widows in the
 * multi-page document feature.
 *
 * All measurements are in pixels.
 */

import type { EditorView } from '@tiptap/pm/view';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Complete measurement of document content for pagination
 */
export interface ContentMeasurement {
  /** Total height of all content in pixels */
  totalHeight: number;
  /** Y positions where pages break */
  pageBreakPositions: number[];
  /** Position information for each line in the document */
  linePositions: LinePosition[];
}

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

// ============================================================================
// Content Height Measurement
// ============================================================================

/**
 * Measure the total height of the editor content.
 *
 * Uses scrollHeight to get the full content height including overflow.
 * This accounts for all block element margins and nested content.
 *
 * @param editorElement - The editor's DOM element containing the content
 * @returns The total content height in pixels
 *
 * @example
 * ```ts
 * const editor = document.querySelector('.ProseMirror');
 * const height = measureContentHeight(editor);
 * console.log(`Content height: ${height}px`);
 * ```
 */
export function measureContentHeight(editorElement: HTMLElement): number {
  if (!editorElement) {
    return 0;
  }

  // scrollHeight gives us the full content height including overflow
  // This already accounts for block element margins due to how browsers calculate it
  const scrollHeight = editorElement.scrollHeight;
  const offsetHeight = editorElement.offsetHeight;

  // Use the larger of the two to ensure we capture all content
  return Math.max(scrollHeight, offsetHeight, 0);
}

// ============================================================================
// Page Break Calculations
// ============================================================================

/**
 * Calculate Y positions where page breaks should occur.
 *
 * Generates automatic page breaks at regular intervals based on page height,
 * and merges in any manual page breaks specified by the user.
 *
 * @param contentHeight - Total height of the content in pixels
 * @param pageContentHeight - Usable content height per page in pixels
 * @param manualBreakPositions - Optional array of Y positions for manual page breaks
 * @returns Sorted array of Y positions where pages should break
 *
 * @example
 * ```ts
 * // Content that needs 3 pages
 * const breaks = calculatePageBreakPositions(2000, 828);
 * // Returns [828, 1656]
 *
 * // With manual break
 * const breaksWithManual = calculatePageBreakPositions(2000, 828, [500]);
 * // Returns [500, 828, 1656]
 * ```
 */
export function calculatePageBreakPositions(
  contentHeight: number,
  pageContentHeight: number,
  manualBreakPositions?: number[]
): number[] {
  // No breaks needed for content that fits on one page
  if (contentHeight <= pageContentHeight) {
    return [];
  }

  const breaks = new Set<number>();

  // Calculate automatic page breaks at regular intervals
  let currentBreak = pageContentHeight;
  while (currentBreak < contentHeight) {
    breaks.add(currentBreak);
    currentBreak += pageContentHeight;
  }

  // Add manual breaks that are within content bounds
  if (manualBreakPositions && manualBreakPositions.length > 0) {
    for (const manualBreak of manualBreakPositions) {
      if (manualBreak > 0 && manualBreak < contentHeight) {
        breaks.add(manualBreak);
      }
    }
  }

  // Convert to sorted array
  return Array.from(breaks).sort((a, b) => a - b);
}

// ============================================================================
// Line Position Detection
// ============================================================================

/**
 * Find the positions and metadata for all lines in the document.
 *
 * Traverses the ProseMirror document and extracts position information
 * for each block-level node (paragraphs, headings, etc.).
 *
 * @param editorView - The ProseMirror EditorView instance
 * @returns Array of LinePosition objects for each line in the document
 *
 * @example
 * ```ts
 * const lines = findLinePositions(editor.view);
 * lines.forEach(line => {
 *   console.log(`Line at ${line.top}px, height ${line.height}px`);
 *   if (line.isHeading) console.log('  (heading)');
 * });
 * ```
 */
export function findLinePositions(editorView: EditorView): LinePosition[] {
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
      return true; // Continue traversing children
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
        height: Math.max(height, 1), // Ensure minimum height of 1
      });
    } catch {
      // Node might not be rendered yet, skip it
    }

    // Don't descend into block nodes (we handle them at the top level)
    return false;
  });

  // Convert node data to line positions with paragraph start/end info
  for (let i = 0; i < nodeData.length; i++) {
    const node = nodeData[i];
    const _prevNode = i > 0 ? nodeData[i - 1] : null;
    const _nextNode = i < nodeData.length - 1 ? nodeData[i + 1] : null;

    // Determine if this is a paragraph start/end
    // For simplicity, we treat each block node as both a start and end
    // (multi-line paragraphs would need text layout analysis)
    const isParagraphStart = true;
    const isParagraphEnd = true;

    // Detect headings
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

// ============================================================================
// Orphan/Widow Adjustment
// ============================================================================

/**
 * Adjust page break positions to prevent orphans and widows.
 *
 * Typography rules:
 * - Orphan: Single line of a paragraph left at the bottom of a page
 * - Widow: Single line of a paragraph left at the top of a page
 * - Headings should have at least 2 lines of content following them
 *
 * This function analyzes the break positions and line positions to make
 * intelligent adjustments that improve readability.
 *
 * @param breakPositions - Initial page break Y positions
 * @param linePositions - Position information for all lines
 * @param pageContentHeight - Usable content height per page
 * @returns Adjusted array of page break positions
 *
 * @example
 * ```ts
 * const initialBreaks = [828, 1656];
 * const lines = findLinePositions(view);
 * const adjustedBreaks = adjustForOrphansWidows(initialBreaks, lines, 828);
 * ```
 */
export function adjustForOrphansWidows(
  breakPositions: number[],
  linePositions: LinePosition[],
  _pageContentHeight: number
): number[] {
  // Nothing to adjust
  if (breakPositions.length === 0) {
    return [];
  }

  if (linePositions.length === 0) {
    return [...breakPositions];
  }

  const adjustedBreaks = [...breakPositions];

  // Process each break position
  for (let breakIndex = 0; breakIndex < adjustedBreaks.length; breakIndex++) {
    const breakPos = adjustedBreaks[breakIndex];

    // Find lines near this break
    const linesBeforeBreak = linePositions.filter(
      (line) => line.top + line.height <= breakPos && line.top >= (breakIndex > 0 ? adjustedBreaks[breakIndex - 1] : 0)
    );

    const linesAfterBreak = linePositions.filter((line) => {
      const nextBreak = breakIndex < adjustedBreaks.length - 1 ? adjustedBreaks[breakIndex + 1] : Infinity;
      return line.top >= breakPos && line.top < nextBreak;
    });

    // Check for orphan: single line at bottom of page
    if (linesBeforeBreak.length > 0) {
      const lastLine = linesBeforeBreak[linesBeforeBreak.length - 1];

      // If last line is a single-line paragraph at the bottom
      if (lastLine.isParagraphStart && lastLine.isParagraphEnd) {
        // Check if there's space issue (line is very close to break)
        const distanceToBreak = breakPos - (lastLine.top + lastLine.height);

        if (distanceToBreak < lastLine.height && linesBeforeBreak.length > 1) {
          // Move break before this line to prevent orphan
          adjustedBreaks[breakIndex] = lastLine.top;
        }
      }
    }

    // Check for widow: single line at top of next page
    if (linesAfterBreak.length > 0) {
      const firstLine = linesAfterBreak[0];
      const _pageStart = breakPos;

      // If first line is a single-line paragraph
      if (firstLine.isParagraphStart && firstLine.isParagraphEnd && linesAfterBreak.length > 1) {
        // Check if we have space on previous page to pull it back
        const lastLineBeforeBreak = linesBeforeBreak[linesBeforeBreak.length - 1];
        if (lastLineBeforeBreak) {
          const spaceOnPrevPage = breakPos - (lastLineBeforeBreak.top + lastLineBeforeBreak.height);

          if (spaceOnPrevPage >= firstLine.height) {
            // Pull widow to previous page by moving break after it
            adjustedBreaks[breakIndex] = firstLine.top + firstLine.height;
          }
        }
      }
    }

    // Check for heading with insufficient following content
    if (linesBeforeBreak.length > 0) {
      const lastLine = linesBeforeBreak[linesBeforeBreak.length - 1];

      if (lastLine.isHeading) {
        // Heading at bottom of page - count lines after it on same page
        const linesAfterHeading = linesBeforeBreak.filter((line) => line.top > lastLine.top);

        if (linesAfterHeading.length < 2) {
          // Move break before heading so it stays with its content
          adjustedBreaks[breakIndex] = lastLine.top;
        }
      } else if (linesBeforeBreak.length >= 2) {
        // Check if there's a heading followed by just 1 line before break
        const secondToLast = linesBeforeBreak[linesBeforeBreak.length - 2];

        if (secondToLast.isHeading) {
          const linesAfterHeading = linesBeforeBreak.filter((line) => line.top > secondToLast.top);

          if (linesAfterHeading.length < 2) {
            // Move break before heading
            adjustedBreaks[breakIndex] = secondToLast.top;
          }
        }
      }
    }
  }

  // Ensure breaks are still valid and sorted
  return adjustedBreaks
    .filter((pos) => pos > 0)
    .sort((a, b) => a - b);
}
