/**
 * Svelte Node View Renderer for TipTap
 * Bridges TipTap's React-centric NodeView API with Svelte components
 */
import type { NodeViewRendererProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { SvelteComponent } from 'svelte';
import { mount, unmount } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SvelteComponentType = any;

export interface SvelteNodeViewOptions {
  component: SvelteComponentType;
  props?: Record<string, unknown>;
  as?: string;
}

interface SvelteNodeViewInstance {
  dom: HTMLElement;
  contentDOM: HTMLElement | null;
  update: (node: ProseMirrorNode) => boolean;
  selectNode: () => void;
  deselectNode: () => void;
  destroy: () => void;
  stopEvent: (event: Event) => boolean;
  ignoreMutation: () => boolean;
}

/**
 * Creates a Svelte-based NodeView for TipTap
 */
function createSvelteNodeView(
  component: SvelteComponentType,
  options: Omit<SvelteNodeViewOptions, 'component'>,
  props: NodeViewRendererProps
): SvelteNodeViewInstance {
  const { node: initialNode, editor, getPos } = props;

  let currentNode = initialNode;
  let svelteComponent: Record<string, unknown> | null = null;
  let isSelected = false;

  const domElement = document.createElement(options.as ?? 'div');
  domElement.setAttribute('data-node-view-wrapper', '');

  function updateAttributes(attrs: Record<string, unknown>): void {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos === null || pos === undefined) return;

    const { tr } = editor.state;
    tr.setNodeMarkup(pos, undefined, {
      ...currentNode.attrs,
      ...attrs,
    });
    editor.view.dispatch(tr);
  }

  function deleteNode(): void {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos === null || pos === undefined) return;

    const { tr } = editor.state;
    tr.delete(pos, pos + currentNode.nodeSize);
    editor.view.dispatch(tr);
  }

  function mountComponent(): void {
    const attrs = currentNode.attrs as Record<string, unknown>;

    svelteComponent = mount(component, {
      target: domElement,
      props: {
        // Spread node attributes
        ...attrs,
        // Selection state
        selected: isSelected,
        // Event handlers
        onupdate: (sceneData: string, width?: number, height?: number) => {
          const updates: Record<string, unknown> = {
            sceneData,
            version: ((attrs.version as number) ?? 0) + 1,
          };
          if (width !== undefined) updates.width = width;
          if (height !== undefined) updates.height = height;
          updateAttributes(updates);
        },
        ondelete: () => {
          deleteNode();
        },
        // Callback to finish editing and deselect
        onfinish: () => {
          // Move selection to after the node to deselect it
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (pos !== null && pos !== undefined) {
            // Set text selection to position after the node
            const afterPos = pos + currentNode.nodeSize;
            editor.commands.setTextSelection(afterPos);
          }
          editor.commands.focus();
        },
        // Additional custom props
        ...options.props,
      },
    });
  }

  function unmountComponent(): void {
    if (svelteComponent) {
      unmount(svelteComponent as SvelteComponent);
      svelteComponent = null;
    }
  }

  // Initial mount
  mountComponent();

  return {
    dom: domElement,
    contentDOM: null,

    update(node: ProseMirrorNode): boolean {
      if (node.type !== currentNode.type) {
        return false;
      }

      currentNode = node;
      unmountComponent();
      mountComponent();
      return true;
    },

    selectNode(): void {
      isSelected = true;
      // Update the DOM element attribute - component watches this
      domElement.setAttribute('data-selected', 'true');
      // Dispatch a custom event that the component can listen to
      domElement.dispatchEvent(new CustomEvent('nodeselected', { bubbles: false }));
    },

    deselectNode(): void {
      isSelected = false;
      domElement.setAttribute('data-selected', 'false');
      // Dispatch a custom event that the component can listen to
      domElement.dispatchEvent(new CustomEvent('nodedeselected', { bubbles: false }));
    },

    destroy(): void {
      unmountComponent();
    },

    // Control which events ProseMirror handles vs passes to component
    stopEvent(event: Event): boolean {
      // When NOT selected: let ProseMirror handle clicks for node selection
      // When selected: stop ALL events so Excalidraw can handle them
      if (!isSelected) {
        // Let ProseMirror handle the event (returns false = don't stop)
        return false;
      }

      // When selected, stop ALL events so they reach Excalidraw
      // This includes keyboard events for typing text labels
      const interactiveEvents = [
        // Mouse events
        'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
        'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
        // Touch events
        'touchstart', 'touchend', 'touchmove', 'touchcancel',
        // Pointer events
        'pointerdown', 'pointerup', 'pointermove', 'pointercancel',
        'pointerenter', 'pointerleave', 'pointerover', 'pointerout',
        // Keyboard events - critical for typing in Excalidraw
        'keydown', 'keyup', 'keypress',
        // Input events
        'input', 'compositionstart', 'compositionend', 'compositionupdate',
        // Other interactive events
        'wheel', 'contextmenu', 'dragstart', 'drag', 'dragend',
        'dragenter', 'dragleave', 'dragover', 'drop',
        'focus', 'blur', 'focusin', 'focusout',
      ];
      return interactiveEvents.includes(event.type);
    },

    // Prevent ProseMirror from interfering with DOM changes
    ignoreMutation(): boolean {
      return true;
    },
  };
}

/**
 * Factory function to create a Svelte NodeView renderer for TipTap
 */
export function SvelteNodeViewRenderer(
  component: SvelteComponentType,
  options: Omit<SvelteNodeViewOptions, 'component'> = {}
): (props: NodeViewRendererProps) => SvelteNodeViewInstance {
  return (props: NodeViewRendererProps) => {
    return createSvelteNodeView(component, options, props);
  };
}
