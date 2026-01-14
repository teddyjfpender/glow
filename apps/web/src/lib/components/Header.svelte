<script lang="ts">
  import { documentState } from '$lib/state/document.svelte';

  interface Props {
    title: string;
    toggleSidebar: () => void;
  }

  let { title, toggleSidebar }: Props = $props();

  let isEditing = $state(false);
  let editValue = $state(title);

  function startEditing(): void {
    editValue = title;
    isEditing = true;
  }

  function finishEditing(): void {
    if (editValue.trim().length > 0) {
      documentState.setTitle(editValue.trim());
    }
    isEditing = false;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEditing();
    }
    if (event.key === 'Escape') {
      isEditing = false;
    }
  }

  // Format last saved time
  function formatLastSaved(date: Date | null): string {
    if (date === null) {
      return '';
    }
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) {
      return 'Saved';
    }
    return `Saved ${Math.floor(diff / 60000)}m ago`;
  }
</script>

<header class="header">
  <div class="left">
    <button class="sidebar-toggle" onclick={toggleSidebar} aria-label="Toggle sidebar">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3.5h12v1H2zM2 7.5h12v1H2zM2 11.5h12v1H2z" />
      </svg>
    </button>

    <div class="logo">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" fill="var(--glow-accent-primary)" />
        <circle cx="10" cy="10" r="4" fill="var(--glow-bg-base)" />
      </svg>
      <span class="logo-text">Glow</span>
    </div>

    <span class="divider">/</span>

    {#if isEditing}
      <input
        class="title-input"
        type="text"
        bind:value={editValue}
        onblur={finishEditing}
        onkeydown={handleKeydown}
        autofocus
      />
    {:else}
      <button class="title" onclick={startEditing}>
        {title}
      </button>
    {/if}
  </div>

  <div class="right">
    <span class="save-status">
      {#if documentState.isSaving}
        Saving...
      {:else if documentState.isDirty}
        Unsaved
      {:else}
        {formatLastSaved(documentState.lastSaved)}
      {/if}
    </span>

    <button class="share-button">Share</button>

    <button class="avatar" aria-label="User menu">
      <span>G</span>
    </button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--glow-header-height);
    padding: 0 16px;
    background-color: var(--glow-bg-surface);
    border-bottom: 1px solid var(--glow-border-subtle);
    flex-shrink: 0;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--glow-text-secondary);
    border-radius: 6px;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .sidebar-toggle:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-text {
    font-weight: 600;
    font-size: 14px;
  }

  .divider {
    color: var(--glow-text-tertiary);
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary);
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .title:hover {
    background-color: var(--glow-bg-elevated);
  }

  .title-input {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary);
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-accent-primary);
    padding: 4px 8px;
    border-radius: 4px;
    outline: none;
    width: 200px;
  }

  .save-status {
    font-size: 12px;
    color: var(--glow-text-tertiary);
  }

  .share-button {
    font-size: 13px;
    font-weight: 500;
    color: var(--glow-text-primary);
    background-color: var(--glow-accent-primary);
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      transform var(--glow-transition-fast);
  }

  .share-button:hover {
    background-color: var(--glow-accent-primary-hover);
  }

  .share-button:active {
    transform: scale(0.97);
  }

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--glow-accent-primary);
    color: white;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }
</style>
