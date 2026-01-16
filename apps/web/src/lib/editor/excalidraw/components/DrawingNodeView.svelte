<script lang="ts">
  /**
   * Drawing Node View Component
   *
   * Renders an Excalidraw drawing inline in the editor.
   * Google Docs-style interaction: click to select, double-click to edit.
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
  import type { ExcalidrawScene, Theme, ExcalidrawAPI, ExcalidrawChangeEvent, ExcalidrawElement, WrapMode } from '../core/types';
  import {
    drawingEditorState,
    excalidrawAPIRegistry,
    syncExcalidrawToTool,
  } from '../core/drawing-state.svelte';
  import SelectionBorder from './SelectionBorder.svelte';
  import ImageToolbar from './ImageToolbar.svelte';

  // ============================================================================
  // Props
  // ============================================================================

  interface Props {
    id: string;
    sceneData: string;
    width: number;
    height: number;
    theme?: Theme;
    wrapMode?: WrapMode;
    selected?: boolean;
    editor?: Editor;
    onupdate?: (sceneData: string) => void;
    onupdateattrs?: (attrs: Record<string, unknown>) => void;
    ondelete?: () => void;
    onfinish?: () => void;
  }

  const {
    id,
    sceneData,
    width: initialWidth,
    height: initialHeight,
    theme = 'dark',
    wrapMode: initialWrapMode = 'inline',
    selected: initialSelected = false,
    editor: _editor,
    onupdate,
    onupdateattrs,
    ondelete,
    onfinish,
  }: Props = $props();

  // ============================================================================
  // State
  // ============================================================================

  let containerRef = $state<HTMLDivElement | null>(null);
  let editorContainerRef = $state<HTMLDivElement | null>(null);
  let isSelected = $state(false);
  let isEditing = $state(false);
  let currentScene = $state<ExcalidrawScene>(createEmptyScene('dark'));
  let hasUnsavedChanges = $state(false);
  let sceneInitialized = false;
  let selectionInitialized = false;

  // Dimensions state for resize
  let currentWidth = $state(initialWidth);
  let currentHeight = $state(initialHeight);
  let currentWrapMode = $state<WrapMode>(initialWrapMode);

  // Resize state
  let isResizing = $state(false);
  let resizeStartWidth = $state(0);
  let resizeStartHeight = $state(0);

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
  const showEditor = $derived(isEditing);
  const showPreview = $derived(!isEditing && hasContent);
  const showEmpty = $derived(!isEditing && !hasContent);

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
            if (!newSelected && isSelected) {
              // Deselected - save and exit edit mode
              if (hasUnsavedChanges) {
                saveChanges();
              }
              isEditing = false;
            }
            isSelected = newSelected;
          }
        }
      }
    });

    const wrapper = containerRef?.closest('[data-node-view-wrapper]');
    if (wrapper) {
      observer.observe(wrapper, { attributes: true, attributeFilter: ['data-selected'] });
      isSelected = wrapper.getAttribute('data-selected') === 'true';
    }

    // Generate initial preview
    void generatePreview();

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
    } catch {
      previewSvg = null;
    }
  }

  // Regenerate preview when scene changes
  $effect(() => {
    if (!isEditing && hasContent) {
      void generatePreview();
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
    void generatePreview();
  }

  function enterEditMode(): void {
    isEditing = true;
    void initializeExcalidraw();
  }

  function exitEditMode(): void {
    saveChanges();
    isEditing = false;
    destroyExcalidraw();
    isReady = false;
    onfinish?.();
  }

  function handleDelete(): void {
    ondelete?.();
  }

  function handleWrapModeChange(mode: WrapMode): void {
    currentWrapMode = mode;
    onupdateattrs?.({ wrapMode: mode });
  }

  function handleDoubleClick(): void {
    if (!isEditing) {
      enterEditMode();
    }
  }

  // ============================================================================
  // Resize Handlers
  // ============================================================================

  type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

  function handleResizeStart(_handle: HandlePosition, _e: MouseEvent): void {
    isResizing = true;
    resizeStartWidth = currentWidth;
    resizeStartHeight = currentHeight;
  }

  function handleResize(handle: HandlePosition, deltaX: number, deltaY: number, _e: MouseEvent): void {
    if (!isResizing) return;

    const aspectRatio = resizeStartWidth / resizeStartHeight;
    let newWidth = resizeStartWidth;
    let newHeight = resizeStartHeight;

    // Corner handles maintain aspect ratio
    const isCorner = ['nw', 'ne', 'se', 'sw'].includes(handle);

    switch (handle) {
      case 'e':
        newWidth = Math.max(100, resizeStartWidth + deltaX);
        break;
      case 'w':
        newWidth = Math.max(100, resizeStartWidth - deltaX);
        break;
      case 's':
        newHeight = Math.max(100, resizeStartHeight + deltaY);
        break;
      case 'n':
        newHeight = Math.max(100, resizeStartHeight - deltaY);
        break;
      case 'se':
        newWidth = Math.max(100, resizeStartWidth + deltaX);
        if (isCorner) newHeight = newWidth / aspectRatio;
        break;
      case 'sw':
        newWidth = Math.max(100, resizeStartWidth - deltaX);
        if (isCorner) newHeight = newWidth / aspectRatio;
        break;
      case 'ne':
        newWidth = Math.max(100, resizeStartWidth + deltaX);
        if (isCorner) newHeight = newWidth / aspectRatio;
        break;
      case 'nw':
        newWidth = Math.max(100, resizeStartWidth - deltaX);
        if (isCorner) newHeight = newWidth / aspectRatio;
        break;
    }

    currentWidth = Math.round(newWidth);
    currentHeight = Math.round(Math.max(100, newHeight));
  }

  function handleResizeEnd(_handle: HandlePosition): void {
    isResizing = false;
    onupdateattrs?.({ width: currentWidth, height: currentHeight });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!isSelected) return;

    // Cmd/Ctrl + S to save
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      saveChanges();
    }

    // Escape to exit edit mode
    if (event.key === 'Escape' && isEditing) {
      event.preventDefault();
      exitEditMode();
    }

    // Enter to start editing
    if (event.key === 'Enter' && !isEditing) {
      event.preventDefault();
      enterEditMode();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={containerRef}
  class="drawing-node-view"
  class:selected={isSelected && !isEditing}
  class:editing={isEditing}
  class:empty={showEmpty}
  style="width: {currentWidth}px; min-height: {isEditing ? Math.max(currentHeight, 400) : Math.max(currentHeight, 150)}px;"
  ondblclick={handleDoubleClick}
  role="button"
  tabindex="0"
>
  {#if browser}
    <!-- Editor Container (only rendered when editing) -->
    {#if showEditor}
      <div
        bind:this={editorContainerRef}
        class="excalidraw-editor-container"
        style="height: {Math.max(currentHeight, 400)}px;"
      >
        {#if !isReady}
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading drawing editor...</span>
          </div>
        {/if}
      </div>

      <!-- Done button when editing -->
      <div class="edit-status-bar">
        <span class="status-text">
          {hasUnsavedChanges ? 'Editing...' : 'Saved'}
        </span>
        <button class="btn btn-primary" onclick={exitEditMode}>
          Done
        </button>
      </div>
    {/if}

    <!-- Preview (when not editing and has content) -->
    {#if showPreview && previewSvg}
      <div class="preview-container">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted SVG from Excalidraw -->
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
        <span>Double-click to add drawing</span>
      </div>
    {/if}
  {/if}

  <!-- Selection UI (only when selected but not editing) -->
  {#if isSelected && !isEditing}
    <SelectionBorder
      width={currentWidth}
      height={currentHeight}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeEnd={handleResizeEnd}
    />
    <ImageToolbar
      wrapMode={currentWrapMode}
      onWrapModeChange={handleWrapModeChange}
      onEdit={enterEditMode}
      onDelete={handleDelete}
    />
  {/if}
</div>

<style>
  .drawing-node-view {
    position: relative;
    background-color: transparent;
    border-radius: 4px;
    cursor: default;
    transition: box-shadow 0.2s;
    margin: 16px 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .drawing-node-view:focus {
    outline: none;
  }

  .drawing-node-view.selected {
    /* No border - SelectionBorder component handles this */
  }

  .drawing-node-view.editing {
    border: 2px solid var(--glow-accent, #3b82f6);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
  }

  .drawing-node-view.empty {
    border: 1px dashed var(--glow-border-subtle, #3a3a4a);
    border-radius: 12px;
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

  /* Edit Status Bar (only shown when editing) */
  .edit-status-bar {
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
</style>
