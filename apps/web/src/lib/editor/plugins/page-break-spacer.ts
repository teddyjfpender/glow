/**
 * Page Break Spacer Plugin
 *
 * This plugin inserts visual spacers at page break positions to create
 * proper content flow across pages. Without spacers, content would be
 * hidden behind footer, gap, and header areas.
 *
 * KEY INSIGHT: We compute page breaks in a "content-only" coordinate system
 * (i.e., the editor layout as if there were no spacers), then render the
 * spacers as widget decorations. This avoids the feedback loop where
 * measuring against DOM with spacers causes subsequent breaks to drift.
 *
 * Algorithm:
 * 1. Use coordsAtPos to measure actual Y coordinates
 * 2. Subtract spacer heights above each position to get "content-only" Y
 * 3. Binary search to find positions at page boundary thresholds
 * 4. Create widget decorations at those positions
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import {
  CONTENT_AREA_HEIGHT,
  SPACER_HEIGHT,
} from '../utils/page-metrics';

// Debug mode - set to true to show visual indicators
const DEBUG = false;

// Buffer for line height - we break this much earlier to ensure the last line's
// bottom doesn't extend into the footer zone.
const LINE_HEIGHT_BUFFER = 24;

// Effective content area per page (reduced by line height buffer)
const EFFECTIVE_CONTENT_AREA = CONTENT_AREA_HEIGHT - LINE_HEIGHT_BUFFER; // 924 - 24 = 900px

// The spacer must be larger by the same amount to push content to the correct position
const VISUAL_SPACER_HEIGHT = SPACER_HEIGHT + LINE_HEIGHT_BUFFER; // 164 + 24 = 188px

export const pageBreakSpacerKey = new PluginKey<PageBreakState>('pageBreakSpacer');

interface PageBreakState {
  decorations: DecorationSet;
  positions: number[]; // sorted, unique document positions of spacers
}

/**
 * Remove duplicates and sort an array of numbers
 */
