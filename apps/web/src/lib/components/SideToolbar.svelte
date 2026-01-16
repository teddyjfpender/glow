<script lang="ts">
  interface Props {
    hasSelection?: boolean;
    bionicReadingActive?: boolean;
    onDraw?: () => void;
    onComment?: () => void;
    onRSVPReader?: () => void;
    onBionicReading?: () => void;
  }

  const {
    hasSelection = false,
    bionicReadingActive = false,
    onDraw,
    onComment,
    onRSVPReader,
    onBionicReading,
  }: Props = $props();

  // Dropdown state
  let showReadingMenu = $state(false);

  function handleReadingButtonClick(): void {
    showReadingMenu = !showReadingMenu;
  }

  function handleRSVPClick(): void {
    showReadingMenu = false;
    onRSVPReader?.();
  }

  function handleBionicClick(): void {
    showReadingMenu = false;
    onBionicReading?.();
  }

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.reading-menu-container')) {
      showReadingMenu = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="side-toolbar" role="toolbar" aria-label="Document tools">
  <!-- Draw/Excalidraw button -->
  <button
    class="toolbar-button"
    onclick={onDraw}
    title="Draw with Excalidraw"
    aria-label="Draw with Excalidraw"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Pencil -->
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <!-- Sparkles -->
      <path d="M12 2v2" />
      <path d="M12 8v2" />
      <path d="M9 5h2" />
      <path d="M13 5h2" />
    </svg>
  </button>

  <!-- Add Comment button -->
  <button
    class="toolbar-button"
    class:disabled={!hasSelection}
    onclick={onComment}
    disabled={!hasSelection}
    title={hasSelection ? 'Add comment' : 'Select text to add a comment'}
    aria-label="Add comment"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Comment bubble -->
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
      <!-- Plus sign -->
      <line x1="12" y1="8" x2="12" y2="14" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  </button>

  <!-- Reading Mode button with dropdown -->
  <div class="reading-menu-container">
    <button
      class="toolbar-button"
      class:active={showReadingMenu || bionicReadingActive}
      onclick={handleReadingButtonClick}
      title="Reading modes"
      aria-label="Reading modes"
      aria-expanded={showReadingMenu}
      aria-haspopup="true"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <!-- Play icon -->
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    {#if showReadingMenu}
      <div class="reading-dropdown" role="menu">
        <button
          class="dropdown-item"
          onclick={handleRSVPClick}
          role="menuitem"
        >
          <span class="dropdown-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
          <span class="dropdown-text">
            <span class="dropdown-title">RSVP Reader</span>
            <span class="dropdown-desc">Speed read one word at a time</span>
          </span>
        </button>

        <button
          class="dropdown-item"
          class:active={bionicReadingActive}
          onclick={handleBionicClick}
          role="menuitem"
        >
          <span class="dropdown-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7V4h16v3" />
              <path d="M9 20h6" />
              <path d="M12 4v16" />
            </svg>
          </span>
          <span class="dropdown-text">
            <span class="dropdown-title">
              Bionic Reading
              {#if bionicReadingActive}
                <span class="active-badge">On</span>
              {/if}
            </span>
            <span class="dropdown-desc">Bold word beginnings for faster reading</span>
          </span>
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .side-toolbar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    background-color: #1a1a1a;
    border: 1px solid var(--glow-border-default);
    border-radius: 24px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.2),
      0 2px 4px -2px rgb(0 0 0 / 0.15);
    transform: translateY(-50%);
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    color: var(--glow-accent-primary);
    border-radius: 12px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast, 150ms ease),
      color var(--glow-transition-fast, 150ms ease),
      transform var(--glow-transition-fast, 150ms ease);
  }

  .toolbar-button:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-accent-hover, #93c5fd);
  }

  .toolbar-button:active {
    transform: scale(0.95);
    background-color: var(--glow-bg-elevated);
  }

  .toolbar-button.active {
    background-color: var(--glow-accent-primary);
    color: white;
  }

  .toolbar-button.disabled,
  .toolbar-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    color: var(--glow-text-secondary);
  }

  .toolbar-button.disabled:hover,
  .toolbar-button:disabled:hover {
    background-color: transparent;
    color: var(--glow-text-secondary);
    transform: none;
  }

  /* Reading menu container */
  .reading-menu-container {
    position: relative;
  }

  /* Dropdown menu */
  .reading-dropdown {
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 12px;
    min-width: 240px;
    background-color: #1a1a1a;
    border: 1px solid var(--glow-border-default);
    border-radius: 12px;
    box-shadow:
      0 10px 25px rgb(0 0 0 / 0.3),
      0 4px 10px rgb(0 0 0 / 0.2);
    padding: 8px;
    z-index: 100;
  }

  .dropdown-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    padding: 12px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    color: var(--glow-text-primary);
    transition: background-color 0.15s ease;
  }

  .dropdown-item:hover {
    background-color: var(--glow-bg-elevated);
  }

  .dropdown-item.active {
    background-color: rgba(99, 102, 241, 0.15);
  }

  .dropdown-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background-color: var(--glow-bg-elevated);
    color: var(--glow-accent-primary);
    flex-shrink: 0;
  }

  .dropdown-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dropdown-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--glow-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dropdown-desc {
    font-size: 12px;
    color: var(--glow-text-tertiary);
  }

  .active-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    background-color: var(--glow-accent-primary);
    color: white;
    border-radius: 4px;
    text-transform: uppercase;
  }
</style>
