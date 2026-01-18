<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import cytoscape from 'cytoscape';
  import { backlinksState } from '$lib/state/backlinks.svelte';

  interface Props {
    onNodeClick?: (documentId: string) => void;
  }

  const { onNodeClick }: Props = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let cy: cytoscape.Core | null = null;
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    if (!containerRef) return;

    try {
      // Initialize backlinks index (loads from cache or rebuilds)
      await backlinksState.initialize();

      // Get graph data from the index
      const graphData = backlinksState.getGraphData();

      // Convert to Cytoscape elements
      const elements: cytoscape.ElementDefinition[] = [
        // Nodes
        ...graphData.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.title,
            linkCount: node.linkCount,
          },
        })),
        // Edges
        ...graphData.edges.map((edge, i) => ({
          data: {
            id: `edge-${i}`,
            source: edge.source,
            target: edge.target,
          },
        })),
      ];

      // Initialize Cytoscape
      cy = cytoscape({
        container: containerRef,
        elements,
        style: [
          // Node styling
          {
            selector: 'node',
            style: {
              'background-color': '#6366f1',
              'label': 'data(label)',
              'color': '#ffffff',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 8,
              'font-size': '12px',
              'font-family': 'system-ui, -apple-system, sans-serif',
              'text-max-width': '120px',
              'text-wrap': 'ellipsis',
              'width': 'mapData(linkCount, 0, 10, 30, 60)',
              'height': 'mapData(linkCount, 0, 10, 30, 60)',
              'border-width': 2,
              'border-color': '#4f46e5',
            },
          },
          // Highlighted/selected node
          {
            selector: 'node:selected',
            style: {
              'background-color': '#818cf8',
              'border-color': '#a5b4fc',
              'border-width': 3,
            },
          },
          // Hovered node
          {
            selector: 'node.hover',
            style: {
              'background-color': '#818cf8',
              'border-color': '#a5b4fc',
              'cursor': 'pointer',
            },
          },
          // Edge styling
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#4b5563',
              'target-arrow-color': '#4b5563',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.7,
            },
          },
          // Connected edges (when node is selected)
          {
            selector: 'edge.connected',
            style: {
              'line-color': '#6366f1',
              'target-arrow-color': '#6366f1',
              'opacity': 1,
              'width': 3,
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 500,
          nodeRepulsion: function() { return 8000; },
          idealEdgeLength: function() { return 100; },
          gravity: 0.25,
          numIter: 1000,
          padding: 50,
        },
        // Interaction options
        minZoom: 0.2,
        maxZoom: 3,
        wheelSensitivity: 0.3,
      });

      // Add event handlers
      cy.on('tap', 'node', (event) => {
        const node = event.target;
        const documentId = node.id();

        // Highlight connected edges
        cy?.edges().removeClass('connected');
        node.connectedEdges().addClass('connected');

        if (onNodeClick) {
          onNodeClick(documentId);
        }
      });

      cy.on('mouseover', 'node', (event) => {
        event.target.addClass('hover');
        containerRef!.style.cursor = 'pointer';
      });

      cy.on('mouseout', 'node', (event) => {
        event.target.removeClass('hover');
        containerRef!.style.cursor = 'default';
      });

      // Click on background to deselect
      cy.on('tap', (event) => {
        if (event.target === cy) {
          cy?.edges().removeClass('connected');
        }
      });

      isLoading = false;
    } catch (err) {
      console.error('Failed to build graph:', err);
      error = err instanceof Error ? err.message : 'Failed to load graph';
      isLoading = false;
    }
  });

  onDestroy(() => {
    cy?.destroy();
    cy = null;
  });

  // Expose methods for external control
  export function fitToView(): void {
    cy?.fit(undefined, 50);
  }

  export function zoomIn(): void {
    const currentZoom = cy?.zoom() ?? 1;
    cy?.zoom(currentZoom * 1.2);
  }

  export function zoomOut(): void {
    const currentZoom = cy?.zoom() ?? 1;
    cy?.zoom(currentZoom / 1.2);
  }

  export function resetLayout(): void {
    cy?.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      nodeRepulsion: function() { return 8000; },
      idealEdgeLength: function() { return 100; },
      gravity: 0.25,
      numIter: 1000,
      padding: 50,
    }).run();
  }
</script>

<div class="graph-container">
  <!-- Always render canvas so containerRef is available -->
  <div class="graph-canvas" bind:this={containerRef}></div>

  {#if isLoading}
    <div class="graph-loading">
      <div class="loading-spinner"></div>
      <span>Loading document graph...</span>
    </div>
  {:else if error}
    <div class="graph-error">
      <span>Failed to load graph: {error}</span>
    </div>
  {:else}
    <div class="graph-controls">
      <button onclick={() => zoomIn()} title="Zoom in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <button onclick={() => zoomOut()} title="Zoom out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <button onclick={() => fitToView()} title="Fit to view">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
      <button onclick={() => resetLayout()} title="Reset layout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .graph-container {
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #1a1a1a;
    border-radius: 8px;
    overflow: hidden;
  }

  .graph-canvas {
    width: 100%;
    height: 100%;
  }

  .graph-loading,
  .graph-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #9ca3af;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #374151;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .graph-error {
    color: #ef4444;
  }

  .graph-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    padding: 8px;
    border-radius: 8px;
    backdrop-filter: blur(8px);
  }

  .graph-controls button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #374151;
    border: none;
    border-radius: 6px;
    color: #d1d5db;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
  }

  .graph-controls button:hover {
    background: #4b5563;
    color: #ffffff;
  }

  .graph-controls button svg {
    width: 18px;
    height: 18px;
  }
</style>
