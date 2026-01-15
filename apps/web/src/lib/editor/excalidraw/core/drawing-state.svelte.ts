/**
 * Drawing Editor State Management
 * Uses Svelte 5 runes for reactive state
 */

import type {
  DrawingMode,
  ToolType,
  Theme,
  FillStyle,
  StrokeStyle,
  ExcalidrawAPI,
  ExcalidrawScene,
} from './types';

// ============================================================================
// Drawing Editor State
// ============================================================================

/** Callback type for saving edited drawings */
export type SaveDrawingCallback = (sceneData: string, width: number, height: number) => void;

interface DrawingEditorStateInternal {
  activeDrawingId: string | null;
  mode: DrawingMode;
  activeTool: ToolType;
  isToolLocked: boolean;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  /** Node ID being edited (null for new drawings) */
  editingNodeId: string | null;
  /** Initial scene when editing existing drawing */
  initialScene: ExcalidrawScene | null;
  /** Callback to save changes when editing existing drawing */
  onSaveCallback: SaveDrawingCallback | null;
}

function createDrawingEditorState() {
  let state = $state<DrawingEditorStateInternal>({
    activeDrawingId: null,
    mode: 'none',
    activeTool: 'selection',
    isToolLocked: false,
    hasUnsavedChanges: false,
    isLoading: false,
    editingNodeId: null,
    initialScene: null,
    onSaveCallback: null,
  });

  // Computed properties
  const isActive = $derived(state.mode !== 'none');
  const isEditing = $derived(state.mode === 'edit');
  const isOverlayActive = $derived(state.mode === 'overlay');
  const canSave = $derived(state.hasUnsavedChanges);
  const isEditingExisting = $derived(state.editingNodeId !== null);

  // Actions
  function openDrawing(drawingId: string): void {
    state.activeDrawingId = drawingId;
    state.mode = 'edit';
    state.isLoading = true;
    state.hasUnsavedChanges = false;
  }

  function closeDrawing(): void {
    state.activeDrawingId = null;
    state.mode = 'none';
    state.hasUnsavedChanges = false;
    state.isLoading = false;
    state.editingNodeId = null;
    state.initialScene = null;
    state.onSaveCallback = null;
  }

  /** Activate overlay for creating new drawings */
  function activateOverlay(): void {
    state.mode = 'overlay';
    state.editingNodeId = null;
    state.initialScene = null;
    state.onSaveCallback = null;
  }

  /** Activate overlay for editing an existing drawing */
  function editExistingDrawing(
    nodeId: string,
    scene: ExcalidrawScene,
    onSave: SaveDrawingCallback
  ): void {
    state.mode = 'overlay';
    state.editingNodeId = nodeId;
    state.initialScene = scene;
    state.onSaveCallback = onSave;
  }

  function deactivateOverlay(): void {
    // Only change mode - the callback and scene are cleared after saving
    // in DrawingOverlay's handleDeactivate
    state.mode = 'none';
  }

  function clearEditingState(): void {
    state.editingNodeId = null;
    state.initialScene = null;
    state.onSaveCallback = null;
  }

  function setActiveTool(tool: ToolType): void {
    state.activeTool = tool;
  }

  function setToolLocked(locked: boolean): void {
    state.isToolLocked = locked;
  }

  function setUnsavedChanges(value: boolean): void {
    state.hasUnsavedChanges = value;
  }

  function setLoading(loading: boolean): void {
    state.isLoading = loading;
  }

  function reset(): void {
    state.activeDrawingId = null;
    state.mode = 'none';
    state.activeTool = 'selection';
    state.isToolLocked = false;
    state.hasUnsavedChanges = false;
    state.isLoading = false;
    state.editingNodeId = null;
    state.initialScene = null;
    state.onSaveCallback = null;
  }

  return {
    // Getters for state
    get activeDrawingId(): string | null {
      return state.activeDrawingId;
    },
    get mode(): DrawingMode {
      return state.mode;
    },
    get activeTool(): ToolType {
      return state.activeTool;
    },
    get isToolLocked(): boolean {
      return state.isToolLocked;
    },
    get hasUnsavedChanges(): boolean {
      return state.hasUnsavedChanges;
    },
    get isLoading(): boolean {
      return state.isLoading;
    },
    get editingNodeId(): string | null {
      return state.editingNodeId;
    },
    get initialScene(): ExcalidrawScene | null {
      return state.initialScene;
    },
    get onSaveCallback(): SaveDrawingCallback | null {
      return state.onSaveCallback;
    },
    // Computed
    get isActive(): boolean {
      return isActive;
    },
    get isEditing(): boolean {
      return isEditing;
    },
    get isOverlayActive(): boolean {
      return isOverlayActive;
    },
    get canSave(): boolean {
      return canSave;
    },
    get isEditingExisting(): boolean {
      return isEditingExisting;
    },
    // Actions
    openDrawing,
    closeDrawing,
    activateOverlay,
    editExistingDrawing,
    deactivateOverlay,
    clearEditingState,
    setActiveTool,
    setToolLocked,
    setUnsavedChanges,
    setLoading,
    reset,
  };
}

// ============================================================================
// Drawing Tool State
// ============================================================================

interface DrawingToolStateInternal {
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  opacity: number;
  lastTool: ToolType | null;
}

// Default colors
export const STROKE_COLOR_PRESETS = [
  '#ffffff', // White
  '#1e1e1e', // Black
  '#e03131', // Red
  '#2f9e44', // Green
  '#1971c2', // Blue
  '#f08c00', // Orange
  '#7048e8', // Purple
  '#f783ac', // Pink
];

