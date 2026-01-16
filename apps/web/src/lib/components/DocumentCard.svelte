<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- Displaying user's own local document content safely */
  import { resolve } from '$app/paths';
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

    // Check if same day
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      // Show time in 24h format
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else {
      // Show date like "Jan 14, 2026"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  function handleClick(): void {
    window.location.href = resolve(`/doc/${document.id}`);
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
    {#if document.content}
      <div class="preview-document">
        <div class="preview-content">
          {@html document.content}
        </div>
      </div>
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
      <button class="menu-btn" onclick={handleMenuClick} aria-label="Document options">
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
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    text-align: left;
    width: 100%;
    position: relative;
  }

  .document-card:hover {
    border-color: var(--glow-accent);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
  }

  .card-preview {
    height: 160px;
    padding: 8px;
    background-color: var(--glow-bg-elevated);
    border-bottom: 1px solid var(--glow-border-subtle);
    overflow: hidden;
    border-radius: 8px 8px 0 0;
  }

  .preview-document {
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 4px;
    height: 100%;
    padding: 6px 8px;
    overflow: hidden;
    font-family: var(--glow-font-sans);
  }

  .preview-content {
    /* Scale down content for zoomed-out document preview effect */
    transform: scale(0.45);
    transform-origin: top left;
    width: 222%; /* 100% / 0.45 to compensate for scale */
    color: var(--glow-text-secondary);
    overflow: hidden;
    font-size: 14px;
    line-height: 1.6;
  }

  /* Style the preview content - dark mode document */
  .preview-content :global(h1) {
    font-size: 26px;
    font-weight: 600;
    margin: 0 0 12px;
    color: var(--glow-text-primary);
  }

  .preview-content :global(h2) {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 10px;
    color: var(--glow-text-primary);
  }

  .preview-content :global(h3) {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
    color: var(--glow-text-primary);
  }

  .preview-content :global(p) {
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 1.6;
  }

  .preview-content :global(ul),
  .preview-content :global(ol) {
    margin: 0 0 8px;
    padding-left: 24px;
    font-size: 14px;
  }

  .preview-content :global(li) {
    margin: 0 0 4px;
  }

  .preview-content :global(strong),
  .preview-content :global(b) {
    font-weight: 600;
  }

  .preview-content :global(em),
  .preview-content :global(i) {
    font-style: italic;
  }

  /* Excalidraw preview */
  .preview-content :global([data-excalidraw]),
  .preview-content :global(.excalidraw-node) {
    max-width: 100%;
    max-height: 200px;
    overflow: hidden;
    margin: 8px 0;
    border-radius: 4px;
    background-color: var(--glow-bg-elevated);
  }

  .preview-content :global([data-excalidraw] img),
  .preview-content :global([data-excalidraw] svg),
  .preview-content :global(.excalidraw-node img),
  .preview-content :global(.excalidraw-node svg) {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
  }

  /* Comment highlights in preview - hide them */
  .preview-content :global(.comment-highlight) {
    background-color: transparent !important;
  }

  .preview-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 13px;
    color: var(--glow-text-tertiary);
    font-style: italic;
    margin: 0;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 4px;
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
