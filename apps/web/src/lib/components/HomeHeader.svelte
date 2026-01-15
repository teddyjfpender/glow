<script lang="ts">
  import { documentsState } from '$lib/state/documents.svelte';

  let searchQuery = $state('');

  async function handleNewDocument(): Promise<void> {
    const doc = await documentsState.create();
    window.location.href = `/doc/${doc.id}`;
  }
</script>

<header class="home-header">
  <div class="header-content">
    <a href="/" class="logo">
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
        bind:value={searchQuery}
      />
    </div>

    <div class="header-actions">
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
    gap: 8px;
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
