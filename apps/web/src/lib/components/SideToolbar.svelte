<script lang="ts">
  interface Props {
    hasSelection?: boolean;
    onDraw?: () => void;
    onComment?: () => void;
    onRSVPReader?: () => void;
  }

  const {
    hasSelection = false,
    onDraw,
    onComment,
    onRSVPReader,
  }: Props = $props();
</script>

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

  <!-- RSVP Reader button -->
  <button
    class="toolbar-button"
    onclick={onRSVPReader}
    title="RSVP Speed Reader"
    aria-label="RSVP Speed Reader"
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
</div>

<style>
  .side-toolbar {
    position: fixed;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 24px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
    z-index: 50;
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
</style>
