/**
 * Utility functions for Excalidraw integration
 */

export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  opacity: number;
  groupIds: string[];
  frameId: string | null;
  roundness: unknown;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: unknown[];
  updated: number;
  link: string | null;
  locked: boolean;
  customData?: Record<string, unknown>;
}

export interface ExcalidrawAppState {
  theme: 'light' | 'dark';
  viewBackgroundColor: string;
  zoom: { value: number };
  scrollX: number;
  scrollY: number;
  gridSize: number | null;
  collaborators: Map<string, unknown>;
}

export interface ExcalidrawFiles {
  [id: string]: {
    mimeType: string;
    id: string;
    dataURL: string;
    created: number;
    lastRetrieved: number;
  };
}

export interface ExcalidrawScene {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: ExcalidrawFiles;
}

/**
 * Creates an empty Excalidraw scene
 */
export function createEmptyScene(theme: 'light' | 'dark' = 'dark'): ExcalidrawScene {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'glow-docs',
    elements: [],
    appState: {
      theme,
      // Use #ffffff for live Excalidraw - its dark mode filter inverts this to dark
      viewBackgroundColor: '#ffffff',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
      gridSize: null,
      collaborators: new Map(),
    },
    files: {},
  };
}

/**
 * Serializes scene data to a JSON string for storage
 * Converts Map to array for JSON compatibility
 */
export function serializeScene(scene: ExcalidrawScene): string {
  try {
    // Create a copy with collaborators converted to array for JSON serialization
    const serializable = {
      ...scene,
      appState: {
        ...scene.appState,
        // Convert Map to array entries for JSON serialization
        collaborators: scene.appState.collaborators
          ? Array.from(scene.appState.collaborators.entries())
          : [],
      },
    };
    return JSON.stringify(serializable);
  } catch {
    return JSON.stringify(createEmptyScene());
  }
}

/**
 * Deserializes a JSON string back to scene data
 * Converts collaborators array back to Map
 */
export function deserializeScene(json: string): ExcalidrawScene {
  if (!json || json.trim() === '') {
    return createEmptyScene();
  }

  try {
    const parsed = JSON.parse(json);
    // Validate basic structure
    if (!parsed.elements || !Array.isArray(parsed.elements)) {
      return createEmptyScene();
    }

    // Convert collaborators from array back to Map
    const collaborators = Array.isArray(parsed.appState?.collaborators)
      ? new Map(parsed.appState.collaborators)
      : new Map();

    return {
      ...parsed,
      appState: {
        ...parsed.appState,
        collaborators,
      },
    } as ExcalidrawScene;
  } catch {
    return createEmptyScene();
  }
}

/**
 * Generates a unique ID for diagram nodes
 */
export function generateDiagramId(): string {
  return `excalidraw-${crypto.randomUUID()}`;
}

/**
 * Extracts just the elements and files for the Excalidraw component
 * Ensures collaborators is always a Map
 * Always enforces dark theme background
 */
export function getInitialData(scene: ExcalidrawScene, forceDarkTheme = true): {
  elements: ExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: ExcalidrawFiles;
} {
  // Ensure collaborators is a Map (Excalidraw requires this)
  const appState = scene.appState ?? {};
  const collaborators = appState.collaborators instanceof Map
    ? appState.collaborators
    : new Map();

  // Determine theme and background color
  // For the live Excalidraw component, use #ffffff for dark mode because
  // Excalidraw applies a CSS filter (invert + hue-rotate) that inverts it to dark
  const theme = forceDarkTheme ? 'dark' : (appState.theme ?? 'dark');
  const viewBackgroundColor = '#ffffff';

  return {
    elements: scene.elements ?? [],
    appState: {
      ...appState,
      collaborators,
      theme,
      viewBackgroundColor,
    },
    files: scene.files ?? {},
  };
}

/**
 * Calculates the bounding box of all elements
 */
export function calculateBounds(elements: ExcalidrawElement[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.isDeleted) {
      continue;
    }
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Debounce function for auto-save
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
