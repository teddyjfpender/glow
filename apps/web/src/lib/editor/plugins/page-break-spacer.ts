/**
 * Page Break Spacer Plugin
 *
 * This plugin inserts visual spacers at page break positions to create
 * the appearance of discrete pages in a continuous editor.
 *
 * How it works:
 * 1. Measures the editor content height
 * 2. Calculates where page breaks should occur
 * 3. Inserts widget decorations at those positions
 * 4. The spacers push content down, creating visual page separation
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import {
  PAGE_CONTENT_HEIGHT,
  PAGE_GAP,
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
} from '../utils/page-metrics';

export const pageBreakSpacerKey = new PluginKey('pageBreakSpacer');

/**
 * Height of the spacer between pages
 * This accounts for: page gap + next page's header + current page's footer
 */
const SPACER_HEIGHT = PAGE_GAP + HEADER_HEIGHT + FOOTER_HEIGHT;

/**
 * Calculate the content positions where page breaks should occur
 */
function calculatePageBreakPositions(
  view: EditorView,
  contentAreaHeight: number
): number[] {
  const positions: number[] = [];
  const doc = view.state.doc;

  // Track cumulative height
  let currentHeight = 0;
  let currentPageBreakThreshold = contentAreaHeight;

  // Walk through the document to find positions where content exceeds page height
  doc.descendants((node, pos) => {
    try {
      // Get the DOM node for this position
      const domNode = view.nodeDOM(pos);
      if (!domNode || !(domNode instanceof HTMLElement)) return true;

      // Get the bottom of this element relative to the editor
      const coords = view.coordsAtPos(pos);
      const nodeRect = domNode.getBoundingClientRect();
      const editorRect = view.dom.getBoundingClientRect();

      // Calculate the bottom position of this node relative to content start
      const nodeBottom = nodeRect.bottom - editorRect.top + view.dom.scrollTop;

      // If this node's bottom exceeds the current page threshold, add a break before it
      if (nodeBottom > currentPageBreakThreshold && currentHeight < currentPageBreakThreshold) {
        // Find the position just before this node
        positions.push(pos);
        // Move threshold to next page
        currentPageBreakThreshold += contentAreaHeight + SPACER_HEIGHT;
      }

      currentHeight = nodeBottom;
    } catch {
      // Position might be invalid, skip
    }

    return true; // Continue traversal
  });

  return positions;
}

/**
 * Create a spacer widget decoration
 */
function createSpacerWidget(): HTMLElement {
  const spacer = document.createElement('div');
  spacer.className = 'page-break-spacer';
  spacer.style.cssText = `
    height: ${SPACER_HEIGHT}px;
    width: 100%;
    position: relative;
    pointer-events: none;
    user-select: none;
  `;

  // Add visual indicator
  const indicator = document.createElement('div');
  indicator.className = 'page-break-indicator';
  indicator.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 4px 16px;
    font-size: 10px;
    color: var(--glow-text-tertiary, #666);
    background-color: var(--glow-bg-surface, #1a1a1a);
    border: 1px dashed var(--glow-border-default, #333);
    border-radius: 4px;
  `;
  indicator.textContent = 'Page Break';
  spacer.appendChild(indicator);

  return spacer;
}

/**
 * Create the page break spacer plugin
 */
export function createPageBreakSpacerPlugin(
  contentAreaHeight: number = PAGE_CONTENT_HEIGHT
): Plugin {
  let decorations = DecorationSet.empty;
  let lastDocSize = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return new Plugin({
    key: pageBreakSpacerKey,

    state: {
      init() {
        return { positions: [] as number[] };
      },

      apply(tr, value) {
        // Only recalculate if document changed
        if (tr.docChanged) {
          return { positions: [], needsUpdate: true };
        }
        return value;
      },
    },

    view(view) {
      const updateDecorations = () => {
        // Debounce updates to avoid performance issues
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          const docSize = view.state.doc.content.size;

          // Only update if document size changed significantly
          if (Math.abs(docSize - lastDocSize) < 10) {
            return;
          }
          lastDocSize = docSize;

          // Calculate page break positions
          const positions = calculatePageBreakPositions(view, contentAreaHeight);

          // Create decorations
          const newDecorations = positions.map((pos) =>
            Decoration.widget(pos, createSpacerWidget, {
              side: -1, // Place before the position
              key: `page-break-${pos}`,
            })
          );

          decorations = DecorationSet.create(view.state.doc, newDecorations);

          // Force a view update
          view.dispatch(view.state.tr.setMeta('pageBreakSpacerUpdate', true));
        }, 100);
      };

      // Initial update after a short delay to allow DOM to settle
      setTimeout(updateDecorations, 200);

      return {
        update(view, prevState) {
          if (view.state.doc !== prevState.doc) {
            updateDecorations();
          }
        },
        destroy() {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
        },
      };
    },

    props: {
      decorations() {
        return decorations;
      },
    },
  });
}

export default createPageBreakSpacerPlugin;
