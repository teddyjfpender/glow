<script lang="ts">
  import type { WrapMode } from '../core/types';

  interface Props {
    wrapMode: WrapMode;
    onWrapModeChange?: (mode: WrapMode) => void;
    onEdit?: () => void;
    onDelete?: () => void;
  }

  const { wrapMode, onWrapModeChange, onEdit, onDelete }: Props = $props();

  let showMoreMenu = $state(false);

  const wrapModes: { mode: WrapMode; title: string; icon: string }[] = [
    { mode: 'inline', title: 'Inline with text', icon: 'inline' },
    { mode: 'wrap-left', title: 'Wrap text left', icon: 'wrap-left' },
    { mode: 'wrap-right', title: 'Wrap text right', icon: 'wrap-right' },
    { mode: 'break', title: 'Break text', icon: 'break' },
  ];

  function handleWrapModeClick(mode: WrapMode): void {
    onWrapModeChange?.(mode);
  }

  function handleEditClick(e: MouseEvent): void {
    e.stopPropagation();
    onEdit?.();
  }

  function handleDeleteClick(e: MouseEvent): void {
    e.stopPropagation();
    showMoreMenu = false;
    onDelete?.();
  }

  function toggleMoreMenu(e: MouseEvent): void {
    e.stopPropagation();
    showMoreMenu = !showMoreMenu;
  }

  function handleToolbarClick(e: MouseEvent): void {
    e.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<div class="image-toolbar" onclick={handleToolbarClick} role="toolbar">
  <!-- Edit button -->
  <button class="toolbar-btn" onclick={handleEditClick} title="Edit drawing">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  </button>

  <div class="toolbar-divider"></div>

  <!-- Wrap mode buttons -->
  {#each wrapModes as { mode, title, icon }}
    <button
      class="toolbar-btn"
      class:active={wrapMode === mode}
      onclick={() => handleWrapModeClick(mode)}
      title={title}
    >
      {#if icon === 'inline'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      {:else if icon === 'wrap-left'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="8" height="8" rx="1" />
          <line x1="14" y1="7" x2="21" y2="7" />
          <line x1="14" y1="11" x2="21" y2="11" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </svg>
      {:else if icon === 'wrap-right'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="13" y="5" width="8" height="8" rx="1" />
          <line x1="3" y1="7" x2="10" y2="7" />
          <line x1="3" y1="11" x2="10" y2="11" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </svg>
      {:else if icon === 'break'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="8" width="12" height="8" rx="1" />
          <line x1="3" y1="4" x2="21" y2="4" />
          <line x1="3" y1="20" x2="21" y2="20" />
        </svg>
      {/if}
    </button>
  {/each}

  <div class="toolbar-divider"></div>

  <!-- More options -->
  <div class="more-menu-container">
    <button class="toolbar-btn" onclick={toggleMoreMenu} title="More options">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    </button>

    {#if showMoreMenu}
      <div class="more-menu">
        <button class="menu-item delete" onclick={handleDeleteClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .image-toolbar {
    position: absolute;
    bottom: -44px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    background: var(--glow-bg-surface, #1e1e2e);
    border: 1px solid var(--glow-border-default, #4a4a5a);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--glow-text-secondary, #a0a0a0);
    transition: all 0.15s;
  }

  .toolbar-btn:hover {
    background: var(--glow-bg-elevated, #2a2a3a);
    color: var(--glow-text-primary, #e0e0e0);
  }

  .toolbar-btn.active {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  .toolbar-btn svg {
    width: 16px;
    height: 16px;
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--glow-border-subtle, #3a3a4a);
    margin: 0 4px;
  }

  .more-menu-container {
    position: relative;
  }

  .more-menu {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 8px;
    background: var(--glow-bg-surface, #1e1e2e);
    border: 1px solid var(--glow-border-default, #4a4a5a);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    min-width: 120px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: var(--glow-text-primary, #e0e0e0);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .menu-item:hover {
    background: var(--glow-bg-elevated, #2a2a3a);
  }

  .menu-item.delete {
    color: #ef4444;
  }

  .menu-item.delete:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .menu-item svg {
    width: 16px;
    height: 16px;
  }
</style>
