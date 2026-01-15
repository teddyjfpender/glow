/**
 * Tests for ExcalidrawCore - Headless Excalidraw Wrapper
 * Following TDD - write tests first, then implement
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ExcalidrawScene,
  ExcalidrawAPI,
  ExcalidrawElement,
  Theme,
  ToolType,
  ExcalidrawChangeEvent,
} from '../core/types';
import {
  createEmptyScene,
  serializeScene,
  deserializeScene,
  calculateBounds,
  generateDrawingId,
  debounce,
} from '../core/excalidraw-core';

// Mock the Excalidraw module
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: vi.fn(),
  exportToSvg: vi.fn().mockResolvedValue(document.createElementNS('http://www.w3.org/2000/svg', 'svg')),
  exportToCanvas: vi.fn(),
  serializeAsJSON: vi.fn(),
}));

// Mock React
vi.mock('react', () => ({
  default: {
    createElement: vi.fn(),
  },
  createElement: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

describe('ExcalidrawCore', () => {
  let container: HTMLDivElement;
  let mockExcalidrawAPI: ExcalidrawAPI;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock Excalidraw API that would be provided by the component
    mockExcalidrawAPI = {
      updateScene: vi.fn(),
      getSceneElements: vi.fn(() => []),
      getAppState: vi.fn(() => ({
        theme: 'dark' as Theme,
        viewBackgroundColor: '#1e1e2e',
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
        gridSize: null,
        collaborators: new Map(),
        currentItemStrokeColor: '#ffffff',
        currentItemBackgroundColor: 'transparent',
        currentItemFillStyle: 'solid',
        currentItemStrokeWidth: 2,
        currentItemStrokeStyle: 'solid',
        currentItemRoundness: 2,
        currentItemOpacity: 100,
        currentItemFontFamily: 1,
        currentItemFontSize: 20,
        currentItemTextAlign: 'left',
        activeTool: { type: 'selection' as ToolType, locked: false },
        selectedElementIds: {},
        previousSelectedElementIds: {},
      })) as unknown as () => import('../core/types').ExcalidrawAppState,
      getFiles: vi.fn(() => ({})),
      setActiveTool: vi.fn(),
      resetScene: vi.fn(),
      refresh: vi.fn(),
      scrollToContent: vi.fn(),
    } as unknown as ExcalidrawAPI;
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it.todo('should create an instance with default options');

    it.todo('should accept a container element for mounting');

    it.todo('should load Excalidraw dynamically (client-side only)');

    it.todo('should not initialize on server-side (SSR safe)');

    it.todo('should emit onReady when Excalidraw API is available');

    it.todo('should pass initial scene to Excalidraw');

    it.todo('should apply theme option');

    it.todo('should apply viewModeEnabled option');
  });

  describe('Scene Management', () => {
    it.todo('should get current scene elements via getSceneElements()');

    it.todo('should update scene via updateScene()');

    it.todo('should reset scene via resetScene()');

    it.todo('should preserve files when updating scene');

    it.todo('should handle scene with no elements');

    it.todo('should filter deleted elements from scene');
  });

  describe('Tool Management', () => {
    it.todo('should set active tool via setActiveTool()');

    it.todo('should support locked tool mode');

    it.todo('should get current active tool from appState');

    it.todo('should support all standard tool types');

    const toolTypes: ToolType[] = [
      'selection',
      'rectangle',
      'diamond',
      'ellipse',
      'arrow',
      'line',
      'freedraw',
      'text',
      'eraser',
      'hand',
    ];

    toolTypes.forEach((tool) => {
      it.todo(`should set tool to ${tool}`);
    });
  });

  describe('Event Handling', () => {
    it.todo('should emit onChange when scene changes');

    it.todo('should debounce onChange events');

    it.todo('should emit onPointerDown on pointer down');

    it.todo('should emit onPointerUp on pointer up');

    it.todo('should not emit onChange in view mode');
  });

  describe('View Mode', () => {
    it.todo('should enable view mode via setViewMode(true)');

    it.todo('should disable editing in view mode');

    it.todo('should still allow zoom/pan in view mode');

    it.todo('should exit view mode via setViewMode(false)');
  });

  describe('Theme Support', () => {
    it.todo('should apply light theme');

    it.todo('should apply dark theme');

    it.todo('should update background color with theme');

    it.todo('should switch theme dynamically');
  });

  describe('Export Utilities', () => {
    it.todo('should export scene to SVG');

    it.todo('should export scene to Canvas');

    it.todo('should respect export options (padding, background)');

    it.todo('should handle export of empty scene');
  });

  describe('Cleanup', () => {
    it.todo('should unmount React root on destroy()');

    it.todo('should clear all event listeners on destroy()');

    it.todo('should not throw if destroy() called multiple times');
  });

  describe('CSS UI Hiding', () => {
    it.todo('should inject CSS to hide Excalidraw toolbar');

    it.todo('should inject CSS to hide Excalidraw panels');

    it.todo('should inject CSS to hide Excalidraw help button');

    it.todo('should preserve canvas and interactive elements');
  });
});

describe('Scene Utilities', () => {
  describe('createEmptyScene', () => {
    it('should create scene with correct structure', () => {
      const scene = createEmptyScene();
      expect(scene).toHaveProperty('type');
      expect(scene).toHaveProperty('version');
      expect(scene).toHaveProperty('source');
      expect(scene).toHaveProperty('elements');
      expect(scene).toHaveProperty('appState');
      expect(scene).toHaveProperty('files');
    });

    it('should set type to "excalidraw"', () => {
      const scene = createEmptyScene();
      expect(scene.type).toBe('excalidraw');
    });

    it('should set version to 2', () => {
      const scene = createEmptyScene();
      expect(scene.version).toBe(2);
    });

    it('should create empty elements array', () => {
      const scene = createEmptyScene();
      expect(scene.elements).toEqual([]);
    });

    it('should set default dark theme', () => {
      const scene = createEmptyScene();
      expect(scene.appState.theme).toBe('dark');
    });

    it('should set dark background color for dark theme', () => {
      const scene = createEmptyScene('dark');
      expect(scene.appState.viewBackgroundColor).toBe('#1e1e2e');
    });

    it('should set light background color for light theme', () => {
      const scene = createEmptyScene('light');
      expect(scene.appState.viewBackgroundColor).toBe('#ffffff');
    });

    it('should create empty collaborators Map', () => {
      const scene = createEmptyScene();
      expect(scene.appState.collaborators).toBeInstanceOf(Map);
      expect(scene.appState.collaborators?.size).toBe(0);
    });

    it('should create empty files object', () => {
      const scene = createEmptyScene();
      expect(scene.files).toEqual({});
    });
  });

  describe('serializeScene', () => {
    it('should serialize scene to JSON string', () => {
      const scene = createEmptyScene();
      const serialized = serializeScene(scene);
      expect(typeof serialized).toBe('string');
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should convert collaborators Map to array', () => {
      const scene = createEmptyScene();
      scene.appState.collaborators?.set('user1', { username: 'Test User' });
      const serialized = serializeScene(scene);
      const parsed = JSON.parse(serialized);
      expect(Array.isArray(parsed.appState.collaborators)).toBe(true);
    });

    it('should handle empty scene', () => {
      const scene = createEmptyScene();
      const serialized = serializeScene(scene);
      expect(serialized).toContain('"elements":[]');
    });

    it('should preserve all element properties', () => {
      const scene = createEmptyScene();
      scene.elements = [{
        id: 'test-id',
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 50,
        height: 50,
        angle: 0,
        strokeColor: '#000000',
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: 123,
        version: 1,
        versionNonce: 456,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      }];
      const serialized = serializeScene(scene);
      const parsed = JSON.parse(serialized);
      expect(parsed.elements[0].id).toBe('test-id');
      expect(parsed.elements[0].x).toBe(100);
    });
  });

  describe('deserializeScene', () => {
    it('should parse JSON string to scene', () => {
      const scene = createEmptyScene();
      const serialized = serializeScene(scene);
      const deserialized = deserializeScene(serialized);
      expect(deserialized.type).toBe('excalidraw');
      expect(deserialized.elements).toEqual([]);
    });

    it('should convert collaborators array back to Map', () => {
      const scene = createEmptyScene();
      scene.appState.collaborators?.set('user1', { username: 'Test' });
      const serialized = serializeScene(scene);
      const deserialized = deserializeScene(serialized);
      expect(deserialized.appState.collaborators).toBeInstanceOf(Map);
    });

    it('should return empty scene for empty string', () => {
      const deserialized = deserializeScene('');
      expect(deserialized.type).toBe('excalidraw');
      expect(deserialized.elements).toEqual([]);
    });

    it('should return empty scene for invalid JSON', () => {
      const deserialized = deserializeScene('not valid json');
      expect(deserialized.type).toBe('excalidraw');
      expect(deserialized.elements).toEqual([]);
    });

    it('should return empty scene for missing elements', () => {
      const deserialized = deserializeScene('{"type":"excalidraw"}');
      expect(deserialized.elements).toEqual([]);
    });
  });

  describe('calculateBounds', () => {
    it('should calculate bounding box of elements', () => {
      const elements: ExcalidrawElement[] = [
        createMockElement({ x: 0, y: 0, width: 100, height: 50 }),
        createMockElement({ x: 50, y: 50, width: 100, height: 50 }),
      ];
      const bounds = calculateBounds(elements);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(150);
      expect(bounds.maxY).toBe(100);
      expect(bounds.width).toBe(150);
      expect(bounds.height).toBe(100);
    });

    it('should ignore deleted elements', () => {
      const elements: ExcalidrawElement[] = [
        createMockElement({ x: 0, y: 0, width: 100, height: 50 }),
        createMockElement({ x: 200, y: 200, width: 100, height: 50, isDeleted: true }),
      ];
      const bounds = calculateBounds(elements);
      expect(bounds.maxX).toBe(100);
      expect(bounds.maxY).toBe(50);
    });

    it('should return zero bounds for empty array', () => {
      const bounds = calculateBounds([]);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it('should handle single element', () => {
      const elements: ExcalidrawElement[] = [
        createMockElement({ x: 10, y: 20, width: 30, height: 40 }),
      ];
      const bounds = calculateBounds(elements);
      expect(bounds.minX).toBe(10);
      expect(bounds.minY).toBe(20);
      expect(bounds.width).toBe(30);
      expect(bounds.height).toBe(40);
    });
  });

  describe('generateDrawingId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateDrawingId();
      const id2 = generateDrawingId();
      expect(id1).not.toBe(id2);
    });

    it('should prefix with excalidraw-', () => {
      const id = generateDrawingId();
      expect(id.startsWith('excalidraw-')).toBe(true);
    });
  });

  describe('debounce', () => {
    it('should delay function execution', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 60));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only call once for rapid invocations', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      await new Promise(resolve => setTimeout(resolve, 60));
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

// Helper function to create mock elements
function createMockElement(overrides: Partial<ExcalidrawElement> = {}): ExcalidrawElement {
  return {
    id: `element-${Math.random().toString(36).slice(2)}`,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: '#000000',
    backgroundColor: '#ffffff',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...overrides,
  };
}

describe('Preview Generation', () => {
  describe('generatePreviewSvg', () => {
    it.todo('should generate SVG from scene');

    it.todo('should apply theme to SVG');

    it.todo('should fit content with padding');

    it.todo('should handle empty scene');

    it.todo('should handle scene with images');
  });

  describe('generatePreviewDataUrl', () => {
    it.todo('should generate data URL from scene');

    it.todo('should return PNG data URL');

    it.todo('should respect max dimensions');
  });
});
