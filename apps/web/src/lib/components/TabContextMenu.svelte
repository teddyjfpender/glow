<script lang="ts">
  import { tabsState } from '$lib/state/tabs.svelte';
  import type { TabId } from '$lib/types/tabs';

  interface Props {
    x: number;
    y: number;
    tabId: TabId;
    onClose: () => void;
  }

  const { x, y, tabId, onClose }: Props = $props();

  const tab = $derived(tabsState.tabs.get(tabId));
  const canAddSubtab = $derived(tab ? tabsState.canHaveChildren(tabId) : false);
  const canDelete = $derived(tabsState.tabsArray.length > 1);
  const hasChildren = $derived(tabsState.getChildren(tabId).length > 0);

  // Adjust position to keep menu in viewport
  let menuRef = $state<HTMLDivElement | null>(null);
  let adjustedX = $state(x);
  let adjustedY = $state(y);

  $effect(() => {
    if (menuRef) {
      const rect = menuRef.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust X if menu would overflow right edge
      if (x + rect.width > viewportWidth - 10) {
        adjustedX = viewportWidth - rect.width - 10;
      } else {
        adjustedX = x;
      }

      // Adjust Y if menu would overflow bottom edge
      if (y + rect.height > viewportHeight - 10) {
        adjustedY = viewportHeight - rect.height - 10;
      } else {
        adjustedY = y;
      }
    }
  });

  function handleRename(): void {
    tabsState.startEditing(tabId);
    onClose();
  }

  function handleDuplicate(): void {
    tabsState.duplicateTab(tabId);
    onClose();
  }

  function handleAddSubtab(): void {
    tabsState.addTab(tabId);
    onClose();
  }

  function handleDelete(): void {
    if (hasChildren) {
      const confirmed = confirm(`Delete "${tab?.name ?? 'this tab'}" and all its subtabs?`);
      if (!confirmed) {
        onClose();
        return;
      }
    }
    tabsState.deleteTab(tabId);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleClickOutside(e: MouseEvent): void {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<div
  class="context-menu"
  style="left: {adjustedX}px; top: {adjustedY}px"
  role="menu"
  tabindex="-1"
  bind:this={menuRef}
  onclick={(e) => e.stopPropagation()}
>
  <button class="menu-item" onclick={handleRename} role="menuitem">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
    Rename
  </button>

  <button class="menu-item" onclick={handleDuplicate} role="menuitem">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
    Duplicate
  </button>

  {#if canAddSubtab}
    <button class="menu-item" onclick={handleAddSubtab} role="menuitem">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="12" x2="12" y2="18" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      Add subtab
    </button>
  {/if}

  <div class="divider"></div>

  <button
    class="menu-item menu-item-danger"
    onclick={handleDelete}
    disabled={!canDelete}
    role="menuitem"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
    {hasChildren ? 'Delete with subtabs' : 'Delete'}
  </button>
</div>

<style>
  .context-menu {
    position: fixed;
    min-width: 180px;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    box-shadow:
      0 4px 12px rgb(0 0 0 / 0.3),
      0 2px 4px rgb(0 0 0 / 0.2);
    padding: 4px 0;
    z-index: 1000;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--glow-text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .menu-item:hover:not(:disabled) {
    background-color: var(--glow-bg-elevated);
  }

  .menu-item:disabled {
    color: var(--glow-text-tertiary);
    cursor: not-allowed;
  }

  .menu-item svg {
    flex-shrink: 0;
    color: var(--glow-text-secondary);
  }

  .menu-item-danger {
    color: #ef4444;
  }

  .menu-item-danger svg {
    color: #ef4444;
  }

  .menu-item-danger:hover:not(:disabled) {
    background-color: rgba(239, 68, 68, 0.1);
  }

  .divider {
    height: 1px;
    background-color: var(--glow-border-subtle);
    margin: 4px 0;
  }
</style>
