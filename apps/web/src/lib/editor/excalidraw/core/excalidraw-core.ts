/**
 * ExcalidrawCore - Headless Excalidraw Wrapper
 *
 * Provides an imperative API for controlling Excalidraw while hiding
 * the native UI. Bridges React Excalidraw with Svelte components.
 */

import type {
  ExcalidrawScene,
  ExcalidrawElement,
  ExcalidrawAppState,
  ExcalidrawFiles,
  ExcalidrawAPI,
  ExcalidrawCoreOptions,
  ExcalidrawChangeEvent,
  Theme,
  ToolType,
  SetActiveToolOptions,
  BoundingBox,
} from './types';

// ============================================================================
// Scene Utilities
// ============================================================================

/**
 * Creates an empty Excalidraw scene with default settings
 */
export function createEmptyScene(theme: Theme = 'dark'): ExcalidrawScene {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'glow-docs',
    elements: [],
    appState: {
      theme,
      // Use #ffffff for live Excalidraw - its dark mode filter inverts this to dark
      // For exports, we use #070707ff directly with exportWithDarkMode: false
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
 * Serializes an Excalidraw scene to JSON string for storage
 * Converts Map objects to arrays for JSON compatibility
 */
export function serializeScene(scene: ExcalidrawScene): string {
  try {
    const serializable = {
      ...scene,
      appState: {
        ...scene.appState,
        collaborators: scene.appState.collaborators instanceof Map
          ? Array.from(scene.appState.collaborators.entries())
          : [],
      },
    };
    return JSON.stringify(serializable);
  } catch (error) {
    console.error('[ExcalidrawCore] Failed to serialize scene:', error);
    return JSON.stringify(createEmptyScene());
  }
}

/**
 * Deserializes a JSON string back to an Excalidraw scene
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
      type: 'excalidraw',
      version: parsed.version ?? 2,
      source: parsed.source ?? 'glow-docs',
      elements: parsed.elements,
      appState: {
        ...parsed.appState,
        collaborators,
      },
      files: parsed.files ?? {},
    };
  } catch (error) {
    console.error('[ExcalidrawCore] Failed to deserialize scene:', error);
    return createEmptyScene();
  }
}

/**
 * Calculates the bounding box of all non-deleted elements
 */
export function calculateBounds(elements: ExcalidrawElement[]): BoundingBox {
  const visibleElements = elements.filter(el => !el.isDeleted);

  if (visibleElements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of visibleElements) {
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
 * Generates a unique ID for drawings
 */
export function generateDrawingId(): string {
  return `excalidraw-${crypto.randomUUID()}`;
}

/**
 * Debounce utility for event handling
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
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

// ============================================================================
// CSS for hiding Excalidraw UI
// ============================================================================

const HIDE_UI_CSS = `
/* Hide Excalidraw native UI elements - comprehensive selectors */

/* Main menu / hamburger button */
.excalidraw-core-container .excalidraw .App-menu,
.excalidraw-core-container .excalidraw .App-menu__left,
.excalidraw-core-container .excalidraw .main-menu-trigger,
.excalidraw-core-container .excalidraw [class*="main-menu"],
.excalidraw-core-container .excalidraw .dropdown-menu-button,
.excalidraw-core-container .excalidraw button[aria-label="Main menu"],
.excalidraw-core-container .excalidraw .App-toolbar,
.excalidraw-core-container .excalidraw .App-toolbar-container {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Welcome screen - all variants */
.excalidraw-core-container .excalidraw .welcome-screen-decor,
.excalidraw-core-container .excalidraw .welcome-screen-center,
.excalidraw-core-container .excalidraw .welcome-screen-menu,
.excalidraw-core-container .excalidraw .welcome-screen-menu-hints,
.excalidraw-core-container .excalidraw [class*="welcome-screen"],
.excalidraw-core-container .excalidraw [class*="WelcomeScreen"],
.excalidraw-core-container .excalidraw .virgil,
.excalidraw-core-container .excalidraw .layer-ui__wrapper .welcome-screen-center {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Help dialog/button */
.excalidraw-core-container .excalidraw .HelpDialog,
.excalidraw-core-container .excalidraw .help-icon,
.excalidraw-core-container .excalidraw [class*="HelpDialog"],
.excalidraw-core-container .excalidraw button[aria-label="Help"],
.excalidraw-core-container .excalidraw [class*="help-icon"],
.excalidraw-core-container .excalidraw .ToolIcon_type_floating[aria-label="Help"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Footer bar and its contents (bottom bar with hamburger, zoom, etc.) */
.excalidraw-core-container .excalidraw .layer-ui__wrapper__footer,
.excalidraw-core-container .excalidraw .layer-ui__wrapper__footer-left,
.excalidraw-core-container .excalidraw .layer-ui__wrapper__footer-right,
.excalidraw-core-container .excalidraw .layer-ui__wrapper__footer-center,
.excalidraw-core-container .excalidraw .footer-center,
.excalidraw-core-container .excalidraw .App-bottom-bar,
.excalidraw-core-container .excalidraw [class*="footer"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Top right UI elements (collab, theme toggle, etc.) */
.excalidraw-core-container .excalidraw .layer-ui__wrapper__top-right,
.excalidraw-core-container .excalidraw [class*="top-right"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Color picker and other floating UI */
.excalidraw-core-container .excalidraw .color-picker-content,
.excalidraw-core-container .excalidraw .color-picker,
.excalidraw-core-container .excalidraw .popover {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Side panels */
.excalidraw-core-container .excalidraw .sidebar,
.excalidraw-core-container .excalidraw .layer-ui__sidebar {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Library button */
.excalidraw-core-container .excalidraw .library-button,
.excalidraw-core-container .excalidraw button[aria-label="Library"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Zoom controls if showing */
.excalidraw-core-container .excalidraw .zoom-actions,
.excalidraw-core-container .excalidraw [class*="zoom"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Undo/redo buttons */
.excalidraw-core-container .excalidraw .undo-redo-buttons {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Social/external links that might appear */
.excalidraw-core-container .excalidraw a[href*="github"],
.excalidraw-core-container .excalidraw a[href*="twitter"],
.excalidraw-core-container .excalidraw a[href*="discord"],
.excalidraw-core-container .excalidraw a[href*="excalidraw.com"],
.excalidraw-core-container .excalidraw [class*="social"],
.excalidraw-core-container .excalidraw [class*="follow"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Keep canvas interactive */
.excalidraw-core-container .excalidraw canvas {
  pointer-events: auto !important;
}

/* Style the container */
.excalidraw-core-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.excalidraw-core-container .excalidraw {
  width: 100% !important;
  height: 100% !important;
}

/* Dark theme styling */
.excalidraw-core-container .excalidraw.theme--dark {
  --color-surface-primary: #1e1e2e !important;
  --color-surface-secondary: #252536 !important;
}

/* Remove borders */
.excalidraw-core-container .excalidraw,
.excalidraw-core-container .excalidraw-container {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Hide Island UI containers (toolbar islands) */
.excalidraw-core-container .excalidraw .Island {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Ensure layer-ui shows nothing except canvas */
.excalidraw-core-container .excalidraw .layer-ui__wrapper > *:not(.layer-ui__canvas) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
`;

let styleInjected = false;

function injectStyles(): void {
  if (styleInjected || typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.id = 'excalidraw-core-styles';
  style.textContent = HIDE_UI_CSS;
  document.head.appendChild(style);
  styleInjected = true;
}

// ============================================================================
// ExcalidrawCore Class
// ============================================================================

export class ExcalidrawCore {
  private container: HTMLElement;
  private options: ExcalidrawCoreOptions;
  private reactRoot: ReturnType<typeof import('react-dom/client').createRoot> | null = null;
  private api: ExcalidrawAPI | null = null;
  private isDestroyed = false;
  private viewMode = false;
  private currentTheme: Theme;
  private debouncedOnChange: ((event: ExcalidrawChangeEvent) => void) | null = null;
  private hideUI: boolean;

  constructor(container: HTMLElement, options: ExcalidrawCoreOptions = {}) {
    this.container = container;
    this.options = options;
    this.currentTheme = options.theme ?? 'dark';
    this.viewMode = options.viewModeEnabled ?? false;
    this.hideUI = options.hideUI ?? true; // Default to hiding UI

    // Inject CSS to hide Excalidraw UI
    injectStyles();

    // Add container class for CSS targeting (only if hideUI is true)
    if (this.hideUI) {
      this.container.classList.add('excalidraw-core-container');
    }

    // Set up debounced onChange
    if (options.onChange) {
      this.debouncedOnChange = debounce(options.onChange, 300);
    }
  }

  /**
   * Initialize Excalidraw (must be called client-side only)
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      console.warn('[ExcalidrawCore] Cannot initialize destroyed instance');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('[ExcalidrawCore] Cannot initialize on server-side');
      return;
    }

    try {
      // Dynamic imports for React and Excalidraw
      const [ReactModule, ReactDOMModule, ExcalidrawModule] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('@excalidraw/excalidraw'),
      ]);

      // Import CSS
      await import('@excalidraw/excalidraw/index.css');

      const React = ReactModule.default;
      const { createRoot } = ReactDOMModule;
      const { Excalidraw } = ExcalidrawModule;

      if (this.isDestroyed) {
        return; // Check again after async loading
      }

      // Create React root
      this.reactRoot = createRoot(this.container);

      // Prepare initial data
      const initialScene = this.options.scene ?? createEmptyScene(this.currentTheme);
      const initialData = this.getInitialData(initialScene);

      // Excalidraw props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const excalidrawProps: any = {
        initialData,
        theme: this.currentTheme,
        viewModeEnabled: this.viewMode,
        zenModeEnabled: this.options.zenModeEnabled ?? true, // Hide UI
        gridModeEnabled: this.options.gridModeEnabled ?? false,
        UIOptions: {
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          tools: {
            image: false, // Disable image tool for now
          },
          // Disable welcome screen entirely
          welcomeScreen: false,
        },
        excalidrawAPI: (api: ExcalidrawAPI) => {
          this.api = api;
          // Defer onReady callback to ensure React component is fully mounted
          // This prevents "setState on unmounted component" warnings
          // Using requestAnimationFrame + setTimeout ensures we're past the
          // initial React render cycle and the component is stable
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (!this.isDestroyed && this.api) {
                this.options.onReady?.(api);
              }
            }, 0);
          });
        },
        onChange: (
          elements: ExcalidrawElement[],
          appState: Partial<ExcalidrawAppState>,
          files: ExcalidrawFiles
        ) => {
          if (!this.viewMode && this.debouncedOnChange) {
            this.debouncedOnChange({ elements, appState, files });
          }
        },
        onPointerDown: (
          activeTool: unknown,
          pointerDownState: unknown,
          event: unknown
        ) => {
          // Simplified pointer event handling
        },
        onPointerUp: (
          activeTool: unknown,
          pointerDownState: unknown,
          event: unknown
        ) => {
          // Trigger immediate save on pointer up
          if (!this.viewMode && this.options.onChange && this.api) {
            this.options.onChange({
              elements: this.api.getSceneElements(),
              appState: this.api.getAppState(),
              files: this.api.getFiles(),
            });
          }
        },
      };

      // Render Excalidraw
      this.reactRoot.render(React.createElement(Excalidraw, excalidrawProps));
    } catch (error) {
      console.error('[ExcalidrawCore] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get initial data in format expected by Excalidraw
   */
  private getInitialData(scene: ExcalidrawScene): {
    elements: ExcalidrawElement[];
    appState: Partial<ExcalidrawAppState>;
    files: ExcalidrawFiles;
  } {
    const appState = scene.appState ?? {};
    const collaborators = appState.collaborators instanceof Map
      ? appState.collaborators
      : new Map();

    return {
      elements: scene.elements ?? [],
      appState: {
        ...appState,
        collaborators,
        theme: this.currentTheme,
        // Use #ffffff - Excalidraw's dark mode filter inverts this to dark
        viewBackgroundColor: '#ffffff',
      },
      files: scene.files ?? {},
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Check if the API is ready
   */
  get isReady(): boolean {
    return this.api !== null && !this.isDestroyed;
  }

  /**
   * Get the Excalidraw API instance
   */
  getAPI(): ExcalidrawAPI | null {
    return this.api;
  }

  /**
   * Get current scene elements
   */
  getSceneElements(): ExcalidrawElement[] {
    return this.api?.getSceneElements() ?? [];
  }

  /**
   * Get current app state
   */
  getAppState(): ExcalidrawAppState | null {
    return this.api?.getAppState() ?? null;
  }

  /**
   * Get current files
   */
  getFiles(): ExcalidrawFiles {
    return this.api?.getFiles() ?? {};
  }

  /**
   * Get complete scene for serialization
   */
  getScene(): ExcalidrawScene {
    if (!this.api) {
      return createEmptyScene(this.currentTheme);
    }

    return {
      type: 'excalidraw',
      version: 2,
      source: 'glow-docs',
      elements: this.api.getSceneElements(),
      appState: this.api.getAppState(),
      files: this.api.getFiles(),
    };
  }

  /**
   * Update the scene
   */
  updateScene(scene: Partial<ExcalidrawScene>): void {
    if (!this.api) {
      console.warn('[ExcalidrawCore] API not ready');
      return;
    }

    this.api.updateScene({
      elements: scene.elements,
      appState: scene.appState,
      // files: scene.files, // Files handled separately
    });
  }

  /**
   * Set the active tool
   */
  setActiveTool(options: SetActiveToolOptions): void {
    if (!this.api) {
      console.warn('[ExcalidrawCore] API not ready');
      return;
    }

    this.api.setActiveTool(options);
  }

  /**
   * Get the current active tool
   */
  getActiveTool(): ToolType | null {
    const appState = this.api?.getAppState();
    return appState?.activeTool?.type ?? null;
  }

  /**
   * Reset the scene to empty
   */
  resetScene(): void {
    if (!this.api) {
      console.warn('[ExcalidrawCore] API not ready');
      return;
    }

    this.api.resetScene();
  }

  /**
   * Set view mode (read-only)
   */
  setViewMode(enabled: boolean): void {
    this.viewMode = enabled;
    // Note: View mode requires re-render in Excalidraw
    // This is a limitation - full re-render may be needed
  }

  /**
   * Get current view mode
   */
  getViewMode(): boolean {
    return this.viewMode;
  }

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    this.currentTheme = theme;

    if (this.api) {
      this.api.updateScene({
        appState: {
          theme,
          // Use #ffffff - Excalidraw's dark mode filter inverts this to dark
          viewBackgroundColor: '#ffffff',
        },
      });
    }
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Refresh Excalidraw (useful after resize/scroll)
   */
  refresh(): void {
    this.api?.refresh();
  }

  /**
   * Scroll to fit all content
   */
  scrollToContent(): void {
    this.api?.scrollToContent(undefined, { fitToViewport: true, animate: true });
  }

  /**
   * Destroy the instance and clean up
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }

    this.api = null;
    this.container.classList.remove('excalidraw-core-container');
  }
}

// ============================================================================
// Export Preview Generation
// ============================================================================

/**
 * Generate SVG preview of a scene
 */
export async function generatePreviewSvg(
  scene: ExcalidrawScene,
  options: { padding?: number; theme?: Theme } = {}
): Promise<SVGSVGElement | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { exportToSvg } = await import('@excalidraw/excalidraw');

    const visibleElements = scene.elements.filter(el => !el.isDeleted);
    if (visibleElements.length === 0) {
      return null;
    }

    const effectiveTheme = options.theme ?? (scene.appState.theme as Theme) ?? 'dark';

    const svg = await exportToSvg({
      elements: visibleElements,
      appState: {
        ...scene.appState,
        theme: effectiveTheme,
        // Don't apply dark mode filter for export - use colors directly
        // since we're specifying the exact background color we want
        exportWithDarkMode: false,
        exportBackground: true,
        viewBackgroundColor: effectiveTheme === 'dark' ? '#070707ff' : '#ffffff',
      },
      files: scene.files,
      exportPadding: options.padding ?? 16,
    });

    return svg;
  } catch (error) {
    console.error('[ExcalidrawCore] Failed to generate SVG preview:', error);
    return null;
  }
}

/**
 * Generate data URL preview of a scene
 */
export async function generatePreviewDataUrl(
  scene: ExcalidrawScene,
  options: { maxWidth?: number; maxHeight?: number; theme?: Theme } = {}
): Promise<string | null> {
  const svg = await generatePreviewSvg(scene, { theme: options.theme });
  if (!svg) {
    return null;
  }

  try {
    // Convert SVG to data URL
    const svgString = new XMLSerializer().serializeToString(svg);
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('[ExcalidrawCore] Failed to generate data URL:', error);
    return null;
  }
}
