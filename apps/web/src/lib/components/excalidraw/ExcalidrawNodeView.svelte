<script lang="ts">
  /**
   * Node view component for rendering Excalidraw diagrams inline in the editor
   * Shows static preview - clicking opens the DrawingOverlay for editing
   */
  import { browser } from '$app/environment';
  import {
    deserializeScene,
    createEmptyScene,
    generatePreviewSvg,
    drawingEditorState,
    type ExcalidrawScene,
  } from '$lib/editor/excalidraw';

  interface Props {
    id: string;
    sceneData: string;
    width: number;
    height: number;
    theme?: 'light' | 'dark';
    selected?: boolean;
    onupdate?: (sceneData: string, width?: number, height?: number) => void;
    ondelete?: () => void;
  }

  const {
    id,
    sceneData,
    width: _width,
    height: _height,
    theme = 'dark',
    selected: _initialSelected = false,
    onupdate,
    ondelete,
  }: Props = $props();

  // ============================================================================
  // State
  // ============================================================================

  let containerElement = $state<HTMLDivElement | null>(null);
  let currentScene = $state<ExcalidrawScene>(createEmptyScene('dark'));
  let previewSvg = $state<string | null>(null);
  let isHovered = $state(false);

  // Check if scene has content
  const hasContent = $derived(currentScene.elements.filter(e => !e.isDeleted).length > 0);

  // ============================================================================
  // Initialization
  // ============================================================================

  // Track previous sceneData to detect actual changes
  let lastSceneData = '';

  // Initialize and update scene from sceneData prop
  $effect(() => {
    // Skip if sceneData hasn't actually changed
    if (sceneData === lastSceneData) return;
    lastSceneData = sceneData;

    if (sceneData) {
      const parsed = deserializeScene(sceneData);
      currentScene = parsed || createEmptyScene(theme);
      void generatePreview();
    }
  });

  // ============================================================================
  // Preview Generation
  // ============================================================================

  async function generatePreview(): Promise<void> {
    if (!browser || !hasContent) {
      previewSvg = null;
      return;
    }

    try {
      const svg = await generatePreviewSvg(currentScene, { theme, padding: 4 });
      if (svg) {
        previewSvg = svg.outerHTML;
      }
    } catch {
      previewSvg = null;
    }
  }

  // ============================================================================
  // Actions
  // ============================================================================

  function handleClick(): void {
    // Open the drawing overlay for editing
    drawingEditorState.editExistingDrawing(
      id,
      currentScene,
      handleSave
    );
  }

  function handleSave(newSceneData: string, newWidth: number, newHeight: number): void {
    // Update the node with new scene data
    onupdate?.(newSceneData, newWidth, newHeight);
  }

  function handleDelete(event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this drawing?')) {
      ondelete?.();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Enter or Space to edit
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
    // Delete key to delete
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (confirm('Are you sure you want to delete this drawing?')) {
        ondelete?.();
      }
    }
  }
</script>

<div
  bind:this={containerElement}
  class="excalidraw-node-view"
  class:empty={!hasContent}
  class:hovered={isHovered}
  onclick={handleClick}
  onkeydown={handleKeydown}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  role="button"
  tabindex="0"
  aria-label={hasContent ? 'Click to edit drawing' : 'Click to add drawing'}
>
  {#if browser}
    <!-- Preview (when has content) -->
    {#if hasContent && previewSvg}
      <div class="preview-container">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted SVG from Excalidraw -->
        {@html previewSvg}
      </div>
    {/if}

    <!-- Empty State -->
    {#if !hasContent}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" class="empty-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2" />
          <path d="M12 8 L12 16 M8 12 L16 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span>Click to add drawing</span>
      </div>
    {/if}

    <!-- Hover overlay with actions -->
    {#if isHovered && hasContent}
      <div class="hover-overlay">
        <div class="hover-actions">
          <button class="action-btn edit" title="Edit drawing">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button class="action-btn delete" onclick={handleDelete} title="Delete drawing">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .excalidraw-node-view {
    position: relative;
    background-color: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      background-color 0.2s;
    margin: 8px 0;
    display: inline-flex;
    flex-direction: column;
    overflow: hidden;
    max-width: 100%;
  }

  .excalidraw-node-view:hover,
  .excalidraw-node-view.hovered {
    box-shadow: 0 0 0 1px var(--glow-accent, #3b82f6);
  }

  .excalidraw-node-view:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--glow-accent, #3b82f6);
  }

  .excalidraw-node-view.empty {
    border: 1px dashed var(--glow-border-subtle, #3a3a4a);
    background-color: transparent;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    min-width: 200px;
  }

  .excalidraw-node-view.empty:hover {
    background-color: var(--glow-bg-elevated, #252536);
    border-style: solid;
  }

  /* Preview Container */
  .preview-container {
    display: inline-block;
    line-height: 0;
    max-width: 100%;
  }

  .preview-container :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* Empty state */
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

  .excalidraw-node-view.empty:hover .empty-state {
    color: var(--glow-text-secondary, #a0a0b0);
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .excalidraw-node-view.empty:hover .empty-icon {
    opacity: 0.8;
  }

  .empty-state span {
    font-size: 14px;
  }

  /* Hover overlay */
  .hover-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(30, 30, 46, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .hover-actions {
    display: flex;
    gap: 12px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    border: 1px solid var(--glow-border-default, #4a4a5a);
    background-color: var(--glow-bg-surface, #1e1e2e);
    color: var(--glow-text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background-color: var(--glow-bg-elevated, #252536);
  }

  .action-btn.edit:hover {
    border-color: var(--glow-accent, #3b82f6);
    color: var(--glow-accent, #3b82f6);
  }

  .action-btn.delete:hover {
    border-color: #ef4444;
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
</style>
