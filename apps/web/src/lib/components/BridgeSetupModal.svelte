<script lang="ts">
  import { aiFeedbackState, type BridgeConnectionStatus } from '$lib/ai/feedback-state.svelte';
  import {
    detectPlatform,
    getPlatformDisplayName,
    getDownloadUrl,
    getInstallCommands,
    getBuildFromSourceCommands,
    ALL_PLATFORMS,
    DEFAULT_BRIDGE_URL,
    type Platform,
  } from '$lib/ai/bridge-config';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  const { isOpen, onClose }: Props = $props();

  let selectedPlatform = $state<Platform>(aiFeedbackState.detectedPlatform);
  let customUrl = $state(aiFeedbackState.bridgeUrl);
  let showAdvanced = $state(false);
  let copiedCommand = $state<string | null>(null);

  // Derived state from aiFeedbackState
  let bridgeStatus = $derived(aiFeedbackState.bridgeStatus);
  let bridgeConnected = $derived(aiFeedbackState.bridgeConnected);

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  async function checkConnection(): Promise<void> {
    await aiFeedbackState.checkBridgeConnection();
  }

  function saveCustomUrl(): void {
    aiFeedbackState.setBridgeUrl(customUrl);
    checkConnection();
  }

  function resetUrl(): void {
    customUrl = DEFAULT_BRIDGE_URL;
    aiFeedbackState.resetBridgeUrl();
    checkConnection();
  }

  async function copyToClipboard(text: string, id: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copiedCommand = id;
      setTimeout(() => {
        copiedCommand = null;
      }, 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      console.error('Failed to copy to clipboard');
    }
  }

  // Reset state when dialog opens
  $effect(() => {
    if (isOpen) {
      selectedPlatform = aiFeedbackState.detectedPlatform;
      customUrl = aiFeedbackState.bridgeUrl;
      showAdvanced = false;
      copiedCommand = null;
      // Check connection on open
      checkConnection();
    }
  });

  const installCommands = $derived(getInstallCommands(selectedPlatform));
  const downloadUrl = $derived(getDownloadUrl(selectedPlatform));
  const buildCommands = $derived(getBuildFromSourceCommands());
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <div class="dialog-overlay" onclick={onClose} onkeydown={handleKeyDown} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
    >
      <div class="dialog-header">
        <h3 id="dialog-title">AI Bridge Setup</h3>
        <button class="close-button" onclick={onClose} aria-label="Close">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Status Banner -->
      <div
        class="status-banner"
        class:connected={bridgeConnected}
        class:disconnected={!bridgeConnected && bridgeStatus !== 'checking'}
        class:checking={bridgeStatus === 'checking'}
      >
        <div class="status-content">
          <span class="status-dot"></span>
          <span class="status-text">
            {#if bridgeStatus === 'checking'}
              Checking connection...
            {:else if bridgeConnected}
              Connected to bridge server
            {:else}
              Bridge server not connected
            {/if}
          </span>
        </div>
        {#if bridgeStatus !== 'checking'}
          <button class="check-button" onclick={checkConnection}>
            {bridgeConnected ? 'Refresh' : 'Check Again'}
          </button>
        {/if}
      </div>

      <div class="dialog-content">
        {#if !bridgeConnected}
          <!-- Quick Start Section -->
          <section class="section">
            <h4>Quick Start</h4>
            <p class="description">
              Download and run the bridge server for your platform to enable AI features.
            </p>

            <!-- Platform selector -->
            <div class="platform-selector">
              <label for="platform-select">Platform:</label>
              <select id="platform-select" bind:value={selectedPlatform}>
                {#each ALL_PLATFORMS as platform}
                  <option value={platform}>
                    {getPlatformDisplayName(platform)}
                    {platform === aiFeedbackState.detectedPlatform ? ' (detected)' : ''}
                  </option>
                {/each}
              </select>
            </div>

            <!-- Download button -->
            {#if downloadUrl}
              <a href={downloadUrl} class="download-button" download>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download for {getPlatformDisplayName(selectedPlatform)}
              </a>
            {:else}
              <p class="no-download">
                No pre-built binary available for this platform. Use build from source below.
              </p>
            {/if}

            <!-- Terminal commands -->
            <div class="commands-section">
              <div class="commands-header">
                <span>Or run in terminal:</span>
              </div>

              <div class="command-block">
                <div class="command-label">1. Download & setup:</div>
                <pre class="command">{installCommands.download.join('\n')}</pre>
                <button
                  class="copy-button"
                  onclick={() =>
                    copyToClipboard(
                      installCommands.download
                        .filter((l) => !l.startsWith('#') && l.trim())
                        .join('\n'),
                      'download',
                    )}
                >
                  {copiedCommand === 'download' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div class="command-block">
                <div class="command-label">2. Start the server:</div>
                <pre class="command">{installCommands.run.join('\n')}</pre>
                <button
                  class="copy-button"
                  onclick={() => copyToClipboard(installCommands.run.join('\n'), 'run')}
                >
                  {copiedCommand === 'run' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <!-- Build from source (collapsible) -->
            <details class="build-from-source">
              <summary>Build from source</summary>
              <p class="description">Requires Rust toolchain installed.</p>
              <div class="command-block">
                <pre class="command">{buildCommands.join('\n')}</pre>
                <button
                  class="copy-button"
                  onclick={() =>
                    copyToClipboard(
                      buildCommands.filter((l) => !l.startsWith('#') && l.trim()).join('\n'),
                      'build',
                    )}
                >
                  {copiedCommand === 'build' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </details>
          </section>
        {:else}
          <!-- Connected state -->
          <section class="section">
            <h4>Connection Info</h4>
            <div class="info-row">
              <span class="info-label">Server URL:</span>
              <code class="info-value">{aiFeedbackState.bridgeUrl}</code>
            </div>
            <p class="success-message">
              You can now use @claude mentions in comments to get AI feedback on your documents.
            </p>
          </section>
        {/if}

        <!-- Advanced Settings (collapsible) -->
        <details class="advanced-section" bind:open={showAdvanced}>
          <summary>Advanced Settings</summary>
          <div class="advanced-content">
            <label for="custom-url">Bridge Server URL:</label>
            <div class="url-input-row">
              <input
                id="custom-url"
                type="text"
                bind:value={customUrl}
                placeholder="http://localhost:3847"
              />
              <button class="save-button" onclick={saveCustomUrl}>Save</button>
              {#if customUrl !== DEFAULT_BRIDGE_URL}
                <button class="reset-button" onclick={resetUrl}>Reset</button>
              {/if}
            </div>
          </div>
        </details>
      </div>

      <div class="dialog-footer">
        <button class="primary" onclick={onClose}>
          {bridgeConnected ? 'Done' : 'Close'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background-color: var(--glow-bg-elevated, #1a1a1a);
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 12px;
    min-width: 480px;
    max-width: 560px;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--glow-border-default, #333);
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--glow-text-primary, #fff);
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--glow-text-tertiary, #666);
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .close-button:hover {
    background-color: var(--glow-bg-surface, #222);
    color: var(--glow-text-secondary, #aaa);
  }

  .status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    margin: 0;
    background-color: rgba(100, 100, 100, 0.1);
    border-bottom: 1px solid var(--glow-border-default, #333);
  }

  .status-banner.connected {
    background-color: rgba(76, 175, 80, 0.1);
  }

  .status-banner.disconnected {
    background-color: rgba(239, 68, 68, 0.05);
  }

  .status-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #757575;
  }

  .connected .status-dot {
    background-color: #4caf50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
  }

  .disconnected .status-dot {
    background-color: #ef4444;
  }

  .checking .status-dot {
    background-color: #f59e0b;
    animation: pulse 1s ease infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .status-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary, #fff);
  }

  .check-button {
    font-size: 12px;
    padding: 6px 12px;
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 6px;
    background: none;
    color: var(--glow-text-secondary, #aaa);
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .check-button:hover {
    background-color: var(--glow-bg-surface, #222);
    border-color: var(--glow-border-hover, #444);
  }

  .dialog-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .section {
    margin-bottom: 20px;
  }

  .section h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--glow-text-primary, #fff);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .description {
    margin: 0 0 16px 0;
    font-size: 13px;
    color: var(--glow-text-secondary, #aaa);
    line-height: 1.5;
  }

  .platform-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .platform-selector label {
    font-size: 13px;
    color: var(--glow-text-secondary, #aaa);
  }

  .platform-selector select {
    flex: 1;
    padding: 8px 12px;
    font-size: 13px;
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 6px;
    background-color: var(--glow-bg-surface, #121212);
    color: var(--glow-text-primary, #fff);
    cursor: pointer;
  }

  .download-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    background-color: var(--glow-accent-primary, #60a5fa);
    border: none;
    border-radius: 8px;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.15s;
    margin-bottom: 20px;
  }

  .download-button:hover {
    background-color: var(--glow-accent-hover, #3b82f6);
  }

  .no-download {
    font-size: 13px;
    color: var(--glow-text-tertiary, #666);
    margin-bottom: 16px;
  }

  .commands-section {
    margin-top: 16px;
  }

  .commands-header {
    font-size: 13px;
    color: var(--glow-text-secondary, #aaa);
    margin-bottom: 12px;
  }

  .command-block {
    position: relative;
    margin-bottom: 12px;
  }

  .command-label {
    font-size: 12px;
    color: var(--glow-text-tertiary, #666);
    margin-bottom: 4px;
  }

  .command {
    margin: 0;
    padding: 12px;
    padding-right: 70px;
    font-size: 12px;
    font-family: var(--glow-font-mono, monospace);
    background-color: var(--glow-bg-surface, #121212);
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 6px;
    color: var(--glow-text-secondary, #aaa);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
  }

  .copy-button {
    position: absolute;
    top: 24px;
    right: 8px;
    padding: 4px 10px;
    font-size: 11px;
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 4px;
    background-color: var(--glow-bg-elevated, #1a1a1a);
    color: var(--glow-text-tertiary, #666);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .copy-button:hover {
    background-color: var(--glow-bg-surface, #222);
    color: var(--glow-text-secondary, #aaa);
  }

  .build-from-source,
  .advanced-section {
    margin-top: 16px;
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 8px;
  }

  .build-from-source summary,
  .advanced-section summary {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--glow-text-secondary, #aaa);
    cursor: pointer;
    user-select: none;
  }

  .build-from-source summary:hover,
  .advanced-section summary:hover {
    color: var(--glow-text-primary, #fff);
  }

  .build-from-source[open],
  .advanced-section[open] {
    background-color: rgba(0, 0, 0, 0.2);
  }

  .build-from-source .command-block,
  .build-from-source .description {
    margin: 0 16px 16px;
  }

  .advanced-content {
    padding: 0 16px 16px;
  }

  .advanced-content label {
    display: block;
    font-size: 12px;
    color: var(--glow-text-tertiary, #666);
    margin-bottom: 6px;
  }

  .url-input-row {
    display: flex;
    gap: 8px;
  }

  .url-input-row input {
    flex: 1;
    padding: 8px 12px;
    font-size: 13px;
    font-family: var(--glow-font-mono, monospace);
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 6px;
    background-color: var(--glow-bg-surface, #121212);
    color: var(--glow-text-primary, #fff);
    outline: none;
  }

  .url-input-row input:focus {
    border-color: var(--glow-accent-primary, #60a5fa);
  }

  .save-button,
  .reset-button {
    padding: 8px 14px;
    font-size: 12px;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .save-button {
    background-color: var(--glow-accent-primary, #60a5fa);
    border: 1px solid var(--glow-accent-primary, #60a5fa);
    color: #fff;
  }

  .save-button:hover {
    background-color: var(--glow-accent-hover, #3b82f6);
  }

  .reset-button {
    background: none;
    border: 1px solid var(--glow-border-default, #333);
    color: var(--glow-text-secondary, #aaa);
  }

  .reset-button:hover {
    background-color: var(--glow-bg-surface, #222);
    border-color: var(--glow-border-hover, #444);
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .info-label {
    font-size: 13px;
    color: var(--glow-text-tertiary, #666);
  }

  .info-value {
    font-size: 13px;
    font-family: var(--glow-font-mono, monospace);
    color: var(--glow-text-secondary, #aaa);
    background-color: var(--glow-bg-surface, #121212);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .success-message {
    margin: 0;
    font-size: 13px;
    color: #4caf50;
    line-height: 1.5;
  }

  .dialog-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--glow-border-default, #333);
    display: flex;
    justify-content: flex-end;
  }

  .dialog-footer button.primary {
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 500;
    background-color: var(--glow-accent-primary, #60a5fa);
    border: 1px solid var(--glow-accent-primary, #60a5fa);
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .dialog-footer button.primary:hover {
    background-color: var(--glow-accent-hover, #3b82f6);
  }
</style>
