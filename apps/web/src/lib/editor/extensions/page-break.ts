/**
 * Page Break Extension
 * Allows inserting manual page breaks in documents for multi-page support
 */
import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Insert a page break at the current cursor position
       */
      insertPageBreak: () => ReturnType;
      /**
       * Delete the page break at the current selection
       */
      deletePageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: false,

  parseHTML() {
    return [
      {
        tag: 'div[data-page-break]',
      },
    ];
  },

  renderHTML() {
    return [
      'div',
      {
        'data-page-break': 'true',
        class: 'page-break-node',
      },
    ];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },

      deletePageBreak:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;

          // Check if we have a node selection and it's a page break
          if (
            selection.node?.type.name === this.name
          ) {
            if (dispatch) {
              const tr = state.tr.deleteSelection();
              dispatch(tr);
            }
            return true;
          }

          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertPageBreak(),
    };
  },
});

export default PageBreak;
