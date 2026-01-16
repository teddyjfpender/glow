/**
 * Excalidraw TipTap Extension
 *
 * Provides a first-class drawing node for Tiptap editors with:
 * - View mode (static preview) when not selected
 * - Edit mode (live Excalidraw) when selected
 * - Anchor system for document positioning
 */

import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  generateDrawingId,
  createEmptyScene,
  serializeScene,
} from '../core/excalidraw-core';
import type {
  ExcalidrawNodeAttrs,
  Theme,
  AnchorType,
  WrapMode,
} from '../core/types';
import { serializeAnchor, createBlockAnchor } from '../anchors/anchor-system';
import { SvelteNodeViewRenderer } from './svelte-node-view-renderer';
import DrawingNodeView from '../components/DrawingNodeView.svelte';

// ============================================================================
// Type Declarations
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidrawNode: {
      /**
       * Insert a new Excalidraw drawing
       */
      insertExcalidraw: (options?: Partial<ExcalidrawNodeAttrs>) => ReturnType;

      /**
       * Update an existing drawing by ID
       */
      updateExcalidraw: (id: string, attrs: Partial<ExcalidrawNodeAttrs>) => ReturnType;

      /**
       * Delete a drawing by ID
       */
      deleteExcalidraw: (id: string) => ReturnType;

      /**
       * Set the theme for a drawing
       */
      setExcalidrawTheme: (id: string, theme: Theme) => ReturnType;
    };
  }
}

// ============================================================================
// Extension Options
// ============================================================================

export interface ExcalidrawNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  defaultWidth: number;
  defaultHeight: number;
  defaultTheme: Theme;
}

// ============================================================================
// Extension Definition
// ============================================================================

export const ExcalidrawNode = Node.create<ExcalidrawNodeOptions>({
  name: 'excalidrawNode',

  group: 'block',

  atom: true,

  draggable: false,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'excalidraw-drawing',
      },
      defaultWidth: 600,
      defaultHeight: 400,
      defaultTheme: 'dark' as Theme,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({
          'data-id': attributes.id as string,
        }),
      },
      sceneData: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-scene') ?? '',
        renderHTML: (attributes) => ({
          'data-scene': attributes.sceneData as string,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('data-width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: (attributes) => ({
          'data-width': String(attributes.width),
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('data-height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => ({
          'data-height': String(attributes.height),
        }),
      },
      theme: {
        default: 'dark',
        parseHTML: (element) => element.getAttribute('data-theme') ?? 'dark',
        renderHTML: (attributes) => ({
          'data-theme': attributes.theme as string,
        }),
      },
      version: {
        default: 1,
        parseHTML: (element) => {
          const version = element.getAttribute('data-version');
          return version ? parseInt(version, 10) : 1;
        },
        renderHTML: (attributes) => ({
          'data-version': String(attributes.version),
        }),
      },
      anchorType: {
        default: 'block',
        parseHTML: (element) => element.getAttribute('data-anchor-type') ?? 'block',
        renderHTML: (attributes) => ({
          'data-anchor-type': attributes.anchorType as string,
        }),
      },
      anchorData: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-anchor-data') ?? '',
        renderHTML: (attributes) => ({
          'data-anchor-data': attributes.anchorData as string,
        }),
      },
      wrapMode: {
        default: 'inline' as WrapMode,
        parseHTML: (element) => (element.getAttribute('data-wrap-mode') ?? 'inline') as WrapMode,
        renderHTML: (attributes) => ({
          'data-wrap-mode': attributes.wrapMode as string,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw-drawing"]',
      },
      // Also support the old format for backwards compatibility
      {
        tag: 'div[data-type="excalidraw"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'excalidraw-drawing',
      }),
      ['div', { class: 'excalidraw-placeholder' }, 'Drawing'],
    ];
  },

  addCommands() {
    return {
      insertExcalidraw:
        (options = {}) =>
        ({ commands, state }) => {
          const id = options.id ?? generateDrawingId();
          const theme = options.theme ?? this.options.defaultTheme;
          const scene = createEmptyScene(theme);
          const sceneData = options.sceneData ?? serializeScene(scene);

          // Create initial anchor at current position
          const pos = state.selection.from;
          const anchor = createBlockAnchor(pos, { x: 0, y: 0 }, id);

          return commands.insertContent({
            type: this.name,
            attrs: {
              id,
              sceneData,
              width: options.width ?? this.options.defaultWidth,
              height: options.height ?? this.options.defaultHeight,
              theme,
              version: options.version ?? 1,
              anchorType: 'block' as AnchorType,
              anchorData: serializeAnchor(anchor),
              wrapMode: options.wrapMode ?? ('inline' as WrapMode),
            },
          });
        },

      updateExcalidraw:
        (id: string, attrs: Partial<ExcalidrawNodeAttrs>) =>
        ({ tr, state, dispatch }) => {
          let updated = false;

          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              if (dispatch) {
                const newAttrs = {
                  ...node.attrs,
                  ...attrs,
                  // Auto-increment version on update
                  version: attrs.version ?? (node.attrs.version as number) + 1,
                };
                tr.setNodeMarkup(pos, undefined, newAttrs);
                updated = true;
              }
              return false;
            }
            return true;
          });

          if (dispatch && updated) {
            dispatch(tr);
          }

          return updated;
        },

      deleteExcalidraw:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          let deleted = false;

          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              if (dispatch) {
                tr.delete(pos, pos + node.nodeSize);
                deleted = true;
              }
              return false;
            }
            return true;
          });

          if (dispatch && deleted) {
            dispatch(tr);
          }

          return deleted;
        },

      setExcalidrawTheme:
        (id: string, theme: Theme) =>
        ({ commands }) => {
          return commands.updateExcalidraw(id, { theme });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.insertExcalidraw(),
      'Mod-Shift-D': () => this.editor.commands.insertExcalidraw(),
    };
  },

  addNodeView() {
    return SvelteNodeViewRenderer(DrawingNodeView);
  },
});

export default ExcalidrawNode;
