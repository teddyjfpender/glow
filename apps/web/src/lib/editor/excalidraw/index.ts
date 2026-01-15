/**
 * Excalidraw Integration for Glow Docs
 *
 * A native-feeling drawing integration for Svelte + Tiptap editors.
 *
 * @module excalidraw
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Element types
  ExcalidrawElement,
  ExcalidrawElementType,
  FillStyle,
  StrokeStyle,
  Roundness,
  BoundElement,

  // App state types
  ExcalidrawAppState,
  Theme,
  TextAlign,
  Zoom,
  Collaborator,
  ActiveTool,
  ToolType,

  // File types
  ExcalidrawFiles,
  BinaryFileData,

  // Scene types
  ExcalidrawScene,

  // API types
  ExcalidrawAPI,
  SetActiveToolOptions,
  ExcalidrawChangeEvent,
  ExcalidrawPointerEvent,
  ExcalidrawCoreOptions,

  // State types
  DrawingMode,
  DrawingEditorState,

  // Anchor types
  AnchorType,
  DrawingAnchor,
  BlockAnchor,
  RangeAnchor,
  InlineAnchor,

  // Node attribute types
  ExcalidrawNodeAttrs,

  // Utility types
  BoundingBox,
  Point,
  Rect,
} from './core/types';

// ============================================================================
// Core Module
// ============================================================================

export {
  // ExcalidrawCore class
  ExcalidrawCore,

  // Scene utilities
  createEmptyScene,
  serializeScene,
  deserializeScene,
  calculateBounds,
  generateDrawingId,
  debounce,

  // Preview generation
  generatePreviewSvg,
  generatePreviewDataUrl,
} from './core/excalidraw-core';

// ============================================================================
// State Management
// ============================================================================

export {
  // State instances
  drawingEditorState,
  drawingToolState,
  excalidrawAPIRegistry,

  // Sync utilities
  syncToolToExcalidraw,
  syncExcalidrawToTool,
  handleToolShortcut,

  // Constants
  STROKE_COLOR_PRESETS,
  BACKGROUND_COLOR_PRESETS,
  TOOL_SHORTCUTS,
} from './core/drawing-state.svelte';

// ============================================================================
// Anchor System
// ============================================================================

export {
  // Anchor factory functions
  createBlockAnchor,
  createRangeAnchor,
  createInlineAnchor,

  // Position resolution
  resolveAnchorToCoords,
  mapAnchorThroughTransaction,

  // Anchor manager
  AnchorManager,
  anchorManager,

  // Coordinate utilities
  getBlockBounds,
  getRangeRects,
  findNearestBlockPos,

  // Serialization
  serializeAnchor,
  deserializeAnchor,

  // Snapping
  calculateSnapGuides,
  findSnapPoint,
} from './anchors/anchor-system';

export type { SnapGuide } from './anchors/anchor-system';

// ============================================================================
// Tiptap Extension
// ============================================================================

export {
  ExcalidrawNode,
  type ExcalidrawNodeOptions,
} from './extension/excalidraw-node';

export { SvelteNodeViewRenderer } from './extension/svelte-node-view-renderer';

// ============================================================================
// Components
// ============================================================================

export { default as DrawingNodeView } from './components/DrawingNodeView.svelte';
export { default as DrawingToolbar } from './components/DrawingToolbar.svelte';
export { default as DrawingOverlay } from './components/DrawingOverlay.svelte';
