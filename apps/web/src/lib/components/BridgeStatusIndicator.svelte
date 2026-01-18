<script lang="ts">
  import type { BridgeConnectionStatus } from '$lib/ai/feedback-state.svelte';

  interface Props {
    status: BridgeConnectionStatus;
    onclick: () => void;
  }

  const { status, onclick }: Props = $props();

  const statusConfig = $derived(
    {
      unknown: {
        label: 'AI Bridge',
        color: 'var(--glow-text-tertiary)',
        bgColor: 'transparent',
      },
      checking: {
        label: 'Checking...',
        color: 'var(--glow-text-secondary)',
        bgColor: 'transparent',
      },
      connected: {
        label: 'AI Bridge',
        color: '#4caf50',
        bgColor: 'rgba(76, 175, 80, 0.1)',
      },
      disconnected: {
        label: 'AI Bridge',
        color: 'var(--glow-text-tertiary)',
        bgColor: 'transparent',
      },
    }[status],
  );
</script>

<button
  class="bridge-status"
  class:connected={status === 'connected'}
  class:disconnected={status === 'disconnected'}
  class:checking={status === 'checking'}
  {onclick}
  title={status === 'connected'
    ? 'Bridge server connected'
    : status === 'checking'
      ? 'Checking connection...'
      : 'Bridge server not connected - Click to set up'}
  aria-label="AI Bridge status"
>
  <!-- Status dot -->
  <span class="status-dot" style:background-color={statusConfig.color}>
    {#if status === 'checking'}
      <span class="spinner"></span>
    {/if}
  </span>

  <span class="status-label">{statusConfig.label}</span>

  <!-- Dropdown chevron -->
  <svg
    class="chevron"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
</button>

<style>
  .bridge-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--glow-text-secondary);
    background: none;
    border: 1px solid transparent;
    padding: 4px 10px;
    border-radius: 16px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .bridge-status:hover {
    background-color: var(--glow-bg-elevated);
    border-color: var(--glow-border-subtle);
  }

  .bridge-status.connected {
    color: #4caf50;
  }

  .bridge-status.connected:hover {
    background-color: rgba(76, 175, 80, 0.1);
    border-color: rgba(76, 175, 80, 0.3);
  }

  .bridge-status.disconnected {
    color: var(--glow-text-tertiary);
  }

  .bridge-status.checking {
    color: var(--glow-text-secondary);
  }

  .status-dot {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .bridge-status.connected .status-dot {
    background-color: #4caf50;
    box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
  }

  .bridge-status.disconnected .status-dot {
    background-color: #757575;
  }

  .bridge-status.checking .status-dot {
    background-color: var(--glow-text-secondary);
  }

  .spinner {
    position: absolute;
    inset: -3px;
    border: 2px solid transparent;
    border-top-color: var(--glow-text-secondary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .status-label {
    white-space: nowrap;
  }

  .chevron {
    opacity: 0.6;
    flex-shrink: 0;
  }

  .bridge-status:hover .chevron {
    opacity: 1;
  }
</style>
