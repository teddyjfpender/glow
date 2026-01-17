<script lang="ts">
  import { documentsState } from '$lib/state/documents.svelte';
  import { onMount } from 'svelte';

  interface PaletteControls {
    selectCurrent: () => void;
    moveUp: () => void;
    moveDown: () => void;
  }

  interface Props {
    position: { x: number; y: number };
    query: string;
    onSelect: (documentId: string, title: string) => void;
    onCreateNew: (title: string) => void;
    onClose: () => void;
    onReady?: (controls: PaletteControls) => void;
  }

  const { position, query, onSelect, onCreateNew, onClose, onReady }: Props = $props();

  let paletteRef = $state<HTMLDivElement | null>(null);
  let selectedIndex = $state(0);

  // Filter documents based on query (case-insensitive match on title and previewText)
  const filteredDocuments = $derived.by(() => {
    const lowerQuery = query.toLowerCase();
    return documentsState.documents
      .filter(
        (doc) =>
          doc.title.toLowerCase().includes(lowerQuery) ||
          (doc.previewText?.toLowerCase().includes(lowerQuery) ?? false)
      )
      .slice(0, 8);
  });

  // Check if there's an exact title match
  const hasExactMatch = $derived.by(() => {
    const lowerQuery = query.toLowerCase();
    return documentsState.documents.some((doc) => doc.title.toLowerCase() === lowerQuery);
  });

  // Show create option if query is not empty and no exact match
  const showCreateOption = $derived(query.trim() !== '' && !hasExactMatch);

  // Total number of selectable items
  const totalItems = $derived(filteredDocuments.length + (showCreateOption ? 1 : 0));

  // Reset selected index when results change
  $effect(() => {
    // Access totalItems to track it
    const count = totalItems;
    if (selectedIndex >= count && count > 0) {
      selectedIndex = count - 1;
    } else if (count === 0) {
      selectedIndex = 0;
    }
  });

  // Provide control methods to parent via onReady callback
  onMount(() => {
    onReady?.({
      selectCurrent: () => handleSelect(),
      moveUp: () => {
        if (totalItems > 0) {
          selectedIndex = (selectedIndex - 1 + totalItems) % totalItems;
        }
      },
      moveDown: () => {
        if (totalItems > 0) {
          selectedIndex = (selectedIndex + 1) % totalItems;
        }
      },
    });
  });

  function handleSelect(): void {
    const docs = filteredDocuments;
    if (selectedIndex < docs.length) {
      const doc = docs[selectedIndex];
      onSelect(doc.id, doc.title);
    } else if (showCreateOption && selectedIndex === docs.length) {
      onCreateNew(query.trim());
    }
  }

  function handleItemClick(documentId: string, title: string): void {
    onSelect(documentId, title);
  }

  function handleCreateClick(): void {
    onCreateNew(query.trim());
  }

  function handleClickOutside(e: MouseEvent): void {
    if (paletteRef && !paletteRef.contains(e.target as Node)) {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="link-palette"
  style="left: {position.x}px; top: {position.y}px"
  role="listbox"
  tabindex="-1"
  bind:this={paletteRef}
  onclick={(e) => e.stopPropagation()}
>
  <input
    type="text"
    class="link-palette-search"
    value={query}
    placeholder="Search documents..."
    readonly
  />

  {#if totalItems === 0 && !showCreateOption}
    <div class="link-palette-empty">No documents found</div>
  {:else}
    <ul class="link-palette-results" role="listbox">
      {#each filteredDocuments as doc, index}
        <li role="option" aria-selected={index === selectedIndex}>
          <button
            class="link-palette-item"
            class:selected={index === selectedIndex}
            onclick={() => handleItemClick(doc.id, doc.title)}
            type="button"
          >
            <span class="link-palette-item-title">{doc.title}</span>
            {#if doc.previewText}
              <span class="link-palette-item-preview">{doc.previewText}</span>
            {/if}
          </button>
        </li>
      {/each}

      {#if showCreateOption}
        {@const createIndex = filteredDocuments.length}
        <li role="option" aria-selected={createIndex === selectedIndex}>
          <button
            class="link-palette-item link-palette-create"
            class:selected={createIndex === selectedIndex}
            onclick={handleCreateClick}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create [[{query.trim()}]]</span>
          </button>
        </li>
      {/if}
    </ul>
  {/if}
</div>
