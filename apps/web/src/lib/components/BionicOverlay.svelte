<script lang="ts">
  import { bionicState, transformToBionic } from '$lib/state/bionic.svelte';

  interface Props {
    html: string;
  }

  const { html }: Props = $props();

  // Transform the HTML to bionic format
  const bionicHtml = $derived(transformToBionic(html, bionicState.intensity));

  function handleClose(): void {
    bionicState.deactivate();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="bionic-overlay">
  <!-- Header bar -->
  <div class="bionic-header">
    <div class="bionic-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
      </svg>
      <span>Bionic Reading</span>
    </div>

    <div class="bionic-controls">
      <div class="intensity-selector">
        <span class="intensity-label">Intensity:</span>
        <button
          class="intensity-btn"
          class:active={bionicState.intensity === 'low'}
          onclick={() => bionicState.setIntensity('low')}
        >
          Low
        </button>
        <button
          class="intensity-btn"
          class:active={bionicState.intensity === 'medium'}
          onclick={() => bionicState.setIntensity('medium')}
        >
          Medium
        </button>
        <button
          class="intensity-btn"
          class:active={bionicState.intensity === 'high'}
          onclick={() => bionicState.setIntensity('high')}
        >
          High
        </button>
      </div>

      <button class="close-btn" onclick={handleClose} title="Exit Bionic Reading (Esc)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span>Exit</span>
      </button>
    </div>
  </div>

  <!-- Content area -->
  <div class="bionic-content-wrapper">
    <div class="bionic-page">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rendering bionic transformed content -->
      <div class="bionic-content">{@html bionicHtml}</div>
    </div>
  </div>
</div>

<style>
  .bionic-overlay {
    position: fixed;
    inset: 0;
    background-color: #525659;
    z-index: 9998;
    display: flex;
    flex-direction: column;
  }

  .bionic-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background-color: #1a1a1a;
    border-bottom: 1px solid var(--glow-border-default);
  }

  .bionic-title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--glow-accent-primary);
    font-size: 16px;
    font-weight: 600;
  }

  .bionic-controls {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .intensity-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .intensity-label {
    font-size: 13px;
    color: var(--glow-text-secondary);
    margin-right: 4px;
  }

  .intensity-btn {
    padding: 6px 12px;
    font-size: 13px;
    background-color: transparent;
    border: 1px solid var(--glow-border-default);
    border-radius: 6px;
    color: var(--glow-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .intensity-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .intensity-btn.active {
    background-color: var(--glow-accent-primary);
    border-color: var(--glow-accent-primary);
    color: white;
  }

  .close-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 14px;
    background-color: transparent;
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    color: var(--glow-text-primary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    background-color: var(--glow-bg-elevated);
  }

  .bionic-content-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
    display: flex;
    justify-content: center;
  }

  .bionic-page {
    width: 816px;
    min-height: 1056px;
    background-color: #121212;
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2);
    padding: 96px;
  }

  .bionic-content {
    font-family: var(--glow-font-sans);
    font-size: 11pt;
    line-height: 1.8;
    color: var(--glow-text-primary);
  }

  /* Bionic bold styling */
  .bionic-content :global(.bionic-bold) {
    font-weight: 700;
    color: var(--glow-text-primary);
  }

  /* Standard content styling */
  .bionic-content :global(p) {
    margin: 0 0 16px 0;
  }

  .bionic-content :global(h1) {
    font-size: 26pt;
    font-weight: 400;
    margin: 24px 0 16px 0;
    line-height: 1.3;
  }

  .bionic-content :global(h1 .bionic-bold) {
    font-weight: 600;
  }

  .bionic-content :global(h2) {
    font-size: 18pt;
    font-weight: 400;
    margin: 20px 0 12px 0;
    line-height: 1.4;
  }

  .bionic-content :global(h2 .bionic-bold) {
    font-weight: 600;
  }

  .bionic-content :global(h3) {
    font-size: 14pt;
    font-weight: 500;
    margin: 16px 0 10px 0;
    line-height: 1.4;
  }

  .bionic-content :global(h3 .bionic-bold) {
    font-weight: 700;
  }

  .bionic-content :global(ul),
  .bionic-content :global(ol) {
    margin: 0 0 16px 0;
    padding-left: 24px;
  }

  .bionic-content :global(li) {
    margin-bottom: 8px;
  }

  .bionic-content :global(blockquote) {
    border-left: 4px solid var(--glow-border-default);
    margin: 16px 0;
    padding-left: 16px;
    color: var(--glow-text-secondary);
  }

  .bionic-content :global(code) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .bionic-content :global(pre) {
    font-family: var(--glow-font-mono);
    font-size: 10pt;
    background-color: var(--glow-bg-surface);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 16px 0;
  }

  .bionic-content :global(a) {
    color: var(--glow-accent-primary);
    text-decoration: underline;
  }
</style>
