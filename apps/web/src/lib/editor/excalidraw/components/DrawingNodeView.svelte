<script lang="ts">
  /**
   * Drawing Node View Component
   *
   * Renders an Excalidraw drawing inline in the editor.
   * Shows static preview in view mode, live editor in edit mode.
   */
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import type { Editor } from '@tiptap/core';
  import {
    ExcalidrawCore,
    deserializeScene,
    serializeScene,
    createEmptyScene,
    generatePreviewSvg,
  } from '../core/excalidraw-core';
  import type { ExcalidrawScene, Theme, ExcalidrawAPI, ExcalidrawChangeEvent } from '../core/types';
  import {
    drawingEditorState,
    excalidrawAPIRegistry,
    syncExcalidrawToTool,
  } from '../core/drawing-state.svelte';
  import type { ExcalidrawElement } from '../core/types';

  // ============================================================================
  // Props
  // ============================================================================

  interface Props {
    id: string;
    sceneData: string;
    width: number;
    height: number;
    theme?: Theme;
    version?: number;
    selected?: boolean;
    editor?: Editor;
    onupdate?: (sceneData: string) => void;
    ondelete?: () => void;
    onfinish?: () => void;
  }

  const {
    id,
    sceneData,
    width,
    height,
    theme = 'dark',
    selected: initialSelected = false,
    editor,
    onupdate,
    ondelete,
    onfinish,
  }: Props = $props();

  // ============================================================================
  // State
  // ============================================================================

  let containerRef = $state<HTMLDivElement | null>(null);
  let editorContainerRef = $state<HTMLDivElement | null>(null);
  let isSelected = $state(false);
  let currentScene = $state<ExcalidrawScene>(createEmptyScene('dark'));
  let hasUnsavedChanges = $state(false);
  let sceneInitialized = false;
  let selectionInitialized = false;

  // Initialize state from props on mount (run once)
  $effect(() => {
    if (!sceneInitialized && sceneData) {
      sceneInitialized = true;
      const parsed = deserializeScene(sceneData);
      if (parsed) {
        currentScene = parsed;
      } else {
        currentScene = createEmptyScene(theme);
      }
    }
  });

  // Sync initial selected state (run once)
  $effect(() => {
    if (!selectionInitialized && initialSelected !== undefined) {
      selectionInitialized = true;
      isSelected = initialSelected;
    }
  });
  let isReady = $state(false);
  let previewSvg = $state<string | null>(null);

  let excalidrawCore: ExcalidrawCore | null = null;

  // Computed
  const hasContent = $derived(
    currentScene.elements.filter((el: ExcalidrawElement) => !el.isDeleted).length > 0
  );
  const showEditor = $derived(isSelected);
  const showPreview = $derived(!isSelected && hasContent);
  const showEmpty = $derived(!isSelected && !hasContent);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMount(() => {
    if (!browser) return;

    // Watch for selection changes via attribute
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-selected') {
          const wrapper = containerRef?.closest('[data-node-view-wrapper]');
          if (wrapper) {
            const newSelected = wrapper.getAttribute('data-selected') === 'true';
            if (!newSelected && isSelected && hasUnsavedChanges) {
              saveChanges();
            }
            isSelected = newSelected;

            if (newSelected && !excalidrawCore) {
              initializeExcalidraw();
            }
          }
        }
      }
    });

    const wrapper = containerRef?.closest('[data-node-view-wrapper]');
    if (wrapper) {
      observer.observe(wrapper, { attributes: true, attributeFilter: ['data-selected'] });
      isSelected = wrapper.getAttribute('data-selected') === 'true';

      if (isSelected) {
        initializeExcalidraw();
      }
    }

    // Generate initial preview
    generatePreview();

    return () => {
      observer.disconnect();
      destroyExcalidraw();
    };
  });

  onDestroy(() => {
    destroyExcalidraw();
  });

  // ============================================================================
  // Excalidraw Management
  // ============================================================================

  async function initializeExcalidraw(): Promise<void> {
    if (!browser || !editorContainerRef || excalidrawCore) return;

    excalidrawCore = new ExcalidrawCore(editorContainerRef, {
      scene: currentScene,
      theme,
      viewModeEnabled: false,
      zenModeEnabled: true,
      onChange: handleChange,
      onReady: handleReady,
    });

    await excalidrawCore.initialize();
  }

  function destroyExcalidraw(): void {
    if (excalidrawCore) {
      excalidrawCore.destroy();
      excalidrawCore = null;
    }
    excalidrawAPIRegistry.unregister(id);
  }

  function handleReady(api: ExcalidrawAPI): void {
    isReady = true;
    excalidrawAPIRegistry.register(id, api);
    drawingEditorState.setLoading(false);
    syncExcalidrawToTool();
  }

  function handleChange(event: ExcalidrawChangeEvent): void {
    currentScene = {
      ...currentScene,
      elements: event.elements,
      appState: {
        ...currentScene.appState,
        ...event.appState,
      },
      files: event.files,
    };
    hasUnsavedChanges = true;
    drawingEditorState.setUnsavedChanges(true);
  }

  // ============================================================================
  // Preview Generation
  // ============================================================================

  async function generatePreview(): Promise<void> {
    if (!browser || !hasContent) {
      previewSvg = null;
      return;
    }

    try {
      const svg = await generatePreviewSvg(currentScene, { theme, padding: 16 });
      if (svg) {
        previewSvg = svg.outerHTML;
      }
    } catch (error) {
      console.error('[DrawingNodeView] Failed to generate preview:', error);
      previewSvg = null;
    }
  }

  // Regenerate preview when scene changes
  $effect(() => {
    if (!isSelected && hasContent) {
      generatePreview();
    }
  });

  // ============================================================================
  // Actions
  // ============================================================================

  function saveChanges(): void {
    if (!hasUnsavedChanges) return;

    const serialized = serializeScene(currentScene);
    onupdate?.(serialized);
    hasUnsavedChanges = false;
    drawingEditorState.setUnsavedChanges(false);
    generatePreview();
  }

  function saveAndClose(): void {
    saveChanges();
    onfinish?.();
  }

  function handleDelete(): void {
    if (confirm('Are you sure you want to delete this drawing?')) {
      ondelete?.();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!isSelected) return;

    // Cmd/Ctrl + S to save and close
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      saveAndClose();
    }

    // Escape to finish
    if (event.key === 'Escape') {
      event.preventDefault();
      saveAndClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={containerRef}
  class="drawing-node-view"
  class:selected={isSelected}
  class:editing={isSelected}
  class:empty={showEmpty}
  style="min-height: {isSelected ? Math.max(height, 400) : Math.max(height, 150)}px;"
>
  {#if browser}
    <!-- Editor Container (only rendered when selected) -->
    {#if showEditor}
      <div
        bind:this={editorContainerRef}
        class="excalidraw-editor-container"
        style="height: {Math.max(height, 400)}px;"
      >
        {#if !isReady}
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading drawing editor...</span>
          </div>
        {/if}
      </div>

      <!-- Status Bar -->
      <div class="status-bar">
        <span class="status-text">
          {hasUnsavedChanges ? 'Editing...' : 'Saved'}
        </span>
        <div class="status-actions">
          <button class="btn btn-primary" onclick={saveAndClose}>
            Done
          </button>
          <button class="btn btn-danger" onclick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    {/if}

    <!-- Preview (when not selected and has content) -->
    {#if showPreview && previewSvg}
      <div class="preview-container">
        {@html previewSvg}
      </div>
    {/if}

    <!-- Empty State -->
    {#if showEmpty}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" class="empty-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2" />
          <path d="M12 8 L12 16 M8 12 L16 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span>Click to add drawing</span>
      </div>
    {/if}
  {/if}

  <!-- Selection Ring -->
  {#if isSelected}
    <div class="selection-ring"></div>
  {/if}
</div>

<style>
  .drawing-node-view {
    position: relative;
    background-color: transparent;
    border: 1px solid var(--glow-border-subtle, #3a3a4a);
    border-radius: 12px;
    cursor: default;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      min-height 0.3s ease;
    margin: 16px 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .drawing-node-view:hover {
    border-color: var(--glow-border-default, #4a4a5a);
  }

  .drawing-node-view.selected,
  .drawing-node-view.editing {
    border-color: var(--glow-accent, #3b82f6);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .drawing-node-view.empty {
    border-style: dashed;
    cursor: pointer;
    align-items: center;
    justify-content: center;
  }

  .drawing-node-view.empty:hover {
    background-color: var(--glow-bg-elevated, #252536);
    border-style: solid;
  }

  /* Editor Container */
  .excalidraw-editor-container {
    flex: 1;
    position: relative;
    min-height: 350px;
    overflow: hidden;
    border-radius: 10px 10px 0 0;
  }

  /* Preview Container */
  .preview-container {
    flex: 1;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .preview-container :global(svg) {
    max-width: 100%;
    max-height: 100%;
    height: auto;
  }

  /* Status Bar */
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: var(--glow-bg-elevated, #252536);
    border-top: 1px solid var(--glow-border-subtle, #3a3a4a);
    border-radius: 0 0 10px 10px;
  }

  .status-text {
    font-size: 13px;
    color: var(--glow-text-secondary, #a0a0b0);
  }

  .status-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid var(--glow-border-default, #3a3a4a);
    background-color: var(--glow-bg-surface, #1e1e2e);
    color: var(--glow-text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn:hover {
    background-color: var(--glow-bg-elevated, #252536);
  }

  .btn-primary {
    background-color: var(--glow-accent, #3b82f6);
    border-color: var(--glow-accent, #3b82f6);
    color: white;
  }

  .btn-primary:hover {
    background-color: #2563eb;
  }

  .btn-danger:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: #ef4444;
  }

  /* Empty State */
  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--glow-text-tertiary, #707080);
    padding: 40px;
    transition: color 0.2s;
  }

  .drawing-node-view.empty:hover .empty-state {
    color: var(--glow-text-secondary, #a0a0b0);
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .drawing-node-view.empty:hover .empty-icon {
    opacity: 0.8;
  }

  .empty-state span {
    font-size: 14px;
  }

  /* Loading State */
  .loading-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--glow-text-secondary, #a0a0b0);
    background-color: var(--glow-bg-elevated, #252536);
  }

  .spinner {
    width: 32px;
    height: 32px;
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

  /* Selection Ring */
  .selection-ring {
    position: absolute;
    inset: -4px;
    border: 2px solid var(--glow-accent, #3b82f6);
    border-radius: 14px;
    pointer-events: none;
    opacity: 0.4;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.6;
    }
  }
</style>
