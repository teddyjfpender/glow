<script lang="ts">
  import { resolve } from '$app/paths';
  import MenuBar from './MenuBar.svelte';
  import { documentState } from '$lib/state/document.svelte';
  import { commentsState } from '$lib/state/comments.svelte';
  import { aiFeedbackState } from '$lib/ai/feedback-state.svelte';
  import BridgeStatusIndicator from './BridgeStatusIndicator.svelte';
  import BridgeSetupModal from './BridgeSetupModal.svelte';

  interface Props {
    onMenuAction?: (action: string) => void;
  }

  const { onMenuAction }: Props = $props();

  let isBridgeModalOpen = $state(false);

  function openBridgeModal(): void {
    isBridgeModalOpen = true;
  }

  function closeBridgeModal(): void {
    isBridgeModalOpen = false;
  }

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
  <!-- Logo spanning both rows -->
  <a href={resolve('/')} class="logo-link" aria-label="Go to home">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 100 141.42">
      <path
        fill="#757575"
        d="M8 0C3.58 0 0 3.58 0 8v125.42c0 4.42 3.58 8 8 8h84c4.42 0 8-3.58 8-8V25L75 0H8z"
      />
      <path fill="#424242" d="M75 0v25h25L75 0z" />
      <rect x="20" y="50" width="60" height="6" rx="3" ry="3" fill="#ffffff" />
      <rect x="20" y="70" width="60" height="6" rx="3" ry="3" fill="#ffffff" />
      <rect x="20" y="90" width="36" height="6" rx="3" ry="3" fill="#ffffff" />
    </svg>
  </a>

  <!-- Right section with two rows -->
  <div class="header-content">
    <!-- Row 1: Title and actions -->
    <div class="header-row-top">
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

      <div class="actions">
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
        <button
          class="icon-button-large comment-button"
          class:active={commentsState.isPanelOpen}
          title="Comments"
          aria-label="Open comments"
          onclick={() => commentsState.togglePanel()}
        >
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
          {#if commentsState.unresolvedCount > 0}
            <span class="comment-badge">{commentsState.unresolvedCount}</span>
          {/if}
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

        <!-- AI Bridge Status -->
        <BridgeStatusIndicator status={aiFeedbackState.bridgeStatus} onclick={openBridgeModal} />

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

    <!-- Row 2: Menu bar -->
    <div class="header-row-bottom">
      <MenuBar onAction={onMenuAction} />
    </div>
  </div>
</header>

<!-- Bridge Setup Modal -->
<BridgeSetupModal isOpen={isBridgeModalOpen} onClose={closeBridgeModal} />

<style>
  .header {
    display: flex;
    align-items: stretch;
    background-color: var(--glow-bg-surface);
    padding: 6px 12px 0;
    gap: 8px;
  }

  .logo-link {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    text-decoration: none;
    border-radius: 4px;
    padding: 0;
    transition:
      opacity var(--glow-transition-fast),
      transform var(--glow-transition-fast);
  }

  .logo-link:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }

  .logo-link:active {
    transform: scale(0.98);
  }

  .header-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
    flex: 1;
  }

  .header-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .header-row-bottom {
    display: flex;
    align-items: center;
    padding-bottom: 10px;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
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
    border: 1px solid #505050;
    padding: 4px 8px;
    border-radius: 4px;
    outline: none;
    width: 300px;
  }

  .title-input:focus {
    border-color: #707070;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    color: #757575;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .icon-button:hover {
    background-color: var(--glow-bg-elevated);
    color: #9e9e9e;
  }

  .icon-button-large {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    color: #757575;
    border-radius: 50%;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .icon-button-large:hover {
    background-color: var(--glow-bg-elevated);
    color: #9e9e9e;
  }

  .comment-button {
    position: relative;
  }

  .comment-button.active {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-accent-primary);
  }

  .comment-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    font-size: 10px;
    font-weight: 600;
    color: white;
    background-color: var(--glow-accent-primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
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
    color: var(--glow-text-primary);
    background-color: var(--glow-bg-elevated);
    border: 1px solid #505050;
    padding: 8px 20px;
    border-radius: 20px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast);
  }

  .share-button:hover {
    background-color: #3a3a3a;
    border-color: #606060;
  }

  .share-button svg {
    stroke: var(--glow-text-secondary);
  }

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #505050;
    color: var(--glow-text-secondary);
    font-size: 16px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .avatar:hover {
    background-color: #606060;
  }
</style>
