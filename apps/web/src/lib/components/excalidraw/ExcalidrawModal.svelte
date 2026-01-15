<script lang="ts">
  /**
   * Full-screen modal for editing Excalidraw diagrams
   * Renders as a portal to ensure proper z-index stacking
   */
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import ExcalidrawWrapper from './ExcalidrawWrapper.svelte';
  import { excalidrawState } from '$lib/state/excalidraw.svelte';
  import {
    deserializeScene,
    serializeScene,
    createEmptyScene,
    type ExcalidrawScene,
    type ExcalidrawElement,
    type ExcalidrawAppState,
    type ExcalidrawFiles,
  } from '$lib/editor/extensions/excalidraw-utils';

  interface Props {
    sceneData: string;
    theme?: 'light' | 'dark';
    onsave?: (sceneData: string) => void;
    oncancel?: () => void;
  }

  let { sceneData, theme = 'dark', onsave, oncancel }: Props = $props();

  // Initialize with empty scene - will be updated by effect
  let currentScene = $state<ExcalidrawScene>(createEmptyScene('dark'));
  let isReady = $state(false);
  let portalContainer: HTMLDivElement | null = null;
  let sceneInitialized = false;

  // Initialize and update scene from props
  $effect(() => {
    if (!sceneInitialized || sceneData) {
      const parsed = deserializeScene(sceneData);
      currentScene = parsed || createEmptyScene(theme);
      sceneInitialized = true;
    }
  });

  function handleChange(
    elements: ExcalidrawElement[],
    appState: Partial<ExcalidrawAppState>,
    files: ExcalidrawFiles
  ): void {
    // Ensure collaborators remains a Map
    const collaborators = appState.collaborators instanceof Map
      ? appState.collaborators
      : currentScene.appState.collaborators ?? new Map();

    currentScene = {
      ...currentScene,
      elements,
      appState: {
        ...currentScene.appState,
        ...appState,
        collaborators,
      },
      files,
    };
    excalidrawState.setUnsavedChanges(true);
  }

  function handleSave(): void {
    const serialized = serializeScene(currentScene);
    onsave?.(serialized);
    excalidrawState.closeEditor();
  }

  function handleCancel(): void {
    if (excalidrawState.hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmed) {
        return;
      }
    }
    oncancel?.();
    excalidrawState.closeEditor();
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Escape to close
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleCancel();
    }
    // Cmd/Ctrl + Enter to save
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleSave();
    }
  }

  function handleReady(): void {
    isReady = true;
    excalidrawState.setLoading(false);
  }

  // Create portal container for proper z-index stacking
  onMount(() => {
    if (browser) {
      portalContainer = document.createElement('div');
      portalContainer.className = 'excalidraw-modal-portal';
      portalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        pointer-events: auto;
      `;
      document.body.appendChild(portalContainer);

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
  });

  onDestroy(() => {
    if (portalContainer && portalContainer.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
    }
    // Restore body scroll
    if (browser) {
      document.body.style.overflow = '';
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if browser}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-container">
      <header class="modal-header">
        <h2 id="modal-title">Edit Drawing</h2>
        <div class="header-actions">
          <span class="status-indicator" class:unsaved={excalidrawState.hasUnsavedChanges}>
            {excalidrawState.hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button class="btn btn-secondary" onclick={handleCancel}>
            Cancel
            <kbd>Esc</kbd>
          </button>
          <button class="btn btn-primary" onclick={handleSave}>
            Save
            <kbd>⌘↵</kbd>
          </button>
        </div>
      </header>

      <main class="modal-content">
        {#if !isReady}
          <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <p>Loading Excalidraw...</p>
          </div>
        {/if}
        <ExcalidrawWrapper
          scene={currentScene}
          {theme}
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={false}
          onchange={handleChange}
          onready={handleReady}
        />
      </main>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-container {
    width: 95vw;
    height: 95vh;
    max-width: 1800px;
    background-color: var(--glow-bg-surface, #1a1a2e);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: slideUp 0.25s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background-color: var(--glow-bg-elevated, #252536);
    border-bottom: 1px solid var(--glow-border-subtle, #3a3a4a);
    flex-shrink: 0;
  }

  .modal-header h2 {
    font-size: 18px;
    font-weight: 500;
    color: var(--glow-text-primary, #fff);
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .status-indicator {
    font-size: 13px;
    color: var(--glow-text-tertiary, #888);
    padding: 6px 14px;
    border-radius: 6px;
    background-color: var(--glow-bg-surface, #1a1a2e);
    transition: all 0.2s;
  }

  .status-indicator.unsaved {
    color: var(--glow-accent, #3b82f6);
    background-color: rgba(59, 130, 246, 0.15);
    font-weight: 500;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition:
      background-color 0.2s,
      transform 0.1s,
      box-shadow 0.2s;
  }

  .btn:active {
    transform: scale(0.98);
  }

  .btn-secondary {
    background-color: var(--glow-bg-surface, #1a1a2e);
    color: var(--glow-text-primary, #fff);
    border: 1px solid var(--glow-border-default, #4a4a5a);
  }

  .btn-secondary:hover {
    background-color: var(--glow-bg-elevated, #252536);
    border-color: var(--glow-border-default, #5a5a6a);
  }

  .btn-primary {
    background-color: var(--glow-accent, #3b82f6);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-primary:hover {
    background-color: var(--glow-accent-hover, #2563eb);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .btn kbd {
    font-size: 11px;
    font-family: inherit;
    padding: 3px 8px;
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    opacity: 0.8;
  }

  .modal-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    background-color: var(--glow-bg-elevated, #252536);
    /* Ensure children can use height: 100% */
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background-color: var(--glow-bg-elevated, #252536);
    z-index: 10;
    pointer-events: auto;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--glow-border-subtle, #3a3a4a);
    border-top-color: var(--glow-accent, #3b82f6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-overlay p {
    color: var(--glow-text-secondary, #aaa);
    font-size: 14px;
    margin: 0;
  }
</style>
