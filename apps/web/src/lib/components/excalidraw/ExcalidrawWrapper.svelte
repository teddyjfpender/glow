<script lang="ts">
  /**
   * Svelte wrapper for the React Excalidraw component
   * Handles dynamic loading and React-to-Svelte bridging
   */
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type {
    ExcalidrawScene,
    ExcalidrawElement,
    ExcalidrawAppState,
    ExcalidrawFiles,
  } from '$lib/editor/extensions/excalidraw-utils';
  import { getInitialData } from '$lib/editor/extensions/excalidraw-utils';

  interface Props {
    scene: ExcalidrawScene;
    theme?: 'light' | 'dark';
    viewModeEnabled?: boolean;
    zenModeEnabled?: boolean;
    gridModeEnabled?: boolean;
    onchange?: (
      elements: ExcalidrawElement[],
      appState: Partial<ExcalidrawAppState>,
      files: ExcalidrawFiles
    ) => void;
    onready?: () => void;
  }

  const {
    scene,
    theme = 'dark',
    viewModeEnabled = false,
    zenModeEnabled = false,
    gridModeEnabled = false,
    onchange,
    onready,
  }: Props = $props();

  let containerRef: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reactRoot: any = null;
  let excalidrawAPI: unknown = null;
  let isLoaded = $state(false);
  let loadError = $state<string | null>(null);

  async function loadExcalidraw(): Promise<void> {
    if (!browser) {
      return;
    }

    try {
      // Dynamic imports for React and Excalidraw
      const [ReactModule, ReactDOMModule, ExcalidrawModule] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('@excalidraw/excalidraw'),
      ]);

      // Store references for re-rendering in effects
      React = ReactModule;
      const { createRoot } = ReactDOMModule;
      Excalidraw = ExcalidrawModule.Excalidraw;

      // Import CSS
      await import('@excalidraw/excalidraw/index.css');

      if (!containerRef) {
        loadError = 'Container not ready';
        return;
      }

      // Create React root
      reactRoot = createRoot(containerRef);

      // getInitialData now enforces dark theme and background color
      const initialData = getInitialData(scene, theme === 'dark');

      // Render Excalidraw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const excalidrawProps: any = {
        initialData,
        theme,
        viewModeEnabled,
        zenModeEnabled,
        gridModeEnabled,
        UIOptions: {
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: true,
          },
          tools: {
            image: false,
          },
          // Note: welcomeScreen is a top-level prop, not inside UIOptions
        },
        // Disable welcome screen entirely - this must be a top-level prop
        renderTopRightUI: () => null,
        excalidrawAPI: (api: unknown) => {
          excalidrawAPI = api;
          onready?.();
        },
        onChange: (
          elements: unknown[],
          appState: unknown,
          files: unknown
        ) => {
          onchange?.(
            elements as ExcalidrawElement[],
            appState as Partial<ExcalidrawAppState>,
            files as ExcalidrawFiles
          );
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reactRoot.render(ReactModule.default.createElement(Excalidraw as any, excalidrawProps));
      isLoaded = true;
    } catch (error) {
      console.error('[ExcalidrawWrapper] Error loading Excalidraw:', error);
      loadError = error instanceof Error ? error.message : 'Failed to load Excalidraw';
    }
  }

  onMount(() => {
    void loadExcalidraw();
  });

  onDestroy(() => {
    reactRoot?.unmount();
    reactRoot = null;
    excalidrawAPI = null;
  });

  // Store references for potential re-rendering
  let React: typeof import('react') | null = null;
  let Excalidraw: unknown = null;

  // Track previous values to detect actual changes
  let prevViewMode: boolean | undefined;
  let prevZenMode: boolean | undefined;
  let prevGridMode: boolean | undefined;
  let prevTheme: string | undefined;

  // Re-render only when mode/config props change (not scene)
  $effect(() => {
    // Track these props for reactivity
    const _viewMode = viewModeEnabled;
    const _zenMode = zenModeEnabled;
    const _gridMode = gridModeEnabled;
    const _theme = theme;

    // Only re-render if already loaded and props actually changed
    if (!isLoaded || !React || !Excalidraw || !reactRoot) return;

    // Check if any relevant prop changed
    const hasChanges =
      prevViewMode !== _viewMode ||
      prevZenMode !== _zenMode ||
      prevGridMode !== _gridMode ||
      prevTheme !== _theme;

    if (!hasChanges) return;

    // Update previous values
    prevViewMode = _viewMode;
    prevZenMode = _zenMode;
    prevGridMode = _gridMode;
    prevTheme = _theme;

    // Get current scene data (read outside of effect tracking)
    const currentScene = scene;
    const initialData = getInitialData(currentScene, _theme === 'dark');

    const excalidrawProps: any = {
      initialData,
      theme: _theme,
      viewModeEnabled: _viewMode,
      zenModeEnabled: _zenMode,
      gridModeEnabled: _gridMode,
      UIOptions: {
        canvasActions: {
          changeViewBackgroundColor: true,
          clearCanvas: true,
          export: false,
          loadScene: false,
          saveToActiveFile: false,
          toggleTheme: true,
        },
        tools: {
          image: false,
        },
      },
      renderTopRightUI: () => null,
      excalidrawAPI: (api: unknown) => {
        excalidrawAPI = api;
        onready?.();
      },
      onChange: (
        elements: unknown[],
        appState: unknown,
        files: unknown
      ) => {
        onchange?.(
          elements as ExcalidrawElement[],
          appState as Partial<ExcalidrawAppState>,
          files as ExcalidrawFiles
        );
      },
    };

    // @ts-ignore - React module default export
    reactRoot.render((React as any).default.createElement(Excalidraw, excalidrawProps));
  });
