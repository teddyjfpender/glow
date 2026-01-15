/**
 * Drawing Anchor System
 *
 * Anchors tie drawings to document positions so they move
 * correctly when the document content changes.
 */

import type { EditorView } from '@tiptap/pm/view';
import type { Transaction } from '@tiptap/pm/state';
import type {
  DrawingAnchor,
  BlockAnchor,
  RangeAnchor,
  InlineAnchor,
  Point,
  Rect,
  AnchorType,
} from '../core/types';
import { generateDrawingId } from '../core/excalidraw-core';

// ============================================================================
// Anchor Factory Functions
// ============================================================================

/**
 * Create a block anchor attached to a paragraph/node position
 */
export function createBlockAnchor(
  nodePos: number,
  offset: Point = { x: 0, y: 0 },
  drawingId?: string
): BlockAnchor {
  return {
    type: 'block',
    drawingId: drawingId ?? generateDrawingId(),
    nodePos,
    offset,
  };
}

/**
 * Create a range anchor attached to a text selection
 */
export function createRangeAnchor(
  from: number,
  to: number,
  offset: Point = { x: 0, y: 0 },
  drawingId?: string
): RangeAnchor {
  if (from > to) {
    [from, to] = [to, from];
  }

  return {
    type: 'range',
    drawingId: drawingId ?? generateDrawingId(),
    from,
    to,
    offset,
  };
}

/**
 * Create an inline anchor attached to an inline atom node
 */
export function createInlineAnchor(
  nodePos: number,
  offset: Point = { x: 0, y: 0 },
  drawingId?: string
): InlineAnchor {
  return {
    type: 'inline',
    drawingId: drawingId ?? generateDrawingId(),
    nodePos,
    offset,
  };
}

// ============================================================================
// Position Resolution
// ============================================================================

/**
 * Resolve an anchor to screen coordinates
 */
export function resolveAnchorToCoords(
  anchor: DrawingAnchor,
  view: EditorView
): Point | null {
  try {
    switch (anchor.type) {
      case 'block':
        return resolveBlockAnchor(anchor, view);
      case 'range':
        return resolveRangeAnchor(anchor, view);
      case 'inline':
        return resolveInlineAnchor(anchor, view);
      default:
        return null;
    }
  } catch (error) {
    console.error('[AnchorSystem] Failed to resolve anchor:', error);
    return null;
  }
}

function resolveBlockAnchor(anchor: BlockAnchor, view: EditorView): Point | null {
  const { nodePos, offset } = anchor;

  // Check if position is valid
  if (nodePos < 0 || nodePos >= view.state.doc.content.size) {
    return null;
  }

  // Get node at position
  const node = view.state.doc.nodeAt(nodePos);
  if (!node) {
    return null;
  }

  // Get coordinates
  const coords = view.coordsAtPos(nodePos);

  return {
    x: coords.left + offset.x,
    y: coords.top + offset.y,
  };
}

function resolveRangeAnchor(anchor: RangeAnchor, view: EditorView): Point | null {
  const { from, offset } = anchor;

  // Check if positions are valid
  if (from < 0 || from >= view.state.doc.content.size) {
    return null;
  }

  // Get coordinates for start of range
  const coords = view.coordsAtPos(from);

  return {
    x: coords.left + offset.x,
    y: coords.top + offset.y,
  };
}

function resolveInlineAnchor(anchor: InlineAnchor, view: EditorView): Point | null {
  const { nodePos, offset } = anchor;

  // Check if position is valid
  if (nodePos < 0 || nodePos >= view.state.doc.content.size) {
    return null;
  }

  // Get coordinates
  const coords = view.coordsAtPos(nodePos);

  return {
    x: coords.left + offset.x,
    y: coords.top + offset.y,
  };
}

// ============================================================================
// Position Mapping
// ============================================================================

/**
 * Map anchor position through a transaction
 */
export function mapAnchorThroughTransaction(
  anchor: DrawingAnchor,
  tr: Transaction
): DrawingAnchor | null {
  switch (anchor.type) {
    case 'block':
      return mapBlockAnchor(anchor, tr);
    case 'range':
      return mapRangeAnchor(anchor, tr);
    case 'inline':
      return mapInlineAnchor(anchor, tr);
    default:
      return null;
  }
}

