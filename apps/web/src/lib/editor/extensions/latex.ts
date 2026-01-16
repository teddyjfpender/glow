/**
 * LaTeX Math Equation Extension
 * Allows inline and block math equations using KaTeX rendering
 */
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { SvelteNodeViewRenderer } from '../svelte-node-view';
import LatexNodeView from '../latex/components/LatexNodeView.svelte';
import type { LatexExtensionOptions } from '../latex/core/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    latex: {
      /**
       * Insert a LaTeX equation
       */
      insertLatex: (options?: { latex?: string; displayMode?: boolean }) => ReturnType;
    };
  }
}

export const LatexExtension = Node.create<LatexExtensionOptions>({
  name: 'latex',

  // Inline node that can appear within text
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: { class: 'latex-node' },
      katexOptions: {
        throwOnError: false,
        strict: false,
        trust: true,
      },
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') ?? '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex as string,
        }),
      },
      displayMode: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-display') === 'true',
        renderHTML: (attributes) => ({
          'data-display': String(attributes.displayMode),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="latex"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'latex',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertLatex:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              latex: options.latex ?? '',
              displayMode: options.displayMode ?? false,
            },
          });
        },
    };
  },

  addInputRules() {
    return [
      // Trigger: \latex followed by space
      new InputRule({
        find: /\\latex\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          tr.insert(range.from, this.type.create({ latex: '', displayMode: false }));
        },
      }),
      // $...$ for inline math
      new InputRule({
        find: /\$([^$]+)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          const { tr } = state;
          tr.delete(range.from, range.to);
          tr.insert(range.from, this.type.create({ latex, displayMode: false }));
        },
      }),
      // $$...$$ for display math
      new InputRule({
        find: /\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          const { tr } = state;
          tr.delete(range.from, range.to);
          tr.insert(range.from, this.type.create({ latex, displayMode: true }));
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-m': () => this.editor.commands.insertLatex(),
    };
  },

  addNodeView() {
    return SvelteNodeViewRenderer(LatexNodeView);
  },
});

export default LatexExtension;
