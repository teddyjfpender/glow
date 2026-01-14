<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EditorCanvas from '$lib/components/EditorCanvas.svelte';
  import { documentState } from '$lib/state/document.svelte';

  let sidebarOpen = $state(true);

  function toggleSidebar(): void {
    sidebarOpen = !sidebarOpen;
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent): void {
    // Cmd/Ctrl + \ to toggle sidebar
    if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
      event.preventDefault();
      toggleSidebar();
    }

    // Cmd/Ctrl + S to save (prevent default, auto-save handles it)
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      documentState.save();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="layout">
  <Header title={documentState.title} {toggleSidebar} />

  <div class="main">
    {#if sidebarOpen}
      <Sidebar />
    {/if}

    <EditorCanvas />
  </div>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
</style>
