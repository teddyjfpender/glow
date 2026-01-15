<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import HomeHeader from '$lib/components/HomeHeader.svelte';
  import DocumentCard from '$lib/components/DocumentCard.svelte';
  import { documentsState } from '$lib/state/documents.svelte';

  let searchQuery = $state('');

  // Filter documents based on search query
  const filteredDocuments = $derived(() => {
    if (!searchQuery.trim()) {
      return documentsState.documents;
    }
    const query = searchQuery.toLowerCase().trim();
    return documentsState.documents.filter((doc) => {
      const titleMatch = doc.title.toLowerCase().includes(query);
      const previewMatch = doc.previewText?.toLowerCase().includes(query) ?? false;
      return titleMatch || previewMatch;
    });
  });

  function handleSearch(query: string): void {
    searchQuery = query;
  }

  onMount(() => {
    void documentsState.load();
  });

  async function handleCreateDocument(): Promise<void> {
    const doc = await documentsState.create();
    window.location.href = resolve(`/doc/${doc.id}`);
  }
</script>

<div class="home">
  <HomeHeader onSearch={handleSearch} />

  <main class="home-content">
    <div class="content-wrapper">
      <!-- Start a new document section -->
      <section class="section">
        <h2 class="section-title">Start a new document</h2>
        <div class="template-grid">
          <button class="template-card" onclick={handleCreateDocument}>
            <div class="template-preview">
              <svg viewBox="0 0 24 24" class="blank-icon">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <span class="template-label">Blank</span>
          </button>
        </div>
      </section>

      <!-- Recent documents section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">
            {#if searchQuery.trim()}
              Search results ({filteredDocuments().length})
            {:else}
              Recent documents
            {/if}
          </h2>
        </div>

        {#if documentsState.isLoading}
          <div class="loading">
            <div class="loading-spinner"></div>
            <span>Loading documents...</span>
          </div>
        {:else if documentsState.error}
          <div class="error">
            <p>{documentsState.error}</p>
          </div>
        {:else if documentsState.documents.length === 0}
          <div class="empty">
            <svg viewBox="0 0 24 24" class="empty-icon">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <polyline
                points="14 2 14 8 20 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            <h3>No documents yet</h3>
            <p>Create your first document to get started</p>
            <button class="create-btn" onclick={handleCreateDocument}> Create document </button>
          </div>
        {:else if filteredDocuments().length === 0}
          <div class="empty">
            <svg viewBox="0 0 24 24" class="empty-icon">
              <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
            <h3>No results found</h3>
            <p>No documents match "{searchQuery}"</p>
          </div>
        {:else}
          <div class="documents-grid">
            {#each filteredDocuments() as doc (doc.id)}
              <DocumentCard document={doc} />
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </main>
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--glow-bg-base);
  }

  .home-content {
    flex: 1;
    overflow-y: auto;
  }

  .content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 24px 48px;
  }

  .section {
    margin-bottom: 40px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-secondary);
    margin: 0 0 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  /* Template grid */
  .template-grid {
    display: flex;
    gap: 16px;
  }

  .template-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .template-preview {
    width: 160px;
    height: 200px;
    background-color: var(--glow-bg-surface);
    border: 2px solid var(--glow-border-subtle);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .template-card:hover .template-preview {
    border-color: var(--glow-accent);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
  }

  .blank-icon {
    width: 48px;
    height: 48px;
    color: var(--glow-accent);
  }

  .template-label {
    font-size: 14px;
    color: var(--glow-text-primary);
  }

  /* Documents grid */
  .documents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 24px;
  }

  /* Loading state */
  .loading {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 40px;
    justify-content: center;
    color: var(--glow-text-secondary);
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--glow-border-subtle);
    border-top-color: var(--glow-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Error state */
  .error {
    padding: 40px;
    text-align: center;
    color: #ef4444;
  }

  /* Empty state */
  .empty {
    padding: 60px 40px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--glow-text-tertiary);
    margin-bottom: 8px;
  }

  .empty h3 {
    font-size: 18px;
    font-weight: 500;
    color: var(--glow-text-primary);
    margin: 0;
  }

  .empty p {
    font-size: 14px;
    color: var(--glow-text-secondary);
    margin: 0;
  }

  .create-btn {
    margin-top: 16px;
    padding: 10px 24px;
    background-color: var(--glow-accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .create-btn:hover {
    background-color: var(--glow-accent-hover);
  }
</style>
