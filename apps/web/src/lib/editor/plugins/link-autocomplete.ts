/**
 * Link Autocomplete Plugin
 *
 * This plugin provides link autocomplete functionality for wiki-style links.
 * It detects when the user types `[[` and tracks the query text that follows,
 * enabling a popup UI to suggest and insert links.
 *
 * Usage:
 * 1. User types `[[` to activate autocomplete
 * 2. Continue typing to filter suggestions (query updates in real-time)
 * 3. Select a suggestion to insert the link
 * 4. Type `]]` or press Escape to close without selecting
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * State interface for the link autocomplete plugin
 */
export interface LinkAutocompleteState {
  /** Whether autocomplete is currently active */
  active: boolean;
  /** The search query (text after `[[`) */
  query: string;
  /** Start position of `[[` in the document */
  from: number;
  /** Current cursor position */
  to: number;
}

/**
 * Plugin key for accessing link autocomplete state
 */
export const linkAutocompletePluginKey = new PluginKey<LinkAutocompleteState>(
  'linkAutocomplete'
);

/**
 * Default inactive state
 */
const INACTIVE_STATE: LinkAutocompleteState = {
  active: false,
  query: '',
  from: 0,
  to: 0,
};

/**
 * The trigger sequence that activates autocomplete
 */
const TRIGGER = '[[';

/**
 * The closing sequence that deactivates autocomplete
 */
const CLOSE_TRIGGER = ']]';

/**
 * Check text before cursor for the trigger sequence and extract query
 * Returns the state if trigger is found, null otherwise
 */
function checkForTrigger(
  state: EditorState
): LinkAutocompleteState | null {
  const { selection, doc } = state;
  const { from } = selection;

  // Only handle cursor (not range) selections
  if (!selection.empty) {
    return null;
  }

  // Get text from start of the current text block to cursor
  const $from = selection.$from;
  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    '\ufffc'
  );

  // Find the last occurrence of `[[`
  const triggerIndex = textBefore.lastIndexOf(TRIGGER);
  if (triggerIndex === -1) {
    return null;
  }

  // Check if there's a closing `]]` after the trigger
  const textAfterTrigger = textBefore.slice(triggerIndex + TRIGGER.length);
  if (textAfterTrigger.includes(CLOSE_TRIGGER)) {
    return null;
  }

  // Check for newlines in the query (shouldn't span multiple lines)
  if (textAfterTrigger.includes('\n')) {
    return null;
  }

  // Calculate document positions
  const blockStart = from - $from.parentOffset;
  const triggerFrom = blockStart + triggerIndex;

  return {
    active: true,
    query: textAfterTrigger,
    from: triggerFrom,
    to: from,
  };
}

/**
 * Get cursor coordinates for positioning the popup
 */
function getCursorCoords(view: EditorView): { x: number; y: number } {
  const { from } = view.state.selection;
  try {
    const coords = view.coordsAtPos(from);
    return {
      x: coords.left,
      y: coords.bottom,
    };
  } catch {
    // Fallback if coordsAtPos fails
    return { x: 0, y: 0 };
  }
}

/**
 * Keyboard event handlers for the autocomplete popup
 */
export interface LinkAutocompleteKeyHandlers {
  onEnter: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
}

/**
 * Creates a link autocomplete plugin that detects `[[` triggers
 * and manages autocomplete state.
 *
 * @param onActivate - Callback when autocomplete activates or updates
 * @param onDeactivate - Callback when autocomplete deactivates
 * @param keyHandlers - Optional keyboard handlers for navigation
 * @returns A ProseMirror plugin
 *
 * @example
 * ```ts
 * const plugin = createLinkAutocompletePlugin(
 *   (state, coords) => {
 *     // Show popup at coords with query from state
 *     showPopup(state.query, coords.x, coords.y);
 *   },
 *   () => {
 *     // Hide popup
 *     hidePopup();
 *   },
 *   {
 *     onEnter: () => selectCurrentItem(),
 *     onArrowUp: () => movePrevious(),
 *     onArrowDown: () => moveNext(),
 *   }
 * );
 * ```
 */
export function createLinkAutocompletePlugin(
  onActivate: (state: LinkAutocompleteState, coords: { x: number; y: number }) => void,
  onDeactivate: () => void,
  keyHandlers?: LinkAutocompleteKeyHandlers
): Plugin<LinkAutocompleteState> {
  return new Plugin<LinkAutocompleteState>({
    key: linkAutocompletePluginKey,

    state: {
      init(): LinkAutocompleteState {
        return INACTIVE_STATE;
      },

      apply(tr: Transaction, prev: LinkAutocompleteState, _oldState: EditorState, newState: EditorState): LinkAutocompleteState {
        // Check for explicit deactivation via meta
        const meta = tr.getMeta(linkAutocompletePluginKey);
        if (meta?.deactivate) {
          return INACTIVE_STATE;
        }

        // Check for trigger and compute new state
        const newPluginState = checkForTrigger(newState);

        if (newPluginState) {
          return newPluginState;
        }

        // No trigger found, deactivate
        return INACTIVE_STATE;
      },
    },

    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        const pluginState = linkAutocompletePluginKey.getState(view.state);

        if (!pluginState?.active) {
          return false;
        }

        // Handle Escape to close autocomplete
        if (event.key === 'Escape') {
          const tr = view.state.tr.setMeta(linkAutocompletePluginKey, { deactivate: true });
          view.dispatch(tr);
          onDeactivate();
          return true;
        }

        // Handle Enter to select current item
        if (event.key === 'Enter' && keyHandlers) {
          event.preventDefault();
          keyHandlers.onEnter();
          return true;
        }

        // Handle ArrowUp for navigation
        if (event.key === 'ArrowUp' && keyHandlers) {
          event.preventDefault();
          keyHandlers.onArrowUp();
          return true;
        }

        // Handle ArrowDown for navigation
        if (event.key === 'ArrowDown' && keyHandlers) {
          event.preventDefault();
          keyHandlers.onArrowDown();
          return true;
        }

        return false;
      },
    },

    view(view: EditorView) {
      let wasActive = false;

      return {
        update(view: EditorView, prevState: EditorState) {
          const prevPluginState = linkAutocompletePluginKey.getState(prevState);
          const currentPluginState = linkAutocompletePluginKey.getState(view.state);

          const wasActiveNow = prevPluginState?.active ?? false;
          const isActiveNow = currentPluginState?.active ?? false;

          // Handle state transitions
          if (isActiveNow) {
            // Autocomplete is active - call onActivate with current state and coords
            const coords = getCursorCoords(view);
            onActivate(currentPluginState!, coords);
            wasActive = true;
          } else if (wasActiveNow && !isActiveNow) {
            // Autocomplete just deactivated
            onDeactivate();
            wasActive = false;
          }
        },

        destroy() {
          // Ensure cleanup on destroy
          if (wasActive) {
            onDeactivate();
          }
        },
      };
    },
  });
}

export default createLinkAutocompletePlugin;
