<script lang="ts">
  import '../app.css';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();
</script>

<div class="app">
  {@render children()}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--glow-bg-base);
  }
</style>
