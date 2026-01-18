<script lang="ts">
  import { resolve } from '$app/paths';
  import { documentsState } from '$lib/state/documents.svelte';

  export type ViewMode = 'docs' | 'graph';

  interface Props {
    onSearch?: (query: string) => void;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
  }

  const { onSearch, viewMode = 'docs', onViewModeChange }: Props = $props();

  let searchQuery = $state('');

  function handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    searchQuery = target.value;
    onSearch?.(searchQuery);
  }

  async function handleNewDocument(): Promise<void> {
    const doc = await documentsState.create();
    window.location.href = resolve(`/doc/${doc.id}`);
  }
</script>

<header class="home-header">
  <div class="header-content">
    <a href={resolve('/')} class="logo">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 141.42" class="logo-icon">
        <path fill="#757575" d="M8 0C3.58 0 0 3.58 0 8v125.42c0 4.42 3.58 8 8 8h84c4.42 0 8-3.58 8-8V25L75 0H8z"/>
        <path fill="#424242" d="M75 0v25h25L75 0z"/>
        <rect x="20" y="50" width="60" height="6" rx="3" ry="3" fill="#ffffff"/>
        <rect x="20" y="70" width="60" height="6" rx="3" ry="3" fill="#ffffff"/>
        <rect x="20" y="90" width="36" height="6" rx="3" ry="3" fill="#ffffff"/>
      </svg>
      <span class="logo-text">Glow</span>
    </a>

    <div class="search-container">
      <svg
        class="search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        class="search-input"
        placeholder="Search documents"
        value={searchQuery}
        oninput={handleSearchInput}
      />
    </div>

    <div class="header-actions">
      <div class="view-toggle">
        <button
          class="view-toggle-btn"
          class:active={viewMode === 'docs'}
          onclick={() => onViewModeChange?.('docs')}
          title="Document view"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Docs
        </button>
        <button
          class="view-toggle-btn"
          class:active={viewMode === 'graph'}
          onclick={() => onViewModeChange?.('graph')}
          title="Graph view"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="18" r="3" />
            <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
            <line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
          </svg>
          Graph
        </button>
      </div>
      <button class="new-doc-btn" onclick={handleNewDocument}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
    </div>
  </div>
</header>

<style>
  .home-header {
    height: 64px;
    background-color: transparent;
    border-bottom: 1px solid var(--glow-border-subtle);
    display: flex;
    align-items: center;
    padding: 0 16px;
  }

  .header-content {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: var(--glow-text-primary);
  }

  .logo-icon {
    width: 28px;
    height: 28px;
  }

  .logo-text {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.5px;
    color: #a0a0a0;
  }

  .search-container {
    flex: 1;
    max-width: 720px;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    color: var(--glow-text-tertiary);
  }

  .search-input {
    width: 100%;
    height: 48px;
    background-color: var(--glow-bg-elevated);
    border: none;
    border-radius: 8px;
    padding: 0 16px 0 44px;
    font-size: 16px;
    color: var(--glow-text-primary);
    transition:
      background-color 0.2s,
      box-shadow 0.2s;
  }

  .search-input::placeholder {
    color: var(--glow-text-tertiary);
  }

  .search-input:focus {
    outline: none;
    background-color: var(--glow-bg-base);
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 0 0 1px var(--glow-border-default);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .view-toggle {
    display: flex;
    background-color: var(--glow-bg-elevated);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    color: var(--glow-text-tertiary);
    background: transparent;
    border: none;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: color 0.2s, background-color 0.2s;
  }

  .view-toggle-btn svg {
    width: 16px;
    height: 16px;
  }

  .view-toggle-btn:hover {
    color: var(--glow-text-secondary);
  }

  .view-toggle-btn.active {
    color: var(--glow-text-primary);
    background-color: var(--glow-bg-surface);
  }

  .new-doc-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: var(--glow-accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .new-doc-btn svg {
    width: 18px;
    height: 18px;
  }

  .new-doc-btn:hover {
    background-color: var(--glow-accent-hover);
  }
</style>