function mapBlockAnchor(anchor: BlockAnchor, tr: Transaction): BlockAnchor | null {
  const newPos = tr.mapping.map(anchor.nodePos);

  // Check if position was deleted (maps to same position and doc is shorter)
  const wasDeleted = tr.mapping.mapResult(anchor.nodePos).deleted;
  if (wasDeleted) {
    return null;
  }

  return {
    ...anchor,
    nodePos: newPos,
  };
}

function mapRangeAnchor(anchor: RangeAnchor, tr: Transaction): RangeAnchor | null {
  const fromResult = tr.mapping.mapResult(anchor.from);
  const toResult = tr.mapping.mapResult(anchor.to);

  // If both endpoints were deleted, the anchor is invalid
  if (fromResult.deleted && toResult.deleted) {
    return null;
  }

  return {
    ...anchor,
    from: fromResult.pos,
    to: toResult.pos,
  };
}

function mapInlineAnchor(anchor: InlineAnchor, tr: Transaction): InlineAnchor | null {
  const result = tr.mapping.mapResult(anchor.nodePos);

  if (result.deleted) {
    return null;
  }

  return {
    ...anchor,
    nodePos: result.pos,
  };
}

// ============================================================================
// Anchor Manager
// ============================================================================

export class AnchorManager {
  private anchors = new Map<string, DrawingAnchor>();
  private view: EditorView | null = null;

  /**
   * Set the editor view reference
   */
  setView(view: EditorView): void {
    this.view = view;
  }

  /**
   * Register a new anchor
   */
  register(anchor: DrawingAnchor): void {
    this.anchors.set(anchor.drawingId, anchor);
  }

  /**
   * Get anchor by drawing ID
   */
  get(drawingId: string): DrawingAnchor | undefined {
    return this.anchors.get(drawingId);
  }

  /**
   * Remove an anchor
   */
  remove(drawingId: string): boolean {
    return this.anchors.delete(drawingId);
  }

  /**
   * Get all anchors
   */
  getAll(): DrawingAnchor[] {
    return Array.from(this.anchors.values());
  }

  /**
   * Update all anchors after a transaction
   */
  handleTransaction(tr: Transaction): void {
    if (!tr.docChanged) {
      return;
    }

    const toRemove: string[] = [];

    for (const [id, anchor] of this.anchors) {
      const mappedAnchor = mapAnchorThroughTransaction(anchor, tr);

      if (mappedAnchor === null) {
        toRemove.push(id);
      } else {
        this.anchors.set(id, mappedAnchor);
      }
    }

    // Remove invalid anchors
    for (const id of toRemove) {
      this.anchors.delete(id);
    }
  }

  /**
   * Resolve anchor to screen coordinates
   */
  resolveToCoords(drawingId: string): Point | null {
    const anchor = this.anchors.get(drawingId);
    if (!anchor || !this.view) {
      return null;
    }

    return resolveAnchorToCoords(anchor, this.view);
  }

  /**
   * Create block anchor from screen coordinates
   */
  createBlockAnchorFromCoords(
    coords: Point,
    drawingId?: string
  ): BlockAnchor | null {
    if (!this.view) {
      return null;
    }

    // Find position at coordinates
    const posResult = this.view.posAtCoords({ left: coords.x, top: coords.y });
    if (!posResult) {
      return null;
    }

    // Find the start of the block containing this position
    const resolved = this.view.state.doc.resolve(posResult.pos);
    const blockStart = resolved.start(1); // Start of first depth (block level)

    // Get coords of the block start
    const blockCoords = this.view.coordsAtPos(blockStart);

    // Calculate offset from block to drawing position
    const offset: Point = {
      x: coords.x - blockCoords.left,
      y: coords.y - blockCoords.top,
    };

    return createBlockAnchor(blockStart, offset, drawingId);
  }

  /**
   * Create range anchor from current selection
   */
  createRangeAnchorFromSelection(drawingId?: string): RangeAnchor | null {
    if (!this.view) {
      return null;
    }

    const { from, to } = this.view.state.selection;
    return createRangeAnchor(from, to, { x: 0, y: 0 }, drawingId);
  }

  /**
   * Clear all anchors
   */
  clear(): void {
    this.anchors.clear();
  }

  /**
   * Get count of registered anchors
   */
  get size(): number {
    return this.anchors.size;
  }
}

// ============================================================================
// Coordinate Utilities
// ============================================================================

/**
 * Get the bounding rect of a block at a position
 */