export const BACKGROUND_COLOR_PRESETS = [
  'transparent',
  '#ffffff',
  '#1e1e1e',
  '#e03131',
  '#2f9e44',
  '#1971c2',
  '#f08c00',
  '#7048e8',
];

function createDrawingToolState() {
  let state = $state<DrawingToolStateInternal>({
    strokeColor: '#ffffff',
    backgroundColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'solid',
    opacity: 100,
    lastTool: null,
  });

  function setStrokeColor(color: string): void {
    state.strokeColor = color;
  }

  function setBackgroundColor(color: string): void {
    state.backgroundColor = color;
  }

  function setStrokeWidth(width: number): void {
    state.strokeWidth = Math.max(1, Math.min(16, width));
  }

  function setStrokeStyle(style: StrokeStyle): void {
    state.strokeStyle = style;
  }

  function setFillStyle(style: FillStyle): void {
    state.fillStyle = style;
  }

  function setOpacity(value: number): void {
    state.opacity = Math.max(0, Math.min(100, value));
  }

  function setLastTool(tool: ToolType): void {
    state.lastTool = tool;
  }

  function reset(): void {
    state.strokeColor = '#ffffff';
    state.backgroundColor = 'transparent';
    state.strokeWidth = 2;
    state.strokeStyle = 'solid';
    state.fillStyle = 'solid';
    state.opacity = 100;
    state.lastTool = null;
  }

  return {
    // Getters
    get strokeColor(): string {
      return state.strokeColor;
    },
    get backgroundColor(): string {
      return state.backgroundColor;
    },
    get strokeWidth(): number {
      return state.strokeWidth;
    },
    get strokeStyle(): StrokeStyle {
      return state.strokeStyle;
    },
    get fillStyle(): FillStyle {
      return state.fillStyle;
    },
    get opacity(): number {
      return state.opacity;
    },
    get lastTool(): ToolType | null {
      return state.lastTool;
    },
    // Presets
    strokeColorPresets: STROKE_COLOR_PRESETS,
    backgroundColorPresets: BACKGROUND_COLOR_PRESETS,
    // Actions
    setStrokeColor,
    setBackgroundColor,
    setStrokeWidth,
    setStrokeStyle,
    setFillStyle,
    setOpacity,
    setLastTool,
    reset,
  };
}

// ============================================================================
// Excalidraw API Registry
// ============================================================================

interface ExcalidrawAPIRegistry {
  apis: Map<string, ExcalidrawAPI>;
}

function createExcalidrawAPIRegistry() {
  const state = $state<ExcalidrawAPIRegistry>({
    apis: new Map(),
  });

  function register(drawingId: string, api: ExcalidrawAPI): void {
    state.apis.set(drawingId, api);
  }

  function unregister(drawingId: string): void {
    state.apis.delete(drawingId);
  }

  function get(drawingId: string): ExcalidrawAPI | undefined {
    return state.apis.get(drawingId);
  }

  function getActive(activeDrawingId: string | null): ExcalidrawAPI | undefined {
    if (!activeDrawingId) return undefined;
    return state.apis.get(activeDrawingId);
  }

  function clear(): void {
    state.apis.clear();
  }

  return {
    register,
    unregister,
    get,
    getActive,
    clear,
    get size(): number {
      return state.apis.size;
    },
  };
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const drawingEditorState = createDrawingEditorState();
export const drawingToolState = createDrawingToolState();
export const excalidrawAPIRegistry = createExcalidrawAPIRegistry();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sync tool state to Excalidraw
 */
export function syncToolToExcalidraw(): void {
  const api = excalidrawAPIRegistry.getActive(drawingEditorState.activeDrawingId);
  if (!api) return;

  api.setActiveTool({
    type: drawingEditorState.activeTool,
    locked: drawingEditorState.isToolLocked,
  });

  // Update current item styles
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
}

/**
 * Sync Excalidraw state to tool state
 */
export function syncExcalidrawToTool(): void {
  const api = excalidrawAPIRegistry.getActive(drawingEditorState.activeDrawingId);
  if (!api) return;

  const appState = api.getAppState();

  drawingEditorState.setActiveTool(appState.activeTool.type);
  drawingEditorState.setToolLocked(appState.activeTool.locked);

  drawingToolState.setStrokeColor(appState.currentItemStrokeColor);
  drawingToolState.setBackgroundColor(appState.currentItemBackgroundColor);
  drawingToolState.setStrokeWidth(appState.currentItemStrokeWidth);
  drawingToolState.setStrokeStyle(appState.currentItemStrokeStyle);
  drawingToolState.setFillStyle(appState.currentItemFillStyle);
  drawingToolState.setOpacity(appState.currentItemOpacity);
}

// ============================================================================
// Tool Shortcuts Map
// ============================================================================

export const TOOL_SHORTCUTS: Record<string, ToolType> = {
  v: 'selection',
  '1': 'selection',
  r: 'rectangle',
  '2': 'rectangle',
  d: 'diamond',
  '3': 'diamond',
  o: 'ellipse',
  '4': 'ellipse',
  a: 'arrow',
  '5': 'arrow',
  l: 'line',
  '6': 'line',
  p: 'freedraw',
  '7': 'freedraw',
  t: 'text',
  '8': 'text',
  e: 'eraser',
  '9': 'eraser',
  h: 'hand',
  '0': 'hand',
};

/**
 * Handle keyboard shortcut for tool selection
 */
export function handleToolShortcut(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  const tool = TOOL_SHORTCUTS[normalizedKey];

  if (tool && drawingEditorState.isActive) {
    drawingEditorState.setActiveTool(tool);
    syncToolToExcalidraw();
    return true;
  }

  return false;
}