function uniqSorted(nums: number[]): number[] {
  const out: number[] = [];
  let prev: number | null = null;
  for (const n of nums.slice().sort((a, b) => a - b)) {
    if (prev === null || n !== prev) out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Check if two number arrays are equal
 */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Count spacers whose position is <= pos.
 * Uses binary search since spacerPositions is sorted ascending.
 */
function countSpacersBeforeOrAt(pos: number, spacerPositions: number[]): number {
  let lo = 0;
  let hi = spacerPositions.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (spacerPositions[mid] <= pos) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Create a spacer widget DOM element
 */
function createSpacerWidget(index: number): HTMLElement {
  const spacer = document.createElement('div');
  spacer.className = 'pm-page-break-spacer';
  spacer.setAttribute('contenteditable', 'false');
  spacer.setAttribute('aria-hidden', 'true');
  spacer.dataset.pageBreakIndex = String(index);

  if (DEBUG) {
    spacer.dataset.debug = 'true';
  }

  return spacer;
}

/**
 * Get the actual Y coordinate (top) at a document position, relative to editor top
 */
function yActualTopAtPos(view: EditorView, editorTop: number, pos: number): number {
  try {
    const coords = view.coordsAtPos(pos);
    return coords.top - editorTop;
  } catch {
    return 0;
  }
}

/**
 * Get the actual Y coordinate (bottom) at a document position, relative to editor top
 */
function yActualBottomAtPos(view: EditorView, editorTop: number, pos: number): number {
  try {
    const coords = view.coordsAtPos(pos);
    return coords.bottom - editorTop;
  } catch {
    return 0;
  }
}

/**
 * Get the "content-only" Y coordinate at a position.
 * This subtracts the height of all spacers above this position,
 * giving us the Y as if no spacers existed.
 */
function yContentOnlyTopAtPos(
  view: EditorView,
  editorTop: number,
  pos: number,
  currentSpacerPositions: number[]
): number {
  const y = yActualTopAtPos(view, editorTop, pos);
  const k = countSpacersBeforeOrAt(pos, currentSpacerPositions);
  return y - k * VISUAL_SPACER_HEIGHT;
}

/**
 * Get the "content-only" Y coordinate (bottom) at a position.
 */
function yContentOnlyBottomAtPos(
  view: EditorView,
  editorTop: number,
  pos: number,
  currentSpacerPositions: number[]
): number {
  const y = yActualBottomAtPos(view, editorTop, pos);
  const k = countSpacersBeforeOrAt(pos, currentSpacerPositions);
  return y - k * VISUAL_SPACER_HEIGHT;
}

/**
 * Find the smallest document position >= startPos whose content-only Y (top) is >= targetY.
 * Uses binary search, relying on the monotonicity of yContentOnly(pos) w.r.t pos.
 *
 * We use coords.top so that the line at this position, when pushed down by the spacer,
 * lands exactly at the start of the next page's content area.
 */
function findPosAtContentY(
  view: EditorView,
  editorTop: number,
  targetY: number,
  currentSpacerPositions: number[],
  startPos: number,
  endPos: number
): number {
  let lo = Math.max(0, startPos);
  let hi = Math.max(lo, endPos);

  const safeY = (p: number) => {
    try {
      return yContentOnlyTopAtPos(view, editorTop, p, currentSpacerPositions);
    } catch {
      // If coordsAtPos fails, try adjacent position
      const p2 = Math.min(endPos, Math.max(0, p + 1));
      return yContentOnlyTopAtPos(view, editorTop, p2, currentSpacerPositions);
    }
  };

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const y = safeY(mid);
    if (y < targetY) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

/**
 * Build decoration set from spacer positions
 */
function buildDecorations(doc: any, positions: number[]): DecorationSet {
  const decorations = positions.map((pos, i) =>
    Decoration.widget(
      pos,
      () => createSpacerWidget(i + 1),
      {
        // side < 0 draws widget before the cursor at its position
        side: -1,
        // stable identity for diffing
        key: `pm-page-break-spacer-${i}`,
        // helps avoid selection weirdness
        ignoreSelection: true,
      }
    )
  );
  return DecorationSet.create(doc, decorations);
}

/**
 * Compute page break positions using content-only coordinate system.
 *
 * We break LINE_HEIGHT_BUFFER (24px) earlier than the actual content area boundary
 * to ensure the last line's bottom doesn't extend into the footer zone.
 * The spacer is correspondingly larger (188px instead of 164px) to push content
 * to the correct position on the next page.
 *
 *   EFFECTIVE_CONTENT_AREA = CONTENT_AREA_HEIGHT - LINE_HEIGHT_BUFFER = 924 - 24 = 900px
 *   VISUAL_SPACER_HEIGHT = SPACER_HEIGHT + LINE_HEIGHT_BUFFER = 164 + 24 = 188px
 *   targetY(n) = n * EFFECTIVE_CONTENT_AREA = n * 900
 *
 * This ensures:
 * - Last line of each page: bottom < 920 (editor) = 992 (page), before footer at 996
 * - First line of next page: after spacer, top lands at exactly 1088/2176/etc (editor)
 */
function computeBreakPositions(view: EditorView, currentSpacerPositions: number[]): number[] {
  const { doc } = view.state;
  const rect = view.dom.getBoundingClientRect();
  const editorTop = rect.top;

  // Document end position
  const endPos: number = doc.content.size;
  if (endPos <= 0) return [];

  // Get content-only height of the entire document
  const yEndContentOnly = yContentOnlyBottomAtPos(view, editorTop, endPos, currentSpacerPositions);

  // Calculate number of breaks needed based on effective content height per page
  // Use small epsilon to avoid creating an extra blank page spacer at exact boundaries
  const epsilon = 1;
  const numBreaks = Math.floor((yEndContentOnly - epsilon) / EFFECTIVE_CONTENT_AREA);
  if (numBreaks <= 0) return [];

  const positions: number[] = [];
  let searchFrom = 0;

  for (let n = 1; n <= numBreaks; n++) {
    // Target Y in content-only coordinates (editor-relative)
    // Break when a line's TOP reaches the effective content area boundary
    const targetY = n * EFFECTIVE_CONTENT_AREA;

    const pos = findPosAtContentY(
      view,
      editorTop,
      targetY,
      currentSpacerPositions,
      searchFrom,
      endPos
    );

    // Validate position
    if (pos <= 0 || pos >= endPos) break;
    if (positions.length && pos <= positions[positions.length - 1]) break;

    positions.push(pos);
    searchFrom = pos + 1;

    if (DEBUG) {
      const actualY = yContentOnlyTopAtPos(view, editorTop, pos, currentSpacerPositions);
      console.log(
        `[PageBreakSpacer] Break ${n}: targetY=${targetY}, pos=${pos}, actualY=${actualY}`
      );
    }
  }

  return uniqSorted(positions);
}

/**
 * Create the page break spacer plugin
 */
export function createPageBreakSpacerPlugin(): Plugin<PageBreakState> {
  return new Plugin<PageBreakState>({
    key: pageBreakSpacerKey,

    state: {
      init(_, _state): PageBreakState {
        return {
          positions: [],
          decorations: DecorationSet.empty,
        };
      },

      apply(tr, prev, _oldState, newState): PageBreakState {
        // Check for explicit state update via meta
        const meta = tr.getMeta(pageBreakSpacerKey) as PageBreakState | undefined;
        if (meta) {
          return meta;
        }

        // Map existing decorations through the transaction
        // This keeps decorations "close" until next recompute
        const mapped = prev.decorations.map(tr.mapping, tr.doc);
        const mappedPositions = prev.positions
          .map((p) => tr.mapping.map(p, -1))
          .filter((p) => p >= 0 && p <= newState.doc.content.size);

        return {
          positions: uniqSorted(mappedPositions),
          decorations: mapped,
        };
      },
    },

    props: {
      decorations(state) {
        return pageBreakSpacerKey.getState(state)?.decorations ?? null;
      },
    },

    view(view) {
      let rafId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;

      const scheduleUpdate = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          rafId = null;

          // Skip if view isn't in layout yet
          const rect = view.dom.getBoundingClientRect();
          if (rect.height === 0 && rect.width === 0) return;

          const pluginState = pageBreakSpacerKey.getState(view.state);
          const currentPositions = pluginState?.positions ?? [];

          const nextPositions = computeBreakPositions(view, currentPositions);

          // Only dispatch if positions changed
          if (!arraysEqual(nextPositions, currentPositions)) {
            if (DEBUG) {
              console.log(
                `[PageBreakSpacer] Updating: ${currentPositions.length} -> ${nextPositions.length} breaks`,
                nextPositions
              );
            }

            const nextState: PageBreakState = {
              positions: nextPositions,
              decorations: buildDecorations(view.state.doc, nextPositions),
            };
            const tr = view.state.tr.setMeta(pageBreakSpacerKey, nextState);
            view.dispatch(tr);
          }
        });
      };

      // Initial compute
      scheduleUpdate();

      // Recompute on resize (line wrapping changes coordsAtPos results)
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(view.dom);

      return {
        update(view, prevState) {
          // Recompute when document changes
          if (prevState.doc !== view.state.doc) {
            scheduleUpdate();
          }
        },
        destroy() {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
        },
      };
    },
  });
}

export default createPageBreakSpacerPlugin;
