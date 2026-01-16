/**
 * Comment Mark Extension
 * Allows highlighting text with comment annotations in documents
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

export interface CommentMarkAttributes {
  commentId: string;
  active: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Add a comment mark to the current selection
       */
      setComment: (commentId: string) => ReturnType;
      /**
       * Remove a comment mark with the given ID from the document
       */
      unsetComment: (commentId: string) => ReturnType;
      /**
       * Set active=true for target comment, false for all others
       */
      setActiveComment: (commentId: string) => ReturnType;
      /**
       * Set active=false for all comment marks
       */
      clearActiveComment: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'comment-highlight',
      },
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => ({
          'data-comment-id': attributes.commentId as string,
        }),
      },
      active: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-comment-active') === 'true',
        renderHTML: (attributes) => ({
          'data-comment-active': String(attributes.active),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId, active: false });
        },

      unsetComment:
        (commentId: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let modified = false;

          doc.descendants((node, pos) => {
            if (!node.isText) return true;

            const marks = node.marks.filter(
              (mark) => mark.type.name === this.name && mark.attrs.commentId === commentId,
            );

            if (marks.length > 0) {
              marks.forEach((mark) => {
                tr.removeMark(pos, pos + node.nodeSize, mark);
                modified = true;
              });
            }

            return true;
          });

          if (dispatch && modified) {
            dispatch(tr);
          }

          return modified;
        },

      setActiveComment:
        (commentId: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let modified = false;

          doc.descendants((node, pos) => {
            if (!node.isText) return true;

            node.marks.forEach((mark) => {
              if (mark.type.name === this.name) {
                const isTarget = mark.attrs.commentId === commentId;
                const currentActive = mark.attrs.active as boolean;

                if (isTarget && !currentActive) {
                  // Set this comment as active
                  tr.addMark(
                    pos,
                    pos + node.nodeSize,
                    mark.type.create({ ...mark.attrs, active: true }),
                  );
                  modified = true;
                } else if (!isTarget && currentActive) {
                  // Set other comments as inactive
                  tr.addMark(
                    pos,
                    pos + node.nodeSize,
                    mark.type.create({ ...mark.attrs, active: false }),
                  );
                  modified = true;
                }
              }
            });

            return true;
          });

          if (dispatch && modified) {
            dispatch(tr);
          }

          return modified;
        },

      clearActiveComment:
        () =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let modified = false;

          doc.descendants((node, pos) => {
            if (!node.isText) return true;

            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.active) {
                tr.addMark(
                  pos,
                  pos + node.nodeSize,
                  mark.type.create({ ...mark.attrs, active: false }),
                );
                modified = true;
              }
            });

            return true;
          });

          if (dispatch && modified) {
            dispatch(tr);
          }

          return modified;
        },
    };
  },
});

export default CommentMark;