export function getBlockBounds(view: EditorView, pos: number): Rect | null {
  try {
    const resolved = view.state.doc.resolve(pos);
    const blockStart = resolved.start(1);
    const blockEnd = resolved.end(1);

    const startCoords = view.coordsAtPos(blockStart);
    const endCoords = view.coordsAtPos(blockEnd);

    return {
      x: startCoords.left,
      y: startCoords.top,
      width: endCoords.right - startCoords.left,
      height: endCoords.bottom - startCoords.top,
    };
  } catch {
    return null;
  }
}

/**
 * Get line rectangles for a text range
 */
export function getRangeRects(view: EditorView, from: number, to: number): Rect[] {
  try {
    // Use DOM range to get client rects
    const fromCoords = view.coordsAtPos(from);
    const toCoords = view.coordsAtPos(to);

    // Simple case: same line
    if (Math.abs(fromCoords.top - toCoords.top) < 5) {
      return [{
        x: Math.min(fromCoords.left, toCoords.left),
        y: fromCoords.top,
        width: Math.abs(toCoords.left - fromCoords.left),
        height: fromCoords.bottom - fromCoords.top,
      }];
    }

    // Multi-line: return bounding box for now
    // A more sophisticated implementation would get individual line rects
    return [{
      x: Math.min(fromCoords.left, toCoords.left),
      y: Math.min(fromCoords.top, toCoords.top),
      width: Math.max(fromCoords.right, toCoords.right) - Math.min(fromCoords.left, toCoords.left),
      height: Math.max(fromCoords.bottom, toCoords.bottom) - Math.min(fromCoords.top, toCoords.top),
    }];
  } catch {
    return [];
  }
}

/**
 * Find the nearest block node position for given coordinates
 */
export function findNearestBlockPos(view: EditorView, coords: Point): number | null {
  const posResult = view.posAtCoords({ left: coords.x, top: coords.y });
  if (!posResult) {
    return null;
  }

  const resolved = view.state.doc.resolve(posResult.pos);
  return resolved.start(1);
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize an anchor to JSON
 */
export function serializeAnchor(anchor: DrawingAnchor): string {
  return JSON.stringify(anchor);
}

/**
 * Deserialize an anchor from JSON
 */
export function deserializeAnchor(json: string): DrawingAnchor | null {
  try {
    const parsed = JSON.parse(json);

    // Validate type
    if (!['block', 'range', 'inline'].includes(parsed.type)) {
      return null;
    }

    // Validate required fields
    if (typeof parsed.drawingId !== 'string') {
      return null;
    }

    if (!parsed.offset || typeof parsed.offset.x !== 'number' || typeof parsed.offset.y !== 'number') {
      return null;
    }

    // Type-specific validation
    switch (parsed.type as AnchorType) {
      case 'block':
        if (typeof parsed.nodePos !== 'number') return null;
        return parsed as BlockAnchor;

      case 'range':
        if (typeof parsed.from !== 'number' || typeof parsed.to !== 'number') return null;
        return parsed as RangeAnchor;

      case 'inline':
        if (typeof parsed.nodePos !== 'number') return null;
        return parsed as InlineAnchor;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ============================================================================
// Snapping Utilities
// ============================================================================

export interface SnapGuide {
  type: 'left' | 'center' | 'right' | 'top' | 'bottom';
  position: number;
  label?: string;
}

/**
 * Calculate snap guides from paragraph bounds
 */
export function calculateSnapGuides(view: EditorView, pos: number): SnapGuide[] {
  const bounds = getBlockBounds(view, pos);
  if (!bounds) return [];

  return [
    { type: 'left', position: bounds.x, label: 'Paragraph left' },
    { type: 'center', position: bounds.x + bounds.width / 2, label: 'Paragraph center' },
    { type: 'right', position: bounds.x + bounds.width, label: 'Paragraph right' },
    { type: 'top', position: bounds.y, label: 'Paragraph top' },
    { type: 'bottom', position: bounds.y + bounds.height, label: 'Paragraph bottom' },
  ];
}

/**
 * Find nearest snap point within threshold
 */
export function findSnapPoint(
  value: number,
  guides: SnapGuide[],
  threshold = 8
): { guide: SnapGuide; snappedValue: number } | null {
  let nearest: { guide: SnapGuide; distance: number } | null = null;

  for (const guide of guides) {
    const distance = Math.abs(value - guide.position);
    if (distance <= threshold && (!nearest || distance < nearest.distance)) {
      nearest = { guide, distance };
    }
  }

  if (nearest) {
    return { guide: nearest.guide, snappedValue: nearest.guide.position };
  }

  return null;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const anchorManager = new AnchorManager();
