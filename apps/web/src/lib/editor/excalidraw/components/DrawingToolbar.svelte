<script lang="ts">
  /**
   * Drawing Toolbar Component
   *
   * Provides tool controls when a drawing is active.
   * Syncs bidirectionally with Excalidraw via the state management.
   */
  import {
    drawingEditorState,
    drawingToolState,
    excalidrawAPIRegistry,
    syncToolToExcalidraw,
    handleToolShortcut,
    STROKE_COLOR_PRESETS,
    BACKGROUND_COLOR_PRESETS,
  } from '../core/drawing-state.svelte';
  import type { ToolType, StrokeStyle } from '../core/types';

  // ============================================================================
  // Tool Definitions
  // ============================================================================

  interface ToolDef {
    type: ToolType;
    label: string;
    shortcut: string;
    icon: string;
  }

  const TOOLS: ToolDef[] = [
    { type: 'selection', label: 'Select', shortcut: 'V', icon: 'cursor' },
    { type: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: 'rectangle' },
    { type: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: 'ellipse' },
    { type: 'diamond', label: 'Diamond', shortcut: 'D', icon: 'diamond' },
    { type: 'arrow', label: 'Arrow', shortcut: 'A', icon: 'arrow' },
    { type: 'line', label: 'Line', shortcut: 'L', icon: 'line' },
    { type: 'freedraw', label: 'Pencil', shortcut: 'P', icon: 'pencil' },
    { type: 'text', label: 'Text', shortcut: 'T', icon: 'text' },
    { type: 'eraser', label: 'Eraser', shortcut: 'E', icon: 'eraser' },
  ];

  const STROKE_WIDTHS = [1, 2, 4, 8];
  const STROKE_STYLES: { value: StrokeStyle; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
  ];

  // ============================================================================
  // State
  // ============================================================================

  let showStrokeColorPicker = $state(false);
  let showFillColorPicker = $state(false);

  // Get current values from state
  let activeTool = $derived(drawingEditorState.activeTool);
  let isToolLocked = $derived(drawingEditorState.isToolLocked);
  let strokeColor = $derived(drawingToolState.strokeColor);
  let backgroundColor = $derived(drawingToolState.backgroundColor);
  let strokeWidth = $derived(drawingToolState.strokeWidth);
  let strokeStyle = $derived(drawingToolState.strokeStyle);

  // ============================================================================
  // Actions
  // ============================================================================

  function setTool(tool: ToolType): void {
    drawingEditorState.setActiveTool(tool);
    syncToolToExcalidraw();
  }

  function toggleToolLock(): void {
    drawingEditorState.setToolLocked(!isToolLocked);
    syncToolToExcalidraw();
  }

  function setStrokeColor(color: string): void {
    drawingToolState.setStrokeColor(color);
    syncToolToExcalidraw();
    showStrokeColorPicker = false;
  }

  function setBackgroundColor(color: string): void {
    drawingToolState.setBackgroundColor(color);
    syncToolToExcalidraw();
    showFillColorPicker = false;
  }

  function setStrokeWidth(width: number): void {
    drawingToolState.setStrokeWidth(width);
    syncToolToExcalidraw();
  }

  function setStrokeStyleValue(style: StrokeStyle): void {
    drawingToolState.setStrokeStyle(style);
    syncToolToExcalidraw();
  }

  function handleDone(): void {
    drawingEditorState.closeDrawing();
  }

  // ============================================================================
  // Keyboard Handler
  // ============================================================================

  function handleKeydown(event: KeyboardEvent): void {
    if (!drawingEditorState.isActive) return;

    // Don't intercept if typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Let the shortcut handler deal with tool shortcuts
    if (handleToolShortcut(event.key)) {
      event.preventDefault();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if drawingEditorState.isActive}
  <div class="drawing-toolbar" role="toolbar" aria-label="Drawing tools">
    <!-- Tool Buttons -->
    <div class="tool-group">
      {#each TOOLS as tool}
        <button
          class="tool-btn"
          class:active={activeTool === tool.type}
          onclick={() => setTool(tool.type)}
          title="{tool.label} ({tool.shortcut})"
          aria-pressed={activeTool === tool.type}
        >
          <span class="tool-icon" data-icon={tool.icon}>
            {#if tool.icon === 'cursor'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l7 18 2.5-7.5L21 12 4 4z"/>
              </svg>
            {:else if tool.icon === 'rectangle'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
            {:else if tool.icon === 'ellipse'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <ellipse cx="12" cy="12" rx="9" ry="7"/>
              </svg>
            {:else if tool.icon === 'diamond'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l10 10-10 10L2 12l10-10z"/>
              </svg>
            {:else if tool.icon === 'arrow'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14m-7-7l7 7-7 7"/>
              </svg>
            {:else if tool.icon === 'line'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="19" x2="19" y2="5"/>
              </svg>
            {:else if tool.icon === 'pencil'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            {:else if tool.icon === 'text'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
              </svg>
            {:else if tool.icon === 'eraser'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 20H9L4 15l10-10 7 7-6 6"/>
              </svg>
            {/if}
          </span>
        </button>
      {/each}
    </div>

    <div class="divider"></div>

    <!-- Lock Toggle -->
    <button
      class="tool-btn"
      class:active={isToolLocked}
      onclick={toggleToolLock}
      title="Lock tool (keep selected after drawing)"
      aria-pressed={isToolLocked}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if isToolLocked}
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        {:else}
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 019.9-1"/>
        {/if}
      </svg>
    </button>

    <div class="divider"></div>

    <!-- Stroke Color -->
    <div class="color-picker-container">
      <button
        class="color-btn"
        onclick={() => { showStrokeColorPicker = !showStrokeColorPicker; showFillColorPicker = false; }}
        title="Stroke color"
      >
        <div class="color-swatch" style="background-color: {strokeColor}"></div>
        <span class="color-label">Stroke</span>
      </button>
      {#if showStrokeColorPicker}
        <div class="color-picker-dropdown">
          {#each STROKE_COLOR_PRESETS as color}
            <button
              class="color-option"
              class:selected={strokeColor === color}
              style="background-color: {color}"
              onclick={() => setStrokeColor(color)}
              aria-label="Set stroke color to {color}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Fill Color -->
    <div class="color-picker-container">
      <button
        class="color-btn"
        onclick={() => { showFillColorPicker = !showFillColorPicker; showStrokeColorPicker = false; }}
        title="Fill color"
      >
        <div
          class="color-swatch"
          class:transparent={backgroundColor === 'transparent'}
          style="background-color: {backgroundColor === 'transparent' ? 'transparent' : backgroundColor}"
        ></div>
        <span class="color-label">Fill</span>
      </button>
      {#if showFillColorPicker}
        <div class="color-picker-dropdown">
          {#each BACKGROUND_COLOR_PRESETS as color}
            <button
              class="color-option"
              class:selected={backgroundColor === color}
              class:transparent={color === 'transparent'}
              style="background-color: {color === 'transparent' ? 'transparent' : color}"
              onclick={() => setBackgroundColor(color)}
              aria-label="Set fill color to {color}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="divider"></div>

    <!-- Stroke Width -->
    <div class="tool-group stroke-width-group">
      {#each STROKE_WIDTHS as width}
        <button
          class="stroke-width-btn"
          class:active={strokeWidth === width}
          onclick={() => setStrokeWidth(width)}
          title="{width}px stroke"
        >
          <div class="stroke-preview" style="height: {width}px"></div>
        </button>
      {/each}
    </div>

    <!-- Stroke Style -->
    <select
      class="stroke-style-select"
      value={strokeStyle}
      onchange={(e) => setStrokeStyleValue((e.target as HTMLSelectElement).value as StrokeStyle)}
    >
      {#each STROKE_STYLES as style}
        <option value={style.value}>{style.label}</option>
      {/each}
    </select>

    <div class="spacer"></div>

    <!-- Done Button -->
    <button class="done-btn" onclick={handleDone}>
      Done
    </button>
  </div>
{/if}

<style>
  .drawing-toolbar {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background-color: var(--glow-bg-surface, #1e1e2e);
    border-bottom: 1px solid var(--glow-border-subtle, #3a3a4a);
    gap: 4px;
    min-height: 44px;
  }

  .tool-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--glow-text-secondary, #a0a0b0);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tool-btn:hover {
    background-color: var(--glow-bg-elevated, #252536);
    color: var(--glow-text-primary, #e0e0e0);
  }

  .tool-btn.active {
    background-color: var(--glow-accent, #3b82f6);
    color: white;
  }

  .tool-btn svg,
  .tool-icon svg {
    width: 18px;
    height: 18px;
  }

  .divider {
    width: 1px;
    height: 24px;
    background-color: var(--glow-border-subtle, #3a3a4a);
    margin: 0 8px;
  }

  .spacer {
    flex: 1;
  }

  /* Color Picker */
  .color-picker-container {
    position: relative;
  }

  .color-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: 1px solid var(--glow-border-subtle, #3a3a4a);
    background: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .color-btn:hover {
    border-color: var(--glow-border-default, #4a4a5a);
    background-color: var(--glow-bg-elevated, #252536);
  }

  .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid var(--glow-border-default, #4a4a5a);
  }

  .color-swatch.transparent {
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  }

  .color-label {
    font-size: 12px;
    color: var(--glow-text-secondary, #a0a0b0);
  }

  .color-picker-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    padding: 8px;
    background-color: var(--glow-bg-surface, #1e1e2e);
    border: 1px solid var(--glow-border-default, #4a4a5a);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    z-index: 100;
  }

  .color-option {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }

  .color-option:hover {
    transform: scale(1.1);
  }

  .color-option.selected {
    border-color: var(--glow-accent, #3b82f6);
  }

  .color-option.transparent {
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  }

  /* Stroke Width */
  .stroke-width-group {
    gap: 4px;
  }

  .stroke-width-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .stroke-width-btn:hover {
    background-color: var(--glow-bg-elevated, #252536);
  }

  .stroke-width-btn.active {
    border-color: var(--glow-accent, #3b82f6);
    background-color: var(--glow-bg-elevated, #252536);
  }

  .stroke-preview {
    width: 16px;
    background-color: var(--glow-text-primary, #e0e0e0);
    border-radius: 1px;
  }

  /* Stroke Style */
  .stroke-style-select {
    padding: 4px 8px;
    font-size: 12px;
    color: var(--glow-text-primary, #e0e0e0);
    background-color: var(--glow-bg-surface, #1e1e2e);
    border: 1px solid var(--glow-border-subtle, #3a3a4a);
    border-radius: 6px;
    cursor: pointer;
  }

  .stroke-style-select:hover {
    border-color: var(--glow-border-default, #4a4a5a);
  }

  .stroke-style-select option {
    background-color: var(--glow-bg-surface, #1e1e2e);
  }

  /* Done Button */
  .done-btn {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 500;
    color: white;
    background-color: var(--glow-accent, #3b82f6);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .done-btn:hover {
    background-color: #2563eb;
  }
</style>