</script>

<div class="excalidraw-wrapper" class:loaded={isLoaded} class:view-mode={viewModeEnabled} style="width: 100%; height: 100%;">
  {#if loadError}
    <div class="error-state">
      <p>Failed to load drawing editor</p>
      <p class="error-detail">{loadError}</p>
    </div>
  {:else if !isLoaded}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading drawing editor...</p>
    </div>
  {/if}

  <div bind:this={containerRef} class="excalidraw-react-container"></div>
</div>

<style>
  .excalidraw-wrapper {
    width: 100%;
    height: 100%;
    flex: 1;
    position: relative;
    background-color: transparent;
    border-radius: 8px;
    overflow: visible;
    min-height: 350px;
  }

  .excalidraw-react-container {
    width: 100%;
    height: 100%;
    min-height: 350px;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    pointer-events: auto;
  }

  .loading-state,
  .error-state {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--glow-text-secondary);
    z-index: 2;
    background-color: var(--glow-bg-elevated);
  }

  .excalidraw-wrapper.loaded .loading-state {
    display: none;
    pointer-events: none;
  }

  .error-state {
    background-color: var(--glow-bg-surface);
  }

  .error-detail {
    font-size: 12px;
    color: var(--glow-text-tertiary);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--glow-border-subtle);
    border-top-color: var(--glow-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Ensure Excalidraw fills the container properly */
  :global(.excalidraw-wrapper .excalidraw) {
    width: 100% !important;
    height: 100% !important;
  }

  :global(.excalidraw-wrapper .excalidraw.excalidraw-container) {
    width: 100% !important;
    height: 100% !important;
  }

  .excalidraw-react-container :global(.excalidraw) {
    width: 100% !important;
    height: 100% !important;
  }

  /* Override Excalidraw styles for dark mode */
  :global(.excalidraw) {
    --color-primary: var(--glow-accent) !important;
  }

  :global(.excalidraw.theme--dark) {
    --color-surface-primary: var(--glow-bg-surface) !important;
    --color-surface-secondary: var(--glow-bg-elevated) !important;
  }

  /* Ensure pointer events work inside Excalidraw */
  :global(.excalidraw-wrapper .excalidraw) {
    pointer-events: auto !important;
  }

  :global(.excalidraw-wrapper .excalidraw canvas) {
    touch-action: none;
    pointer-events: auto !important;
  }

  :global(.excalidraw-wrapper .excalidraw.excalidraw-container) {
    pointer-events: auto !important;
  }

  /* Hide welcome screen elements - comprehensive selectors */
  :global(.excalidraw-wrapper .excalidraw [class*="welcome-screen"]),
  :global(.excalidraw-wrapper .excalidraw [class*="WelcomeScreen"]),
  :global(.excalidraw-wrapper .excalidraw [class*="welcomeScreen"]),
  :global(.excalidraw-wrapper .excalidraw .welcome-screen-decor),
  :global(.excalidraw-wrapper .excalidraw .welcome-screen-center),
  :global(.excalidraw-wrapper .excalidraw .welcome-screen-menu),
  :global(.excalidraw-wrapper .excalidraw .welcome-screen-menu-hints),
  :global(.excalidraw-wrapper .excalidraw .virgil),
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper .welcome-screen-center),
  :global(.excalidraw-wrapper .excalidraw div[class*="welcome"]),
  :global(.excalidraw-wrapper .excalidraw div[class*="Welcome"]) {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
  }

  /* Additional welcome screen suppression - placeholder for targeted rules */

  /* Hide any hints or tips that may appear */
  :global(.excalidraw-wrapper .excalidraw [class*="hint"]),
  :global(.excalidraw-wrapper .excalidraw [class*="Hint"]),
  :global(.excalidraw-wrapper .excalidraw [class*="tip"]),
  :global(.excalidraw-wrapper .excalidraw [class*="Tip"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide help dialog/button */
  :global(.excalidraw-wrapper .excalidraw .HelpDialog),
  :global(.excalidraw-wrapper .excalidraw [class*="HelpDialog"]),
  :global(.excalidraw-wrapper .excalidraw button[aria-label="Help"]),
  :global(.excalidraw-wrapper .excalidraw .help-icon),
  :global(.excalidraw-wrapper .excalidraw [class*="help-icon"]) {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Hide footer bar (hamburger menu, zoom, etc.) */
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__footer),
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__footer-left),
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__footer-right),
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__footer-center),
  :global(.excalidraw-wrapper .excalidraw [class*="footer"]) {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Hide main menu / hamburger button */
  :global(.excalidraw-wrapper .excalidraw .main-menu-trigger),
  :global(.excalidraw-wrapper .excalidraw [class*="main-menu"]),
  :global(.excalidraw-wrapper .excalidraw button[aria-label="Main menu"]),
  :global(.excalidraw-wrapper .excalidraw .dropdown-menu-button) {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Hide social/external links */
  :global(.excalidraw-wrapper .excalidraw a[href*="github"]),
  :global(.excalidraw-wrapper .excalidraw a[href*="twitter"]),
  :global(.excalidraw-wrapper .excalidraw a[href*="discord"]),
  :global(.excalidraw-wrapper .excalidraw a[href*="excalidraw.com"]),
  :global(.excalidraw-wrapper .excalidraw [class*="social"]),
  :global(.excalidraw-wrapper .excalidraw [class*="follow"]) {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Ensure Excalidraw UI elements are visible (toolbar, menu) */
  :global(.excalidraw-wrapper .excalidraw .App-menu) {
    z-index: 100 !important;
  }

  :global(.excalidraw-wrapper .excalidraw .App-toolbar) {
    z-index: 100 !important;
  }

  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper) {
    z-index: 10 !important;
    pointer-events: auto !important;
  }

  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__top-right) {
    z-index: 100 !important;
  }

  :global(.excalidraw-wrapper .excalidraw .Island) {
    pointer-events: auto !important;
  }

  /* Remove borders - let Excalidraw's native dark mode filter handle backgrounds.
   * DO NOT set background colors here - the dark mode filter inverts colors,
   * so setting dark backgrounds would result in light appearance. */
  :global(.excalidraw-wrapper .excalidraw),
  :global(.excalidraw-wrapper .excalidraw-container),
  :global(.excalidraw-wrapper .excalidraw .excalidraw-container),
  :global(.excalidraw-react-container > div),
  :global(.excalidraw-react-container > div > div) {
    border: none !important;
    border-radius: 8px !important;
  }

  /* Target the root React element */
  :global(.excalidraw-react-container) {
    background: transparent !important;
  }

  :global(.excalidraw-wrapper .excalidraw .App-bottom-bar) {
    border: none !important;
  }

  /* Fix the main layer wrapper that has the white background */
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper) {
    background: transparent !important;
  }

  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__top-right),
  :global(.excalidraw-wrapper .excalidraw .layer-ui__wrapper__top-left) {
    background: transparent !important;
  }

  /* Remove any remaining white backgrounds */
  :global(.excalidraw-wrapper .excalidraw > div) {
    background: transparent !important;
  }

  /* Target the main excalidraw container borders only */
  :global(.excalidraw-wrapper > .excalidraw-react-container > div) {
    border: none !important;
  }

  /* Reset any box shadows that might look like borders */
  :global(.excalidraw-wrapper .excalidraw),
  :global(.excalidraw-wrapper .excalidraw-container) {
    box-shadow: none !important;
  }

  /* Ensure the interactive canvas element has proper styling */
  :global(.excalidraw-wrapper .interactive.excalidraw__canvas),
  :global(.excalidraw-wrapper .static.excalidraw__canvas) {
    background: transparent !important;
  }

  /* ========================================================================
   * VIEW MODE - Hide ALL UI except the canvas itself
   * Only applies when .view-mode class is present
   * ======================================================================== */

  /* Hide ALL layer-ui children in view mode - only canvas should show */
  :global(.excalidraw-wrapper.view-mode .excalidraw .layer-ui__wrapper > *) {
    display: none !important;
  }

  /* But keep the canvas itself visible */
  :global(.excalidraw-wrapper.view-mode .excalidraw .layer-ui__wrapper .layer-ui__canvas),
  :global(.excalidraw-wrapper.view-mode .excalidraw .layer-ui__wrapper > canvas) {
    display: block !important;
  }

  /* Hide the Island components (toolbar panels) */
  :global(.excalidraw-wrapper.view-mode .excalidraw .Island) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide App menu and toolbar completely */
  :global(.excalidraw-wrapper.view-mode .excalidraw .App-menu),
  :global(.excalidraw-wrapper.view-mode .excalidraw .App-menu_top),
  :global(.excalidraw-wrapper.view-mode .excalidraw .App-menu_left),
  :global(.excalidraw-wrapper.view-mode .excalidraw .App-toolbar),
  :global(.excalidraw-wrapper.view-mode .excalidraw .App-toolbar-container),
  :global(.excalidraw-wrapper.view-mode .excalidraw .App-bottom-bar),
  :global(.excalidraw-wrapper.view-mode .excalidraw .ToolIcon),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="ToolIcon"]) {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Hide any popover, tooltip, or floating UI */
  :global(.excalidraw-wrapper.view-mode .excalidraw .popover),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="popover"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Popover"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw .tooltip),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="tooltip"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Tooltip"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide color picker */
  :global(.excalidraw-wrapper.view-mode .excalidraw .color-picker),
  :global(.excalidraw-wrapper.view-mode .excalidraw .color-picker-content),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="color-picker"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="ColorPicker"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide any panel or sidebar */
  :global(.excalidraw-wrapper.view-mode .excalidraw .sidebar),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="sidebar"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Sidebar"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw .layer-ui__sidebar),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Panel"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="panel"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide zoom controls */
  :global(.excalidraw-wrapper.view-mode .excalidraw .zoom-actions),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="zoom"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Zoom"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide stats/info panels */
  :global(.excalidraw-wrapper.view-mode .excalidraw .Stats),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Stats"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="stats"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide undo/redo */
  :global(.excalidraw-wrapper.view-mode .excalidraw .undo-redo-buttons),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="undo"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="redo"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide library */
  :global(.excalidraw-wrapper.view-mode .excalidraw .library-button),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="library"]),
  :global(.excalidraw-wrapper.view-mode .excalidraw [class*="Library"]) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Hide any button in view mode */
  :global(.excalidraw-wrapper.view-mode .excalidraw button) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Ensure only the canvas area is visible and clean */
  :global(.excalidraw-wrapper.view-mode .excalidraw .excalidraw__canvas) {
    display: block !important;
    visibility: visible !important;
  }
</style>
