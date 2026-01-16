<script lang="ts">
  import { REACTION_EMOJIS, type ReactionEmoji } from '$lib/comments/types';

  interface Props {
    onSelect: (emoji: ReactionEmoji) => void;
    onClose: () => void;
  }

  const { onSelect, onClose }: Props = $props();

  let pickerRef = $state<HTMLDivElement | null>(null);

  function handleSelect(emoji: ReactionEmoji): void {
    onSelect(emoji);
    onClose();
  }

  function handleClickOutside(event: MouseEvent): void {
    if (pickerRef && !pickerRef.contains(event.target as Node)) {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  $effect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="reaction-picker" bind:this={pickerRef}>
  <div class="emoji-grid">
    {#each REACTION_EMOJIS as emoji}
      <button
        type="button"
        class="emoji-btn"
        onclick={() => handleSelect(emoji)}
        aria-label={`React with ${emoji}`}
      >
        {emoji}
      </button>
    {/each}
  </div>
</div>

<style>
  .reaction-picker {
    position: absolute;
    z-index: 100;
    background-color: var(--glow-bg-surface);
    border: 1px solid var(--glow-border-default);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 8px;
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .emoji-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: 18px;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color var(--glow-transition-fast);
  }

  .emoji-btn:hover {
    background-color: var(--glow-bg-elevated);
  }

  .emoji-btn:focus-visible {
    outline: 2px solid var(--glow-accent-primary);
    outline-offset: -2px;
  }
</style>
