<script lang="ts">
  interface Props {
    wordCount: number;
  }

  const { wordCount }: Props = $props();

  function formatWordCount(count: number): string {
    if (count === 0) {
      return '0 words';
    }
    if (count === 1) {
      return '1 word';
    }
    return `${count.toLocaleString()} words`;
  }
</script>

<footer class="status-bar">
  <div class="left">
    <span class="word-count">{formatWordCount(wordCount)}</span>
  </div>

  <div class="right">
    <span class="hint">Press / for commands</span>
  </div>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 16px;
    background-color: var(--glow-bg-surface);
    border-top: 1px solid var(--glow-border-subtle);
    flex-shrink: 0;
  }

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .word-count,
  .hint {
    font-size: 12px;
    color: var(--glow-text-tertiary);
  }

  .hint {
    opacity: 0.7;
  }
</style>
