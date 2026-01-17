<script lang="ts">
  import { tabsState } from '$lib/state/tabs.svelte';
  import type { Tab, TabId } from '$lib/types/tabs';

  interface Props {
    tab: Tab;
    depth: number;
    onContextMenu: (detail: { x: number; y: number; tabId: TabId }) => void;
  }

  const { tab, depth, onContextMenu }: Props = $props();

  const children = $derived(tabsState.getChildren(tab.id));
  const hasChildren = $derived(children.length > 0);
  const isExpanded = $derived(tabsState.expandedTabIds.has(tab.id));
  const isActive = $derived(tabsState.activeTabId === tab.id);
  const isEditing = $derived(tabsState.editingTabId === tab.id);
  const canAddChild = $derived(tabsState.canHaveChildren(tab.id));

  let editInputRef = $state<HTMLInputElement | null>(null);
  let editValue = $state(tab.name);
  let isDragging = $state(false);
  let dragOverPosition = $state<'before' | 'inside' | 'after' | null>(null);

  // Focus input when editing starts
  $effect(() => {
    if (isEditing && editInputRef) {
      editValue = tab.name;
      // Use timeout to ensure input is rendered
      setTimeout(() => {
        editInputRef?.focus();
        editInputRef?.select();
      }, 0);
    }
  });

  function handleClick(): void {
    tabsState.setActiveTab(tab.id);
  }

  function handleDoubleClick(): void {
    editValue = tab.name;
    tabsState.startEditing(tab.id);
  }

  function handleRightClick(e: MouseEvent): void {
    e.preventDefault();
    onContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
  }

  function handleToggleExpand(e: MouseEvent): void {
    e.stopPropagation();
    tabsState.toggleExpand(tab.id);
  }

  function handleEditKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      tabsState.stopEditing();
    }
  }

  function finishEdit(): void {
    if (editValue.trim()) {
      tabsState.renameTab(tab.id, editValue.trim());
    } else {
      tabsState.stopEditing();
    }
  }

  // Drag and drop handlers
  function handleDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id);
    isDragging = true;
  }

  function handleDragEnd(): void {
    isDragging = false;
    dragOverPosition = null;
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    const draggedId = e.dataTransfer?.types.includes('text/plain') ? 'pending' : null;
    if (!draggedId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) {
      dragOverPosition = 'before';
    } else if (y > height * 0.75) {
      dragOverPosition = 'after';
    } else if (canAddChild) {
      dragOverPosition = 'inside';
    } else {
      dragOverPosition = 'after';
    }
  }

  function handleDragLeave(): void {
    dragOverPosition = null;
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault();
    const draggedId = e.dataTransfer?.getData('text/plain');
    if (!draggedId || draggedId === tab.id) {
      dragOverPosition = null;
      return;
    }

    if (dragOverPosition === 'before') {
      tabsState.moveTab(draggedId, tab.parentId, tab.order - 0.5);
    } else if (dragOverPosition === 'after') {
      tabsState.moveTab(draggedId, tab.parentId, tab.order + 0.5);
    } else if (dragOverPosition === 'inside') {
      tabsState.moveTab(draggedId, tab.id, 0);
      tabsState.expandTab(tab.id);
    }

    dragOverPosition = null;
  }
</script>

<li
  class="tab-item"
  class:active={isActive}
  class:dragging={isDragging}
  class:drag-before={dragOverPosition === 'before'}
  class:drag-after={dragOverPosition === 'after'}
  class:drag-inside={dragOverPosition === 'inside'}
  style="--depth: {depth}"
>
  <div
    class="tab-row"
    draggable="true"
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    onclick={handleClick}
    ondblclick={handleDoubleClick}
    oncontextmenu={handleRightClick}
    role="button"
    tabindex="0"
  >
    <!-- Expand/collapse chevron (only if has children) -->
    {#if hasChildren}
      <button class="expand-btn" onclick={handleToggleExpand} tabindex="-1">
        <svg
          class="chevron"
          class:expanded={isExpanded}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    {:else}
      <span class="expand-spacer"></span>
    {/if}

    <!-- Tab icon -->
    <svg class="tab-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>

    <!-- Tab name (editable) -->
    {#if isEditing}
      <input
        bind:this={editInputRef}
        class="tab-name-input"
        type="text"
        bind:value={editValue}
        onblur={finishEdit}
        onkeydown={handleEditKeydown}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="tab-name">{tab.name}</span>
    {/if}

    <!-- Child count badge -->
    {#if hasChildren}
      <span class="child-count">{children.length}</span>
    {/if}
  </div>

  <!-- Children (recursive) -->
  {#if hasChildren && isExpanded}
    <ul class="children-list">
      {#each children as child (child.id)}
        <svelte:self tab={child} depth={depth + 1} {onContextMenu} />
      {/each}
    </ul>
  {/if}
</li>

<style>
  .tab-item {
    --indent: calc(var(--depth) * 16px);
    position: relative;
    list-style: none;
  }

  .tab-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px 6px calc(8px + var(--indent));
    border-radius: 6px;
    cursor: pointer;
    color: var(--glow-text-secondary);
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
    user-select: none;
  }

  .tab-row:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .tab-item.active .tab-row {
    background-color: rgba(99, 102, 241, 0.15);
    color: var(--glow-text-primary);
  }

  .tab-item.active .tab-row:hover {
    background-color: rgba(99, 102, 241, 0.2);
  }

  .tab-item.dragging {
    opacity: 0.5;
  }

  /* Drag indicators */
  .tab-item.drag-before::before {
    content: '';
    position: absolute;
    top: 0;
    left: calc(8px + var(--indent));
    right: 8px;
    height: 2px;
    background-color: var(--glow-accent-primary);
    border-radius: 1px;
  }

  .tab-item.drag-after::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: calc(8px + var(--indent));
    right: 8px;
    height: 2px;
    background-color: var(--glow-accent-primary);
    border-radius: 1px;
  }

  .tab-item.drag-inside .tab-row {
    background-color: rgba(99, 102, 241, 0.15);
    outline: 2px dashed var(--glow-accent-primary);
    outline-offset: -2px;
  }

  .expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    flex-shrink: 0;
  }

  .expand-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-secondary);
  }

  .expand-spacer {
    width: 16px;
    flex-shrink: 0;
  }

  .chevron {
    transition: transform var(--glow-transition-fast);
  }

  .chevron.expanded {
    transform: rotate(90deg);
  }

  .tab-icon {
    color: var(--glow-text-tertiary);
    flex-shrink: 0;
  }

  .tab-item.active .tab-icon {
    color: var(--glow-accent-primary);
  }

  .tab-name {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-name-input {
    flex: 1;
    min-width: 0;
    padding: 2px 4px;
    background-color: var(--glow-bg-base);
    border: 1px solid var(--glow-accent-primary);
    border-radius: 4px;
    color: var(--glow-text-primary);
    font-size: 13px;
    outline: none;
  }

  .child-count {
    padding: 1px 6px;
    background-color: var(--glow-bg-elevated);
    border-radius: 10px;
    font-size: 11px;
    color: var(--glow-text-tertiary);
    flex-shrink: 0;
  }

  .children-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
