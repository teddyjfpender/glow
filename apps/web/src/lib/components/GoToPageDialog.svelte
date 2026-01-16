<script lang="ts">
  interface Props {
    isOpen: boolean;
    totalPages: number;
    onClose: () => void;
    onGoToPage: (page: number) => void;
  }

  const { isOpen, totalPages, onClose, onGoToPage }: Props = $props();

  let pageInput = $state('');
  let error = $state('');

  function handleSubmit(): void {
    const page = parseInt(pageInput, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      error = `Please enter a page number between 1 and ${totalPages}`;
      return;
    }
    onGoToPage(page);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      onClose();
    } else if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  // Reset state when dialog opens
  $effect(() => {
    if (isOpen) {
      pageInput = '';
      error = '';
    }
  });
</script>

{#if isOpen}
  <div class="dialog-overlay" onclick={onClose} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <h3 id="dialog-title">Go to Page</h3>
      <input
        type="number"
        bind:value={pageInput}
        placeholder="Page number"
        min="1"
        max={totalPages}
        onkeydown={handleKeyDown}
        autofocus
        aria-describedby={error ? 'error-message' : undefined}
      />
      {#if error}
        <p id="error-message" class="error">{error}</p>
      {/if}
      <div class="buttons">
        <button type="button" onclick={onClose}>Cancel</button>
        <button type="button" onclick={handleSubmit} class="primary">Go</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background-color: var(--glow-bg-elevated, #1a1a1a);
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 8px;
    padding: 24px;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--glow-text-primary, #fff);
  }

  input {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid var(--glow-border-default, #333);
    border-radius: 6px;
    background-color: var(--glow-bg-surface, #121212);
    color: var(--glow-text-primary, #fff);
    outline: none;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--glow-accent-primary, #60a5fa);
  }

  input::placeholder {
    color: var(--glow-text-tertiary, #666);
  }

  /* Hide number input spinners */
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  .error {
    margin: 8px 0 0 0;
    font-size: 12px;
    color: var(--glow-error, #ef4444);
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  button {
    padding: 8px 16px;
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }

  button:not(.primary) {
    background-color: transparent;
    border: 1px solid var(--glow-border-default, #333);
    color: var(--glow-text-secondary, #aaa);
  }

  button:not(.primary):hover {
    background-color: var(--glow-bg-surface, #222);
    border-color: var(--glow-border-hover, #444);
  }

  button.primary {
    background-color: var(--glow-accent-primary, #60a5fa);
    border: 1px solid var(--glow-accent-primary, #60a5fa);
    color: #fff;
  }

  button.primary:hover {
    background-color: var(--glow-accent-hover, #3b82f6);
    border-color: var(--glow-accent-hover, #3b82f6);
  }
</style>
