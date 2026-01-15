/**
 * Excalidraw TipTap Extension
 * Allows embedding interactive Excalidraw diagrams in documents
 */
import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  generateDiagramId,
  serializeScene,
  createEmptyScene,
} from './excalidraw-utils';
import { SvelteNodeViewRenderer } from '../svelte-node-view';
import ExcalidrawNodeView from '$lib/components/excalidraw/ExcalidrawNodeView.svelte';

export interface ExcalidrawNodeAttrs {
  id: string;
  sceneData: string;
  width: number;
  height: number;
  theme: 'light' | 'dark';
  version: number;
}

export interface ExcalidrawOptions {
  HTMLAttributes: Record<string, unknown>;
  defaultWidth: number;
  defaultHeight: number;
  defaultTheme: 'light' | 'dark';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidraw: {
      /**
       * Insert a new Excalidraw diagram
       */
      insertExcalidraw: (options?: Partial<ExcalidrawNodeAttrs>) => ReturnType;
      /**
       * Update an existing Excalidraw diagram by id
       */
      updateExcalidraw: (id: string, attrs: Partial<ExcalidrawNodeAttrs>) => ReturnType;
    };
  }
}

export const ExcalidrawExtension = Node.create<ExcalidrawOptions>({
  name: 'excalidraw',

  group: 'block',

  atom: true,

  // Disable draggable to prevent interference with internal interactions
  draggable: false,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'excalidraw-node',
      },
      defaultWidth: 600,
      defaultHeight: 400,
      defaultTheme: 'dark' as const,
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
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'excalidraw',
      }),
      // Placeholder content for non-JS rendering
      ['div', { class: 'excalidraw-placeholder' }, 'Drawing'],
    ];
  },

  addCommands() {
    return {
      insertExcalidraw:
        (options = {}) =>
        ({ commands }) => {
          const id = options.id ?? generateDiagramId();
          const scene = createEmptyScene(options.theme ?? this.options.defaultTheme);
          const sceneData = options.sceneData ?? serializeScene(scene);

          return commands.insertContent({
            type: this.name,
            attrs: {
              id,
              sceneData,
              width: options.width ?? this.options.defaultWidth,
              height: options.height ?? this.options.defaultHeight,
              theme: options.theme ?? this.options.defaultTheme,
              version: options.version ?? 1,
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
                const newAttrs = { ...node.attrs, ...attrs };
                tr.setNodeMarkup(pos, undefined, newAttrs);
                updated = true;
              }
              return false; // Stop iteration
            }
            return true;
          });

          if (dispatch && updated) {
            dispatch(tr);
          }

          return updated;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.insertExcalidraw(),
    };
  },

  addNodeView() {
    return SvelteNodeViewRenderer(ExcalidrawNodeView);
  },
});

export default ExcalidrawExtension;
