/**
 * Type definitions for Excalidraw integration
 */

// ============================================================================
// Excalidraw Element Types
// ============================================================================

export interface ExcalidrawElement {
  id: string;
  type: ExcalidrawElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  opacity: number;
  groupIds: string[];
  frameId: string | null;
  roundness: Roundness | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: BoundElement[] | null;
  updated: number;
  link: string | null;
  locked: boolean;
  customData?: Record<string, unknown>;
}

export type ExcalidrawElementType =
  | 'selection'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'frame'
  | 'magicframe'
  | 'embeddable';

export type FillStyle = 'hachure' | 'cross-hatch' | 'solid' | 'zigzag';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export interface Roundness { type: 1 | 2 | 3; value?: number }

export interface BoundElement {
  id: string;
  type: 'arrow' | 'text';
}

// ============================================================================
// Excalidraw App State Types
// ============================================================================

export interface ExcalidrawAppState {
  theme: Theme;
  viewBackgroundColor: string;
  zoom: Zoom;
  scrollX: number;
  scrollY: number;
  gridSize: number | null;
  collaborators: Map<string, Collaborator>;
  currentItemStrokeColor: string;
  currentItemBackgroundColor: string;
  currentItemFillStyle: FillStyle;
  currentItemStrokeWidth: number;
  currentItemStrokeStyle: StrokeStyle;
  currentItemRoundness: Roundness['type'];
  currentItemOpacity: number;
  currentItemFontFamily: number;
  currentItemFontSize: number;
  currentItemTextAlign: TextAlign;
  activeTool: ActiveTool;
  selectedElementIds: Record<string, boolean>;
  previousSelectedElementIds: Record<string, boolean>;
}

export type Theme = 'light' | 'dark';
export type TextAlign = 'left' | 'center' | 'right';

export interface Zoom {
  value: number;
}

export interface Collaborator {
  pointer?: { x: number; y: number; tool: 'pointer' | 'laser' };
  button?: 'up' | 'down';
  selectedElementIds?: Record<string, boolean>;
  username?: string;
  userState?: 'idle' | 'active';
  color?: { background: string; stroke: string };
  avatarUrl?: string;
  id?: string;
}

export interface ActiveTool {
  type: ToolType;
  customType?: string | null;
  locked: boolean;
  lastActiveTool?: ToolType | null;
}

export type ToolType =
  | 'selection'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'eraser'
  | 'hand'
  | 'frame'
  | 'magicframe'
  | 'embeddable'
  | 'laser';

// ============================================================================
// Excalidraw Files Types
// ============================================================================

export type ExcalidrawFiles = Record<string, BinaryFileData>;

export interface BinaryFileData {
  mimeType: string;
  id: string;
  dataURL: string;
  created: number;
  lastRetrieved: number;
}

// ============================================================================
// Scene Types
// ============================================================================

export interface ExcalidrawScene {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: ExcalidrawFiles;
}

// ============================================================================
// API Types
// ============================================================================

export interface ExcalidrawAPI {
  updateScene: (scene: Partial<ExcalidrawScene>) => void;
  getSceneElements: () => ExcalidrawElement[];
  getAppState: () => ExcalidrawAppState;
  getFiles: () => ExcalidrawFiles;
  setActiveTool: (tool: SetActiveToolOptions) => void;
  resetScene: () => void;
  refresh: () => void;
  scrollToContent: (
    target?: ExcalidrawElement | ExcalidrawElement[],
    opts?: { fitToViewport?: boolean; animate?: boolean; duration?: number }
  ) => void;
}

export interface SetActiveToolOptions {
  type: ToolType;
  locked?: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface ExcalidrawChangeEvent {
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: ExcalidrawFiles;
}

export interface ExcalidrawPointerEvent {
  pointer: { x: number; y: number };
  button: 'up' | 'down';
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ExcalidrawCoreOptions {
  scene?: ExcalidrawScene;
  theme?: Theme;
  viewModeEnabled?: boolean;
  zenModeEnabled?: boolean;
  gridModeEnabled?: boolean;
  /** Whether to hide Excalidraw's native UI (toolbar, menus, etc). Default: true */
  hideUI?: boolean;
  onChange?: (event: ExcalidrawChangeEvent) => void;
  onReady?: (api: ExcalidrawAPI) => void;
  onPointerDown?: (event: ExcalidrawPointerEvent) => void;
  onPointerUp?: (event: ExcalidrawPointerEvent) => void;
}

// ============================================================================
// Drawing State Types
// ============================================================================

export type DrawingMode = 'none' | 'view' | 'edit' | 'overlay';

export interface DrawingEditorState {
  activeDrawingId: string | null;
  mode: DrawingMode;
  activeTool: ToolType;
  isToolLocked: boolean;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

// ============================================================================
// Anchor Types
// ============================================================================

export type AnchorType = 'block' | 'range' | 'inline';

export interface DrawingAnchorBase {
  type: AnchorType;
  drawingId: string;
  offset: { x: number; y: number };
}

export interface BlockAnchor extends DrawingAnchorBase {
  type: 'block';
  nodePos: number; // ProseMirror node position
}

export interface RangeAnchor extends DrawingAnchorBase {
  type: 'range';
  from: number;
  to: number;
}

export interface InlineAnchor extends DrawingAnchorBase {
  type: 'inline';
  nodePos: number;
}

export type DrawingAnchor = BlockAnchor | RangeAnchor | InlineAnchor;

// ============================================================================
// Node Attributes Types
// ============================================================================

export interface ExcalidrawNodeAttrs {
  id: string;
  sceneData: string;
  width: number;
  height: number;
  theme: Theme;
  version: number;
  anchorType: AnchorType;
  anchorData: string;
  wrapMode: WrapMode;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Text Wrap Mode Types
// ============================================================================

export type WrapMode = 'inline' | 'wrap-left' | 'wrap-right' | 'break';
