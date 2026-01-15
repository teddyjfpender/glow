/**
 * Svelte Node View Renderer for TipTap
 *
 * Bridges TipTap's NodeView API with Svelte 5 components
 */

import type { NodeViewRendererProps } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { SvelteComponent } from 'svelte';
import { mount, unmount } from 'svelte';
import {
  drawingEditorState,
  excalidrawAPIRegistry,
} from '../core/drawing-state.svelte';

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
  domElement.setAttribute('data-drawing-node', '');

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
    const drawingId = attrs.id as string;

    svelteComponent = mount(component, {
      target: domElement,
      props: {
        // Node attributes
        id: drawingId,
        sceneData: attrs.sceneData as string,
        width: attrs.width as number,
        height: attrs.height as number,
        theme: attrs.theme as string,
        version: attrs.version as number,

        // Selection state
        selected: isSelected,

        // Editor reference
        editor,

        // Callbacks
        onupdate: (sceneData: string) => {
          updateAttributes({
            sceneData,
            version: ((attrs.version as number) ?? 0) + 1,
          });
          drawingEditorState.setUnsavedChanges(true);
        },

        ondelete: () => {
          deleteNode();
          drawingEditorState.closeDrawing();
        },

        onfinish: () => {
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (pos !== null && pos !== undefined) {
            const afterPos = pos + currentNode.nodeSize;
            editor.commands.setTextSelection(afterPos);
          }
          editor.commands.focus();
          drawingEditorState.closeDrawing();
        },

        // Additional props
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
      domElement.setAttribute('data-selected', 'true');
      domElement.dispatchEvent(new CustomEvent('nodeselected', { bubbles: false }));

      // Update global state
      const drawingId = currentNode.attrs.id as string;
      drawingEditorState.openDrawing(drawingId);
    },

    deselectNode(): void {
      isSelected = false;
      domElement.setAttribute('data-selected', 'false');
      domElement.dispatchEvent(new CustomEvent('nodedeselected', { bubbles: false }));

      // Update global state
      drawingEditorState.closeDrawing();
    },

    destroy(): void {
      const drawingId = currentNode.attrs.id as string;
      excalidrawAPIRegistry.unregister(drawingId);
      unmountComponent();
    },

    stopEvent(event: Event): boolean {
      // When NOT selected: let ProseMirror handle clicks for selection
      if (!isSelected) {
        return false;
      }

      // When selected: stop interactive events so Excalidraw handles them
      const interactiveEvents = [
        'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
        'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
        'touchstart', 'touchend', 'touchmove', 'touchcancel',
        'pointerdown', 'pointerup', 'pointermove', 'pointercancel',
        'pointerenter', 'pointerleave', 'pointerover', 'pointerout',
        'keydown', 'keyup', 'keypress',
        'input', 'compositionstart', 'compositionend', 'compositionupdate',
        'wheel', 'contextmenu', 'dragstart', 'drag', 'dragend',
        'dragenter', 'dragleave', 'dragover', 'drop',
        'focus', 'blur', 'focusin', 'focusout',
      ];
      return interactiveEvents.includes(event.type);
    },

    ignoreMutation(): boolean {
      return true;
    },
  };
}

/**
 * Factory function to create a Svelte NodeView renderer
 */
export function SvelteNodeViewRenderer(
  component: SvelteComponentType,
  options: Omit<SvelteNodeViewOptions, 'component'> = {}
): (props: NodeViewRendererProps) => SvelteNodeViewInstance {
  return (props: NodeViewRendererProps) => {
    return createSvelteNodeView(component, options, props);
  };
}
