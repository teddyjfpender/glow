<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { resolve } from '$app/paths';
  import type { Editor } from '@tiptap/core';
  import Header from '$lib/components/Header.svelte';
  import DocumentPage from '$lib/components/DocumentPage.svelte';
  import { documentState } from '$lib/state/document.svelte';

  const documentId = $derived($page.params.id);
  let editorRef: Editor | null = $state(null);
  let documentPageRef = $state<DocumentPage | null>(null);

  function handleEditorReady(editor: Editor): void {
    editorRef = editor;
  }

  onMount(() => {
    if (documentId) {
      void documentState.load(documentId);
    }
  });

  onDestroy(() => {
    documentState.reset();
  });

  function handleMenuAction(action: string): void {
    switch (action) {
      case 'New':
        window.location.href = resolve('/');
        break;
      case 'Save':
        void documentState.save();
        break;
      case 'Drawing':
        if (editorRef) {
          editorRef.commands.insertExcalidraw();
        }
        break;
      case 'Draw anywhere':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        documentPageRef?.activateDrawAnywhere();
        break;
      case 'Word count':
        alert(`Word count: ${documentState.wordCount.toString()}`);
        break;
      default:
        break;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      void documentState.save();
    }
    // Cmd/Ctrl+Shift+A to activate draw anywhere mode
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'a') {
      event.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      documentPageRef?.activateDrawAnywhere();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  {#if documentState.isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <span>Loading document...</span>
    </div>
  {:else if documentState.error}
    <div class="error-container">
      <svg viewBox="0 0 24 24" class="error-icon">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <h2>Document not found</h2>
      <p>{documentState.error}</p>
      <a href={resolve('/')} class="back-link">Back to home</a>
    </div>
  {:else}
    <Header onMenuAction={handleMenuAction} />
    <DocumentPage bind:this={documentPageRef} onEditorReady={handleEditorReady} />
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background-color: var(--glow-bg-base);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--glow-text-secondary);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--glow-border-subtle);
    border-top-color: var(--glow-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    text-align: center;
  }

  .error-icon {
    width: 64px;
    height: 64px;
    color: #ef4444;
    margin-bottom: 8px;
  }

  .error-container h2 {
    font-size: 24px;
    font-weight: 500;
    color: var(--glow-text-primary);
    margin: 0;
  }

  .error-container p {
    font-size: 14px;
    color: var(--glow-text-secondary);
    margin: 0;
  }

  .back-link {
    margin-top: 16px;
    padding: 10px 24px;
    background-color: var(--glow-accent);
    color: white;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: background-color 0.2s;
  }

  .back-link:hover {
    background-color: var(--glow-accent-hover);
  }
</style>
