<script lang="ts">
  import MenuBar from './MenuBar.svelte';
  import { documentState } from '$lib/state/document.svelte';

  interface Props {
    onMenuAction?: (action: string) => void;
  }

  const { onMenuAction }: Props = $props();

  let isEditingTitle = $state(false);
  let editValue = $state('');

  function startEditing(): void {
    editValue = documentState.title;
    isEditingTitle = true;
  }

  function finishEditing(): void {
    if (editValue.trim().length > 0) {
      documentState.setTitle(editValue.trim());
    }
    isEditingTitle = false;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEditing();
    }
    if (event.key === 'Escape') {
      isEditingTitle = false;
    }
  }
</script>

<header class="header">
  <!-- Top row: Logo, Title, Actions -->
  <div class="header-top">
    <div class="left">
      <!-- Glow Logo -->
      <div class="logo">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="var(--glow-accent-primary)" />
          <path d="M14 12h12v4H18v20h8v4H14V12z" fill="white" />
          <path d="M22 12h12v28H22v-4h8V16h-8v-4z" fill="white" opacity="0.7" />
        </svg>
      </div>

      <!-- Document Title -->
      <div class="title-section">
        {#if isEditingTitle}
          <input
            class="title-input"
            type="text"
            bind:value={editValue}
            onblur={finishEditing}
            onkeydown={handleKeydown}
          />
        {:else}
          <button class="title-button" onclick={startEditing}>
            {documentState.title}
          </button>
        {/if}

        <!-- Star/Favorite button -->
        <button class="icon-button" title="Star" aria-label="Star document">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            />
          </svg>
        </button>

        <!-- Move/Folder button -->
        <button class="icon-button" title="Move" aria-label="Move document">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="right">
      <!-- Save status -->
      <span class="save-status">
        {#if documentState.isSaving}
          Saving...
        {:else if documentState.isDirty}
          Unsaved changes
        {:else if documentState.lastSaved !== null}
          All changes saved
        {/if}
      </span>

      <!-- Comment button -->
      <button class="icon-button-large" title="Comments" aria-label="Open comments">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
        </svg>
      </button>

      <!-- Video call button -->
      <button class="icon-button-large" title="Join a call" aria-label="Join a call">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </button>

      <!-- Share button -->
      <button class="share-button">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>

      <!-- User avatar -->
      <button class="avatar" aria-label="Account">
        <span>G</span>
      </button>
    </div>
  </div>

  <!-- Bottom row: Menu bar -->
  <div class="header-bottom">
    <MenuBar onAction={onMenuAction} />
  </div>
</header>

<style>
  .header {
    display: flex;
    flex-direction: column;
    background-color: var(--glow-bg-surface);
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    min-height: 52px;
  }

  .header-bottom {
    padding: 0 12px 4px;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo {
    flex-shrink: 0;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .title-button {
    font-size: 18px;
    font-weight: 400;
    color: var(--glow-text-primary);
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-button:hover {
    background-color: var(--glow-bg-elevated);
  }

  .title-input {
    font-size: 18px;
    font-weight: 400;
    color: var(--glow-text-primary);
    background-color: var(--glow-bg-elevated);
    border: 2px solid var(--glow-accent-primary);
    padding: 4px 8px;
    border-radius: 4px;
    outline: none;
    width: 300px;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    color: var(--glow-text-tertiary);
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .icon-button:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .icon-button-large {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    color: var(--glow-text-secondary);
    border-radius: 50%;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .icon-button-large:hover {
    background-color: var(--glow-bg-elevated);
  }

  .save-status {
    font-size: 12px;
    color: var(--glow-text-tertiary);
    margin-right: 8px;
  }

  .share-button {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #1a1a2e;
    background: linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%);
    border: none;
    padding: 8px 20px;
    border-radius: 20px;
    cursor: pointer;
    transition: box-shadow var(--glow-transition-fast);
  }

  .share-button:hover {
    box-shadow: 0 2px 8px rgb(56 189 248 / 0.4);
  }

  .share-button svg {
    stroke: #1a1a2e;
  }

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    font-size: 16px;
    font-weight: 500;
    border: none;
    cursor: pointer;
  }
</style>
