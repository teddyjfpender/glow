/**
 * Internal Link Mark Extension
 * Allows creating Obsidian-style [[wiki-links]] between documents
 */
import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { InternalLinkAttributes } from '$lib/types/links';

export interface InternalLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  /**
   * Callback when a link is Cmd/Ctrl+clicked
   */
  onLinkClick?: (documentId: string | null, title: string) => void;
  /**
   * Callback when hovering over a link
   */
  onLinkHover?: (documentId: string | null, title: string, rect: DOMRect) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    internalLink: {
      /**
       * Apply an internal link mark to the current selection
       */
      setInternalLink: (attrs: InternalLinkAttributes) => ReturnType;
      /**
       * Remove the internal link mark from the current selection
       */
      unsetInternalLink: () => ReturnType;
    };
  }
}

export const internalLinkPluginKey = new PluginKey('internalLink');

export const InternalLinkMark = Mark.create<InternalLinkOptions>({
  name: 'internalLink',

  addOptions() {
    return {
      HTMLAttributes: {},
      onLinkClick: undefined,
      onLinkHover: undefined,
    };
  },

  addAttributes() {
    return {
      documentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-document-id') || null,
        renderHTML: (attributes) => {
          if (!attributes.documentId) return {};
          return {
            'data-document-id': attributes.documentId as string,
          };
        },
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') || '',
        renderHTML: (attributes) => ({
          'data-title': attributes.title as string,
        }),
      },
      displayText: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-display-text') || null,
        renderHTML: (attributes) => {
          if (!attributes.displayText) return {};
          return {
            'data-display-text': attributes.displayText as string,
          };
        },
      },
      anchor: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-anchor') || null,
        renderHTML: (attributes) => {
          if (!attributes.anchor) return {};
          return {
            'data-anchor': attributes.anchor as string,
          };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-resolved') === 'true',
        renderHTML: (attributes) => ({
          'data-resolved': String(attributes.resolved),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-internal-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const resolved = (HTMLAttributes['data-resolved'] ?? 'false') === 'true';
    const className = `internal-link ${resolved ? 'resolved' : 'unresolved'}`;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-internal-link': '',
        class: className,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setInternalLink:
        (attrs: InternalLinkAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },

      unsetInternalLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    const { onLinkClick, onLinkHover } = this.options;

    return [
      new Plugin({
        key: internalLinkPluginKey,
        props: {
          handleDOMEvents: {
            click: (_view, event) => {
              if (!onLinkClick) return false;

              const target = event.target as HTMLElement;

              // Check if we clicked on an internal link span
              const linkElement = target.closest('span[data-internal-link]') as HTMLElement | null;
              if (!linkElement) return false;

              const documentId = linkElement.getAttribute('data-document-id') || null;
              const title = linkElement.getAttribute('data-title') || '';

              event.preventDefault();
              onLinkClick(documentId, title);
              return true;
            },

            mouseover: (_view, event) => {
              if (!onLinkHover) return false;

              const target = event.target as HTMLElement;

              // Check if we're hovering over an internal link span
              const linkElement = target.closest('span[data-internal-link]') as HTMLElement | null;
              if (!linkElement) return false;

              const documentId = linkElement.getAttribute('data-document-id') || null;
              const title = linkElement.getAttribute('data-title') || '';
              const rect = linkElement.getBoundingClientRect();

              onLinkHover(documentId, title, rect);
              return false; // Don't prevent default behavior
            },
          },
        },
      }),
    ];
  },
});

export default InternalLinkMark;
