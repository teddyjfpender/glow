<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import Underline from '@tiptap/extension-underline';
  import TextAlign from '@tiptap/extension-text-align';
  import Toolbar from './Toolbar.svelte';
  import { documentState } from '$lib/state/document.svelte';

  let editorElement: HTMLDivElement;
  let editor: Editor | null = $state(null);
  let lastSyncedContent = '';

  // Watch for external content changes (from loading documents)
  $effect(() => {
    const content = documentState.content;
    if (editor && content !== lastSyncedContent) {
      // Only update if the change came from loading, not from typing
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
      lastSyncedContent = content;
    }
  });

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
          placeholder: 'Type something...',
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
      ],
      content: documentState.content,
      editorProps: {
        attributes: {
          class: 'document-content',
        },
      },
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        lastSyncedContent = html;
        documentState.setContent(html);
      },
    });
    lastSyncedContent = documentState.content;
  });

  onDestroy(() => {
    editor?.destroy();
  });
</script>

<div class="document-container">
  <!-- Toolbar -->
  <Toolbar {editor} />

  <!-- Ruler (optional - simplified version) -->
  <div class="ruler">
    <div class="ruler-content">
      {#each Array(17) as _, i}
        <div class="ruler-mark" style="left: {i * 48}px">
          <span class="ruler-number">{i}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Document area with page -->
  <div class="document-area">
    <div class="page">
      <div class="editor" bind:this={editorElement}></div>
    </div>
  </div>
</div>

<style>
  .document-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #525659;
  }

  .ruler {
    height: 24px;
    background-color: var(--glow-bg-surface);
    border-bottom: 1px solid var(--glow-border-subtle);
    display: flex;
    justify-content: center;
    overflow: hidden;
  }

  .ruler-content {
    width: 816px;
    position: relative;
    background-color: var(--glow-bg-elevated);
    margin: 0 auto;
  }

  .ruler-mark {
    position: absolute;
    top: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ruler-mark::after {
    content: '';
    width: 1px;
    height: 8px;
    background-color: var(--glow-text-tertiary);
    margin-top: auto;
  }

  .ruler-number {
    font-size: 9px;
    color: var(--glow-text-tertiary);
    margin-top: 2px;
  }

  .document-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px 40px 60px;
    display: flex;
    justify-content: center;
  }

  .page {
    width: 816px;
    min-height: 1056px;
    background-color: var(--glow-bg-base);
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2);
    padding: 96px 96px 72px;
  }

  .editor {
    min-height: 100%;
  }

  .editor :global(.document-content) {
    outline: none;
    min-height: 100%;
    font-family: var(--glow-font-sans);
    font-size: 11pt;
    line-height: 1.5;
    color: var(--glow-text-primary);
  }

  .editor :global(.document-content p) {
    margin: 0 0 12px 0;
  }

  .editor :global(.document-content h1) {
    font-size: 26pt;
    font-weight: 400;
    margin: 24px 0 12px 0;
    line-height: 1.2;
  }

  .editor :global(.document-content h2) {
    font-size: 18pt;
    font-weight: 400;
    margin: 20px 0 10px 0;
    line-height: 1.3;
  }

  .editor :global(.document-content h3) {
    font-size: 14pt;
    font-weight: 600;
    margin: 16px 0 8px 0;
    line-height: 1.4;
  }

  .editor :global(.document-content ul),
  .editor :global(.document-content ol) {
    margin: 0 0 12px 0;
    padding-left: 24px;
  }

  .editor :global(.document-content li) {
    margin-bottom: 4px;
  }

  .editor :global(.document-content blockquote) {
    border-left: 4px solid var(--glow-border-default);
    margin: 12px 0;
    padding-left: 16px;
    color: var(--glow-text-secondary);
  }

  .editor :global(.document-content code) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .editor :global(.document-content pre) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-surface);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .editor :global(.document-content pre code) {
    background: none;
    padding: 0;
  }

  .editor :global(.document-content hr) {
    border: none;
    border-top: 1px solid var(--glow-border-subtle);
    margin: 24px 0;
  }

  .editor :global(.document-content p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: var(--glow-text-tertiary);
    pointer-events: none;
    float: left;
    height: 0;
  }

  /* Text alignment */
  .editor :global(.document-content [style*='text-align: center']) {
    text-align: center;
  }

  .editor :global(.document-content [style*='text-align: right']) {
    text-align: right;
  }

  .editor :global(.document-content [style*='text-align: justify']) {
    text-align: justify;
  }
</style>
