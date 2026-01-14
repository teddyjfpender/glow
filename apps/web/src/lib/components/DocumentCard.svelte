<script lang="ts">
  import type { StoredDocument } from '$lib/storage/db';
  import { documentsState } from '$lib/state/documents.svelte';

  interface Props {
    document: StoredDocument;
  }

  const { document }: Props = $props();

  let showMenu = $state(false);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays.toString()} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }

  function handleClick(): void {
    window.location.href = `/doc/${document.id}`;
  }

  function handleMenuClick(event: MouseEvent): void {
    event.stopPropagation();
    showMenu = !showMenu;
  }

  async function handleDelete(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    showMenu = false;
    if (confirm('Are you sure you want to delete this document?')) {
      await documentsState.remove(document.id);
    }
  }

  async function handleDuplicate(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    showMenu = false;
    await documentsState.duplicate(document.id);
  }
</script>

<div
  class="document-card"
  onclick={handleClick}
  onkeydown={(e) => {
    if (e.key === 'Enter') {
      handleClick();
    }
  }}
  role="button"
  tabindex="0"
>
  <div class="card-preview">
    {#if document.previewText}
      <p class="preview-text">{document.previewText}</p>
    {:else}
      <p class="preview-empty">Empty document</p>
    {/if}
  </div>

  <div class="card-footer">
    <div class="card-info">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" opacity="0.3" />
          <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
      <div class="card-details">
        <h3 class="card-title">{document.title}</h3>
        <span class="card-date">{formatDate(document.modifiedAt)}</span>
      </div>
    </div>

    <div class="card-menu">
      <button class="menu-btn" onclick={handleMenuClick}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {#if showMenu}
        <div class="menu-dropdown">
          <button class="menu-item" onclick={handleDuplicate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicate
          </button>
          <button class="menu-item menu-item-danger" onclick={handleDelete}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
            Delete
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .document-card {
    display: flex;
    flex-direction: column;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    text-align: left;
    width: 100%;
  }

  .document-card:hover {
    border-color: var(--glow-accent);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
  }

  .card-preview {
    height: 160px;
    padding: 16px;
    background-color: var(--glow-bg-elevated);
    border-bottom: 1px solid var(--glow-border-subtle);
    overflow: hidden;
  }

  .preview-text {
    font-size: 11px;
    line-height: 1.5;
    color: var(--glow-text-secondary);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 8;
    -webkit-box-orient: vertical;
    margin: 0;
  }

  .preview-empty {
    font-size: 13px;
    color: var(--glow-text-tertiary);
    font-style: italic;
    margin: 0;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
  }

  .card-info {
    display: flex;
    align-items: center;
    gap: 12px;
    overflow: hidden;
  }

  .card-icon {
    width: 24px;
    height: 24px;
    color: var(--glow-accent);
    flex-shrink: 0;
  }

  .card-icon svg {
    width: 100%;
    height: 100%;
  }

  .card-details {
    overflow: hidden;
  }

  .card-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary);
    margin: 0 0 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-date {
    font-size: 12px;
    color: var(--glow-text-tertiary);
  }

  .card-menu {
    position: relative;
  }

  .menu-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--glow-text-tertiary);
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .menu-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .menu-btn svg {
    width: 20px;
    height: 20px;
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.3);
    overflow: hidden;
    z-index: 10;
    min-width: 150px;
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: none;
    border: none;
    font-size: 14px;
    color: var(--glow-text-primary);
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;
  }

  .menu-item:hover {
    background-color: var(--glow-bg-elevated);
  }

  .menu-item svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .menu-item-danger {
    color: #ef4444;
  }

  .menu-item-danger:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }
</style>
