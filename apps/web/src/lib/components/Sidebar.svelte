<script lang="ts">
  interface DocumentItem {
    id: string;
    title: string;
    modifiedAt: Date;
  }

  // Mock data - will be replaced with actual data
  const recentDocuments: DocumentItem[] = [
    { id: '1', title: 'Project Notes', modifiedAt: new Date() },
    { id: '2', title: 'Meeting Minutes', modifiedAt: new Date(Date.now() - 86400000) },
    { id: '3', title: 'Ideas', modifiedAt: new Date(Date.now() - 172800000) },
  ];

  // Document outline (auto-generated from headings)
  interface OutlineItem {
    id: string;
    text: string;
    level: number;
  }

  const outline: OutlineItem[] = [
    { id: 'h1', text: 'Welcome to Glow', level: 1 },
    { id: 'h2', text: 'Getting Started', level: 2 },
    { id: 'h3', text: 'Writing Documents', level: 2 },
  ];

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return 'Today';
    }
    if (days === 1) {
      return 'Yesterday';
    }
    if (days < 7) {
      return `${days.toString()} days ago`;
    }
    return date.toLocaleDateString();
  }
</script>

<aside class="sidebar">
  <section class="section">
    <h2 class="section-title">Documents</h2>
    <ul class="document-list">
      {#each recentDocuments as doc}
        <li>
          <button class="document-item">
            <svg class="doc-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M4 1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4.414L9.586 1H4zm5 1v3h3L9 2zM5 6h6v1H5V6zm0 2h6v1H5V8zm0 2h4v1H5v-1z"
              />
            </svg>
            <span class="doc-title">{doc.title}</span>
            <span class="doc-time">{formatRelativeTime(doc.modifiedAt)}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <section class="section">
    <h2 class="section-title">Outline</h2>
    {#if outline.length > 0}
      <ul class="outline-list">
        {#each outline as item}
          <li>
            <button class="outline-item" style="padding-left: {(item.level - 1) * 12 + 8}px">
              {item.text}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty-state">No headings yet</p>
    {/if}
  </section>
</aside>

<style>
  .sidebar {
    width: var(--glow-sidebar-width);
    height: 100%;
    background-color: var(--glow-bg-surface);
    border-right: 1px solid var(--glow-border-subtle);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .section {
    padding: 16px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--glow-text-tertiary);
    margin-bottom: 8px;
  }

  .document-list,
  .outline-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .document-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--glow-text-primary);
    cursor: pointer;
    text-align: left;
    transition: background-color var(--glow-transition-fast);
  }

  .document-item:hover {
    background-color: var(--glow-bg-elevated);
  }

  .doc-icon {
    color: var(--glow-text-tertiary);
    flex-shrink: 0;
  }

  .doc-title {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-time {
    font-size: 11px;
    color: var(--glow-text-tertiary);
    flex-shrink: 0;
  }

  .outline-item {
    display: block;
    width: 100%;
    padding: 6px 8px;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--glow-text-secondary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: background-color var(--glow-transition-fast);
  }

  .outline-item:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .empty-state {
    font-size: 13px;
    color: var(--glow-text-tertiary);
    padding: 8px;
  }
</style>
