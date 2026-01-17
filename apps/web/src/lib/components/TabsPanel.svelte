<script lang="ts">
  import { tabsState } from '$lib/state/tabs.svelte';
  import type { TabId, OutlineHeading } from '$lib/types/tabs';
  import TabItem from './TabItem.svelte';
  import TabContextMenu from './TabContextMenu.svelte';

  interface Props {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
  }

  const { isCollapsed, onToggleCollapse }: Props = $props();

  // Context menu state
  let contextMenu = $state<{
    x: number;
    y: number;
    tabId: TabId;
  } | null>(null);

  // Outline section collapsed state
  let outlineCollapsed = $state(false);

  // Extract headings from active tab content
  const outline = $derived.by((): OutlineHeading[] => {
    const content = tabsState.activeTab?.content ?? '';
    return tabsState.extractHeadings(content);
  });

  function handleContextMenu(detail: { x: number; y: number; tabId: TabId }): void {
    contextMenu = detail;
  }

  function closeContextMenu(): void {
    contextMenu = null;
  }

  function handleAddRootTab(): void {
    tabsState.addTab(null);
  }

  function handleOutlineClick(heading: OutlineHeading): void {
    // Dispatch event to scroll to heading in editor
    const event = new CustomEvent('glow:scroll-to-heading', {
      bubbles: true,
      detail: { text: heading.text, level: heading.level },
    });
    document.dispatchEvent(event);
  }
</script>

<div class="tabs-panel-wrapper">
  <!-- Toggle button (always visible) -->
  <button
    class="toggle-btn"
    class:collapsed={isCollapsed}
    onclick={onToggleCollapse}
    title={isCollapsed ? 'Show tabs and outline' : 'Hide tabs and outline'}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      {#if isCollapsed}
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      {:else}
        <polyline points="9 18 15 12 9 6" />
      {/if}
    </svg>
  </button>

  {#if !isCollapsed}
    <aside class="tabs-panel">
      <!-- Tabs Section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Document tabs</h2>
          <button class="add-btn" onclick={handleAddRootTab} title="Add tab">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <ul class="tabs-list">
          {#each tabsState.rootTabs as tab (tab.id)}
            <TabItem {tab} depth={0} onContextMenu={handleContextMenu} />
          {/each}
        </ul>
      </section>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Outline Section -->
      <section class="section outline-section">
        <button class="section-header-btn" onclick={() => (outlineCollapsed = !outlineCollapsed)}>
          <svg
            class="chevron"
            class:collapsed={outlineCollapsed}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <h2 class="section-title">Outline</h2>
        </button>

        {#if !outlineCollapsed}
          {#if outline.length > 0}
            <ul class="outline-list">
              {#each outline as heading}
                <li>
                  <button
                    class="outline-item"
                    style="padding-left: {(heading.level - 1) * 12 + 8}px"
                    onclick={() => handleOutlineClick(heading)}
                  >
                    {heading.text}
                  </button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="empty-state">Add headings to see the outline</p>
          {/if}
        {/if}
      </section>

      <!-- Context Menu -->
      {#if contextMenu}
        <TabContextMenu x={contextMenu.x} y={contextMenu.y} tabId={contextMenu.tabId} onClose={closeContextMenu} />
      {/if}
    </aside>
  {/if}
</div>

<style>
  .tabs-panel-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 8px;
    color: var(--glow-text-secondary);
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast),
      border-color var(--glow-transition-fast);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
  }

  .toggle-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
    border-color: var(--glow-border-default);
  }

  .toggle-btn.collapsed {
    background-color: var(--glow-bg-elevated);
  }

  .tabs-panel {
    width: 240px;
    max-height: 500px;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-subtle);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow:
      0 4px 12px rgb(0 0 0 / 0.25),
      0 2px 4px rgb(0 0 0 / 0.1);
  }

  .section {
    padding: 12px;
    flex-shrink: 0;
  }

  .outline-section {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .divider {
    height: 1px;
    background-color: var(--glow-border-subtle);
    margin: 0 12px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .section-header-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    background: none;
    border: none;
    color: var(--glow-text-secondary);
    cursor: pointer;
    margin-bottom: 4px;
    width: 100%;
  }

  .section-header-btn:hover {
    color: var(--glow-text-primary);
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--glow-text-tertiary);
    margin: 0;
  }

  .section-header-btn .section-title {
    color: inherit;
  }

  .chevron {
    transition: transform var(--glow-transition-fast);
    flex-shrink: 0;
  }

  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .add-btn:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .tabs-list,
  .outline-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .tabs-list {
    max-height: 200px;
    overflow-y: auto;
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
    font-size: 12px;
    color: var(--glow-text-tertiary);
    padding: 4px 8px;
    margin: 0;
  }
</style>
