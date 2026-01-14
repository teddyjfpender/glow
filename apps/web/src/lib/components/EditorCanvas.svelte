<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import FloatingToolbar from './FloatingToolbar.svelte';
  import StatusBar from './StatusBar.svelte';
  import { documentState } from '$lib/state/document.svelte';

  let editorElement: HTMLDivElement;
  let editor: Editor | null = $state(null);
  let showToolbar = $state(false);
  let toolbarPosition = $state({ x: 0, y: 0 });

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Placeholder.configure({
          placeholder: 'Start writing...',
        }),
      ],
      content: documentState.content,
      editorProps: {
        attributes: {
          class: 'prose',
        },
      },
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        documentState.setContent(html);
      },
      onSelectionUpdate: ({ editor: e }) => {
        const { from, to } = e.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
          // Calculate toolbar position
          const { view } = e;
          const start = view.coordsAtPos(from);
          const end = view.coordsAtPos(to);

          toolbarPosition = {
            x: (start.left + end.left) / 2,
            y: start.top - 48,
          };
          showToolbar = true;
        } else {
          showToolbar = false;
        }
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
  });

  function handleCommand(command: string): void {
    if (editor === null) {
      return;
    }

    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      default:
        break;
    }
  }

  function isActive(command: string): boolean {
    if (editor === null) {
      return false;
    }

    switch (command) {
      case 'bold':
        return editor.isActive('bold');
      case 'italic':
        return editor.isActive('italic');
      case 'strike':
        return editor.isActive('strike');
      case 'code':
        return editor.isActive('code');
      default:
        return false;
    }
  }
</script>

<main class="canvas">
  <div class="editor-container">
    <div class="editor" bind:this={editorElement}></div>
  </div>

  {#if showToolbar && editor !== null}
    <FloatingToolbar position={toolbarPosition} onCommand={handleCommand} {isActive} />
  {/if}

  <StatusBar wordCount={documentState.wordCount} />
</main>

<style>
  .canvas {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--glow-bg-editor);
    overflow: hidden;
    position: relative;
  }

  .editor-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    justify-content: center;
    padding: 80px 48px 120px;
  }

  .editor {
    width: 100%;
    max-width: var(--glow-content-max-width);
    min-height: 100%;
  }

  .editor :global(.ProseMirror) {
    outline: none;
    min-height: 100%;
  }

  .editor :global(.ProseMirror p) {
    margin-bottom: 1em;
    line-height: 1.6;
  }

  .editor :global(.ProseMirror h1) {
    font-size: 2rem;
    font-weight: 700;
    margin-top: 2em;
    margin-bottom: 0.5em;
    letter-spacing: -0.02em;
  }

  .editor :global(.ProseMirror h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    letter-spacing: -0.015em;
  }

  .editor :global(.ProseMirror h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
  }

  .editor :global(.ProseMirror ul),
  .editor :global(.ProseMirror ol) {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }

  .editor :global(.ProseMirror li) {
    margin-bottom: 0.25em;
  }

  .editor :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--glow-border-default);
    margin: 1em 0;
    padding-left: 1em;
    color: var(--glow-text-secondary);
  }

  .editor :global(.ProseMirror code) {
    font-family: var(--glow-font-mono);
    font-size: 0.9em;
    background-color: var(--glow-bg-elevated);
    padding: 0.125em 0.375em;
    border-radius: 4px;
  }

  .editor :global(.ProseMirror pre) {
    font-family: var(--glow-font-mono);
    background-color: var(--glow-bg-surface);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
  }

  .editor :global(.ProseMirror pre code) {
    background: none;
    padding: 0;
  }

  .editor :global(.ProseMirror hr) {
    border: none;
    border-top: 1px solid var(--glow-border-subtle);
    margin: 2em 0;
  }

  .editor :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: var(--glow-text-tertiary);
    pointer-events: none;
    float: left;
    height: 0;
  }
</style>
