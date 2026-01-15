/**
 * Tests for Excalidraw TipTap Extension
 * Following TDD - write tests first, then implement
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// Mock the Excalidraw module to avoid React dependency in tests
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: vi.fn(),
  exportToSvg: vi.fn(),
  exportToBlob: vi.fn(),
}));

// Import will be created after tests
// import { ExcalidrawExtension } from './excalidraw';

describe('ExcalidrawExtension', () => {
  describe('Node Schema', () => {
    it.todo('should define an excalidraw node type');
    it.todo('should be a block-level node');
    it.todo('should be an atomic node (non-editable content)');
    it.todo('should be draggable');
  });

  describe('Node Attributes', () => {
    it.todo('should have a unique id attribute');
    it.todo('should store elements array as JSON string');
    it.todo('should store files object as JSON string');
    it.todo('should have width and height attributes with defaults');
    it.todo('should have a theme attribute defaulting to dark');
    it.todo('should have a version attribute for migrations');
  });

  describe('HTML Serialization', () => {
    it.todo('should serialize to div with data-type="excalidraw"');
    it.todo('should serialize all attributes as data attributes');
    it.todo('should parse HTML back to node with correct attributes');
  });

  describe('Commands', () => {
    it.todo('should provide insertExcalidraw command');
    it.todo('should insert node at current selection');
    it.todo('should provide updateExcalidraw command');
    it.todo('should update node attributes by id');
  });

  describe('Keyboard Shortcuts', () => {
    it.todo('should register Mod-Shift-D shortcut for inserting');
  });
});

describe('Excalidraw Data Utilities', () => {
  describe('serializeScene', () => {
    it.todo('should serialize elements array to JSON string');
    it.todo('should handle empty elements array');
    it.todo('should preserve element properties');
  });

  describe('deserializeScene', () => {
    it.todo('should parse JSON string to elements array');
    it.todo('should handle invalid JSON gracefully');
    it.todo('should return empty array for empty string');
  });

  describe('generatePreviewSvg', () => {
    it.todo('should generate SVG from scene data');
    it.todo('should handle empty scene');
    it.todo('should respect theme parameter');
  });
});

describe('Excalidraw State Management', () => {
  describe('excalidrawState', () => {
    it.todo('should track active diagram id');
    it.todo('should track editing mode (none, inline, modal)');
    it.todo('should track unsaved changes');
    it.todo('should provide openEditor method');
    it.todo('should provide closeEditor method');
    it.todo('should provide saveAndClose method');
  });
});
