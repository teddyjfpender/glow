<script lang="ts">
  interface MenuItem {
    label: string;
    shortcut?: string;
    action?: () => void;
    divider?: boolean;
    disabled?: boolean;
  }

  interface Menu {
    label: string;
    items: MenuItem[];
  }

  interface Props {
    onAction?: (action: string) => void;
  }

  const { onAction }: Props = $props();

  let activeMenu = $state<string | null>(null);

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N' },
        { label: 'Open', shortcut: 'Ctrl+O' },
        { divider: true, label: '' },
        { label: 'Save', shortcut: 'Ctrl+S' },
        { label: 'Download', shortcut: '' },
        { divider: true, label: '' },
        { label: 'Print', shortcut: 'Ctrl+P' },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        { divider: true, label: '' },
        { label: 'Select all', shortcut: 'Ctrl+A' },
        { label: 'Find and replace', shortcut: 'Ctrl+H' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Print layout' },
        { divider: true, label: '' },
        { label: 'Show ruler' },
        { label: 'Show outline' },
        { divider: true, label: '' },
        { label: 'Full screen' },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'Image' },
        { label: 'Table' },
        { label: 'Drawing' },
        { label: 'Chart' },
        { divider: true, label: '' },
        { label: 'Horizontal line' },
        { label: 'Page break' },
        { divider: true, label: '' },
        { label: 'Link', shortcut: 'Ctrl+K' },
        { label: 'Comment', shortcut: 'Ctrl+Alt+M' },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Text' },
        { label: 'Paragraph styles' },
        { label: 'Align & indent' },
        { label: 'Line & paragraph spacing' },
        { divider: true, label: '' },
        { label: 'Columns' },
        { label: 'Bullets & numbering' },
        { divider: true, label: '' },
        { label: 'Headers & footers' },
        { label: 'Page numbers' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Spelling and grammar' },
        { label: 'Word count' },
        { divider: true, label: '' },
        { label: 'Review suggested edits' },
        { label: 'Compare documents' },
        { divider: true, label: '' },
        { label: 'Preferences' },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Help' },
        { label: 'Keyboard shortcuts' },
        { divider: true, label: '' },
        { label: 'About Glow' },
      ],
    },
  ];

  function handleMenuClick(label: string): void {
    if (activeMenu === label) {
      activeMenu = null;
    } else {
      activeMenu = label;
    }
  }

  function handleItemClick(item: MenuItem): void {
    if (item.divider === true || item.disabled === true) {
      return;
    }
    activeMenu = null;
    onAction?.(item.label);
  }

  function handleMouseEnter(label: string): void {
    if (activeMenu !== null) {
      activeMenu = label;
    }
  }

  function closeMenus(): void {
    activeMenu = null;
  }
</script>

<svelte:window onclick={closeMenus} />

<nav class="menu-bar" role="menubar">
  {#each menus as menu}
    <div class="menu-container">
      <button
        class="menu-button"
        class:active={activeMenu === menu.label}
        onclick={(e) => {
          e.stopPropagation();
          handleMenuClick(menu.label);
        }}
        onmouseenter={() => {
          handleMouseEnter(menu.label);
        }}
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={activeMenu === menu.label}
      >
        {menu.label}
      </button>

      {#if activeMenu === menu.label}
        <div
          class="dropdown"
          role="menu"
          onclick={(e) => {
            e.stopPropagation();
          }}
        >
          {#each menu.items as item}
            {#if item.divider}
              <div class="divider"></div>
            {:else}
              <button
                class="dropdown-item"
                class:disabled={item.disabled}
                onclick={() => {
                  handleItemClick(item);
                }}
                role="menuitem"
              >
                <span class="item-label">{item.label}</span>
                {#if item.shortcut}
                  <span class="item-shortcut">{item.shortcut}</span>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</nav>

<style>
  .menu-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 4px;
  }

  .menu-container {
    position: relative;
  }

  .menu-button {
    font-size: 13px;
    font-weight: 400;
    color: var(--glow-text-primary);
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .menu-button:hover,
  .menu-button.active {
    background-color: var(--glow-bg-elevated);
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 240px;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    padding: 4px 0;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.3),
      0 2px 4px -2px rgb(0 0 0 / 0.3);
    z-index: 1000;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--glow-text-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background-color var(--glow-transition-fast);
  }

  .dropdown-item:hover:not(.disabled) {
    background-color: var(--glow-bg-elevated);
  }

  .dropdown-item.disabled {
    color: var(--glow-text-tertiary);
    cursor: default;
  }

  .item-label {
    flex: 1;
  }

  .item-shortcut {
    font-size: 12px;
    color: var(--glow-text-tertiary);
    margin-left: 24px;
  }

  .divider {
    height: 1px;
    background-color: var(--glow-border-subtle);
    margin: 4px 0;
  }
</style>
