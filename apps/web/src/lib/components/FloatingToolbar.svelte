<script lang="ts">
  interface Props {
    position: { x: number; y: number };
    onCommand: (command: string) => void;
    isActive: (command: string) => boolean;
  }

  let { position, onCommand, isActive }: Props = $props();

  interface ToolbarButton {
    command: string;
    label: string;
    icon: string;
    shortcut?: string;
  }

  const buttons: ToolbarButton[] = [
    { command: 'bold', label: 'Bold', icon: 'B', shortcut: 'Cmd+B' },
    { command: 'italic', label: 'Italic', icon: 'I', shortcut: 'Cmd+I' },
    { command: 'strike', label: 'Strikethrough', icon: 'S', shortcut: 'Cmd+Shift+S' },
    { command: 'code', label: 'Code', icon: '</>', shortcut: 'Cmd+E' },
  ];
</script>

<div
  class="toolbar"
  style="left: {position.x}px; top: {position.y}px;"
  role="toolbar"
  aria-label="Formatting options"
>
  {#each buttons as button}
    <button
      class="toolbar-button"
      class:active={isActive(button.command)}
      onclick={() => onCommand(button.command)}
      title="{button.label}{button.shortcut !== undefined ? ` (${button.shortcut})` : ''}"
      aria-pressed={isActive(button.command)}
    >
      {#if button.icon === '</>'}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path
            d="M4.5 3L1 7l3.5 4M9.5 3L13 7l-3.5 4M8 2L6 12"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        <span class="icon" class:bold={button.command === 'bold'} class:italic={button.command === 'italic'} class:strike={button.command === 'strike'}>
          {button.icon}
        </span>
      {/if}
    </button>
  {/each}

  <span class="divider"></span>

  <button
    class="toolbar-button"
    onclick={() => onCommand('h1')}
    title="Heading 1 (Cmd+Alt+1)"
  >
    <span class="icon">H1</span>
  </button>

  <button
    class="toolbar-button"
    onclick={() => onCommand('h2')}
    title="Heading 2 (Cmd+Alt+2)"
  >
    <span class="icon">H2</span>
  </button>
</div>

<style>
  .toolbar {
    position: fixed;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.3),
      0 2px 4px -2px rgb(0 0 0 / 0.3);
    transform: translateX(-50%);
    z-index: 100;
    animation: fadeIn 150ms ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--glow-text-secondary);
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      color var(--glow-transition-fast);
  }

  .toolbar-button:hover {
    background-color: var(--glow-bg-elevated);
    color: var(--glow-text-primary);
  }

  .toolbar-button.active {
    background-color: var(--glow-accent-primary);
    color: white;
  }

  .toolbar-button:active {
    transform: scale(0.95);
  }

  .icon {
    font-size: 13px;
    font-weight: 500;
  }

  .icon.bold {
    font-weight: 700;
  }

  .icon.italic {
    font-style: italic;
  }

  .icon.strike {
    text-decoration: line-through;
  }

  .divider {
    width: 1px;
    height: 20px;
    background-color: var(--glow-border-subtle);
    margin: 0 4px;
  }
</style>
