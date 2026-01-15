<script lang="ts">
  /**
   * Drawing Overlay Component
   *
   * Provides "draw anywhere" functionality by rendering an Excalidraw canvas
   * as an overlay over the entire document content area.
   *
   * The overlay activates when `drawingEditorState.mode === 'overlay'` and
   * captures all pointer events. On deactivation (Escape key), shapes drawn
   * are converted to anchored ExcalidrawNode elements in the document.
   */
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import type { Editor } from '@tiptap/core';
  import {
    ExcalidrawCore,
    createEmptyScene,
    serializeScene,
    generateDrawingId,
    calculateBounds,
  } from '../core/excalidraw-core';
  import type {
    ExcalidrawScene,
    ExcalidrawElement,
    ExcalidrawAPI,
    ExcalidrawChangeEvent,
    Theme,
  } from '../core/types';
  import {
    drawingEditorState,
    drawingToolState,
    excalidrawAPIRegistry,
    syncExcalidrawToTool,
  } from '../core/drawing-state.svelte';
  import {
    createBlockAnchor,
    findNearestBlockPos,
    anchorManager,
    serializeAnchor,
  } from '../anchors/anchor-system';

  // ============================================================================
  // Props
  // ============================================================================

  interface Props {
    /** The Tiptap editor instance */
    editor?: Editor;
    /** The container element to overlay (for positioning) */
    containerRef?: HTMLElement | null;
    /** Theme for the drawing canvas */
    theme?: Theme;
    /** Callback when a drawing is created from overlay shapes */
    oncreate?: (sceneData: string, anchorData: string) => void;
  }

  const {
    editor,
    containerRef,
    theme = 'dark',
    oncreate,
  }: Props = $props();

  // ============================================================================
  // Constants
  // ============================================================================

  const OVERLAY_ID = 'drawing-overlay';
  const TRANSITION_DURATION_MS = 200;

  // ============================================================================
  // State
  // ============================================================================

  let overlayRef = $state<HTMLDivElement | null>(null);
  let canvasContainerRef = $state<HTMLDivElement | null>(null);
  let excalidrawCore: ExcalidrawCore | null = null;
  let isInitialized = $state(false);
  let isTransitioning = $state(false);
  // Scene is reset in initializeOverlay(), so just use 'dark' as default
  let currentScene = $state<ExcalidrawScene>(createEmptyScene('dark'));

  // Derived state
  const isOverlayActive = $derived(drawingEditorState.mode === 'overlay');
  const isEditingExisting = $derived(drawingEditorState.isEditingExisting);
  const hasElements = $derived(
    currentScene.elements.filter((el: ExcalidrawElement) => !el.isDeleted).length > 0
  );

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMount(() => {
    if (!browser) return;

    // Add keydown listener in capture phase to catch Escape before Excalidraw
    function captureKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && drawingEditorState.mode === 'overlay') {
        event.preventDefault();
        event.stopPropagation();
        console.log('[DrawingOverlay] Escape pressed (capture), deactivating overlay');
        drawingEditorState.deactivateOverlay();
      }
    }
    window.addEventListener('keydown', captureKeydown, true); // true = capture phase

    // Initialize when overlay becomes active
    const unsubscribe = $effect.root(() => {
      $effect(() => {
        if (isOverlayActive && !isInitialized && !isTransitioning) {
          initializeOverlay();
        } else if (!isOverlayActive && isInitialized && !isTransitioning) {
          handleDeactivate();
        }
      });
    });

    return () => {
      window.removeEventListener('keydown', captureKeydown, true);
      unsubscribe();
      destroyOverlay();
    };
  });

  onDestroy(() => {
    destroyOverlay();
  });

  // ============================================================================
  // Overlay Management
  // ============================================================================

  async function initializeOverlay(): Promise<void> {
    if (!browser || !canvasContainerRef || excalidrawCore) return;

    isTransitioning = true;

    // Load initial scene: either from existing drawing or create empty
    if (drawingEditorState.initialScene) {
      currentScene = drawingEditorState.initialScene;
    } else {
      currentScene = createEmptyScene(theme);
    }

    excalidrawCore = new ExcalidrawCore(canvasContainerRef, {
      scene: currentScene,
      theme,
      viewModeEnabled: false,
      zenModeEnabled: false, // Show full UI for overlay mode
      hideUI: false, // Show Excalidraw's native toolbar
      onChange: handleChange,
      onReady: handleReady,
    });

    await excalidrawCore.initialize();

    // Short delay for transition
    setTimeout(() => {
      isTransitioning = false;
    }, TRANSITION_DURATION_MS);
  }

  function destroyOverlay(): void {
    if (excalidrawCore) {
      excalidrawCore.destroy();
      excalidrawCore = null;
    }
    excalidrawAPIRegistry.unregister(OVERLAY_ID);
    isInitialized = false;
  }

  function handleReady(api: ExcalidrawAPI): void {
    // Guard against callbacks after component destruction
    // This can happen since we defer the onReady callback in ExcalidrawCore
    if (!excalidrawCore || !canvasContainerRef) {
      return;
    }

    isInitialized = true;
    excalidrawAPIRegistry.register(OVERLAY_ID, api);

    // Set the active tool from toolbar state
    api.setActiveTool({
      type: drawingEditorState.activeTool,
      locked: drawingEditorState.isToolLocked,
    });

    // Sync current tool styles
    api.updateScene({
      appState: {
        currentItemStrokeColor: drawingToolState.strokeColor,
        currentItemBackgroundColor: drawingToolState.backgroundColor,
        currentItemStrokeWidth: drawingToolState.strokeWidth,
        currentItemStrokeStyle: drawingToolState.strokeStyle,
        currentItemFillStyle: drawingToolState.fillStyle,
        currentItemOpacity: drawingToolState.opacity,
      },
    });

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
  }

  // ============================================================================
  // Deactivation & Conversion
  // ============================================================================

  function handleDeactivate(): void {
    if (isTransitioning) return;

    isTransitioning = true;

    // Handle saving based on whether we're editing existing or creating new
    if (hasElements) {
      if (drawingEditorState.isEditingExisting && drawingEditorState.onSaveCallback) {
        // Save to existing node
        saveExistingDrawing();
      } else {
        // Convert drawn shapes to new anchored drawing
        convertToAnchoredDrawing();
      }
    }

    // Clear editing state after saving
    drawingEditorState.clearEditingState();

    // Cleanup
    destroyOverlay();

    setTimeout(() => {
      isTransitioning = false;
    }, TRANSITION_DURATION_MS);
  }

  function saveExistingDrawing(): void {
    const visibleElements = currentScene.elements.filter(el => !el.isDeleted);
    if (visibleElements.length === 0) return;

    // Calculate bounds
    const bounds = calculateBounds(visibleElements);
    const padding = 20;

    // Serialize current scene
    const sceneData = serializeScene(currentScene);

    // Call the save callback
    drawingEditorState.onSaveCallback?.(
      sceneData,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );

    // Clear the overlay canvas
    currentScene = createEmptyScene(theme);
  }

  function convertToAnchoredDrawing(): void {
    if (!editor) {
      console.warn('[DrawingOverlay] No editor available for conversion');
      return;
    }

    const visibleElements = currentScene.elements.filter(el => !el.isDeleted);
    if (visibleElements.length === 0) return;

    // Calculate the bounding box of all elements
    const bounds = calculateBounds(visibleElements);

    // Find the center point of the drawing
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;

    // Calculate the offset to normalize elements to start at (0, 0) with padding
    const padding = 20;
    const offsetX = -bounds.minX + padding;
    const offsetY = -bounds.minY + padding;

    // Normalize element positions relative to bounding box origin
    const normalizedElements = visibleElements.map(el => ({
      ...el,
      x: el.x + offsetX,
      y: el.y + offsetY,
    }));

    // Create normalized scene
    const normalizedScene: ExcalidrawScene = {
      ...currentScene,
      elements: normalizedElements,
      appState: {
        ...currentScene.appState,
        scrollX: 0,
        scrollY: 0,
      },
    };

    // Serialize the scene
    const sceneData = serializeScene(normalizedScene);

    // Find anchor position based on drawing location
    let anchorData = '';
    const view = editor.view;

    if (view && containerRef) {
      // Convert canvas coordinates to DOM coordinates
      const containerRect = containerRef.getBoundingClientRect();
      const domX = centerX + containerRect.left;
      const domY = centerY + containerRect.top;

      // Find nearest block position
      const blockPos = findNearestBlockPos(view, { x: domX, y: domY });

      if (blockPos !== null) {
        const drawingId = generateDrawingId();
        const anchor = createBlockAnchor(blockPos, { x: 0, y: 0 }, drawingId);
        anchorData = serializeAnchor(anchor);

        // Insert the drawing node at the anchor position
        editor.chain()
          .focus()
          .insertContentAt(blockPos, {
            type: 'excalidrawNode',
            attrs: {
              id: drawingId,
              sceneData,
              width: bounds.width + padding * 2,
              height: bounds.height + padding * 2,
              theme,
              version: 1,
              anchorType: 'block',
              anchorData,
            },
          })
          .run();
      } else {
        // Fallback: insert at current cursor position
        const drawingId = generateDrawingId();
        editor.commands.insertExcalidraw({
          id: drawingId,
          sceneData,
          width: bounds.width + padding * 2,
          height: bounds.height + padding * 2,
          theme,
        });
      }
    } else if (oncreate) {
      // Use callback if no editor view
      oncreate(sceneData, anchorData);
    }

    // Clear the overlay canvas
    currentScene = createEmptyScene(theme);
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleOverlayClick(event: MouseEvent): void {
    // Prevent clicks from propagating to editor when overlay is active
    if (isOverlayActive) {
      event.stopPropagation();
    }
  }

  // ============================================================================
  // Positioning
  // ============================================================================

  function getOverlayStyles(): string {
    if (!containerRef) {
      return '';
    }

    // The overlay should cover the entire container
    return 'position: absolute; inset: 0;';
  }
</script>

{#if browser && isOverlayActive}
  <div
    bind:this={overlayRef}
    class="drawing-overlay"
    class:active={isOverlayActive}
    class:transitioning={isTransitioning}
    style={getOverlayStyles()}
    onclick={handleOverlayClick}
    onmousedown={handleOverlayClick}
    role="application"
    aria-label="Drawing overlay canvas"
    aria-hidden={!isOverlayActive}
  >
    <!-- Overlay backdrop -->
    <div class="overlay-backdrop"></div>

    <!-- Excalidraw canvas container -->
    <div
      bind:this={canvasContainerRef}
      class="overlay-canvas-container"
    >
      {#if !isInitialized && isTransitioning}
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Initializing drawing canvas...</span>
        </div>
      {/if}
    </div>

    <!-- Overlay hint -->
    <div class="overlay-hint">
      <span class="hint-text">{isEditingExisting ? 'Edit drawing' : 'Draw anywhere on the document'}</span>
      <span class="hint-shortcut">Press <kbd>Esc</kbd> to finish</span>
    </div>
  </div>
{/if}

<style>
  .drawing-overlay {
    position: absolute;
    inset: 0;
    z-index: 1000;
    pointer-events: auto;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.2s ease-in-out,
      visibility 0.2s ease-in-out;
  }

  .drawing-overlay.active {
    opacity: 1;
    visibility: visible;
  }

  .drawing-overlay.transitioning {
    pointer-events: none;
  }

  /* Backdrop - semi-transparent to see document underneath */
  .overlay-backdrop {
    position: absolute;
    inset: 0;
    background-color: rgba(30, 30, 46, 0.85);
    pointer-events: none;
  }

  /* Canvas Container */
  .overlay-canvas-container {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
  }

  .overlay-canvas-container :global(.excalidraw-core-container) {
    width: 100% !important;
    height: 100% !important;
  }

  .overlay-canvas-container :global(.excalidraw) {
    width: 100% !important;
    height: 100% !important;
    background: transparent !important;
  }

  /* Make the Excalidraw canvas background semi-transparent */
  .overlay-canvas-container :global(.excalidraw .layer-ui__wrapper) {
    background: transparent !important;
  }

  /* Loading State */
  .loading-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--glow-text-secondary, #a0a0b0);
    background-color: rgba(30, 30, 46, 0.9);
    z-index: 10;
  }

  .spinner {
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

  /* Overlay Hint */
  .overlay-hint {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background-color: var(--glow-bg-surface, #1e1e2e);
    border: 1px solid var(--glow-border-subtle, #3a3a4a);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 100;
    pointer-events: none;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .hint-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary, #e0e0e0);
  }

  .hint-shortcut {
    font-size: 12px;
    color: var(--glow-text-secondary, #a0a0b0);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hint-shortcut kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    color: var(--glow-text-primary, #e0e0e0);
    background-color: var(--glow-bg-elevated, #252536);
    border: 1px solid var(--glow-border-default, #4a4a5a);
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* Inactive state - allow click-through */
  .drawing-overlay:not(.active) {
    pointer-events: none;
  }
</style>
