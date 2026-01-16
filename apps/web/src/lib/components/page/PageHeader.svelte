<script lang="ts">
  interface Props {
    pageNumber: number;
    totalPages: number;
    leftContent?: string;
    centerContent?: string;
    rightContent?: string;
    isEditing?: boolean;
  }

  const {
    pageNumber,
    totalPages,
    leftContent = '',
    centerContent = '',
    rightContent = '',
    isEditing = false,
  }: Props = $props();

  // Track which section is being edited
  let editingSection: 'left' | 'center' | 'right' | null = $state(null);
  let editValue = $state('');

  /**
   * Replace placeholder variables in content string
   * Supported placeholders:
   * - {pageNumber} - Current page number
   * - {totalPages} - Total page count
   * - {date} - Current date in locale format
   */
  function processContent(content: string): string {
    if (!content) return '';

    const now = new Date();
    const dateStr = now.toLocaleDateString();

    return content
      .replace(/\{pageNumber\}/g, String(pageNumber))
      .replace(/\{totalPages\}/g, String(totalPages))
      .replace(/\{date\}/g, dateStr);
  }

  function startEditing(section: 'left' | 'center' | 'right', currentValue: string): void {
    if (!isEditing) return;
    editingSection = section;
    editValue = currentValue;
  }

  function finishEditing(): void {
    // In a real implementation, this would emit an event to update the content
    // For now, we just close the editing state
    editingSection = null;
    editValue = '';
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEditing();
    }
    if (event.key === 'Escape') {
      editingSection = null;
      editValue = '';
    }
  }

  // Derived processed content for each section
  const processedLeft = $derived(processContent(leftContent));
  const processedCenter = $derived(processContent(centerContent));
  const processedRight = $derived(processContent(rightContent));
</script>

<header class="page-header" class:editing={isEditing}>
  <!-- Left section -->
  <div class="header-section left">
    {#if editingSection === 'left'}
      <input
        class="section-input"
        type="text"
        bind:value={editValue}
        onblur={finishEditing}
        onkeydown={handleKeydown}
      />
    {:else}
      <button
        class="section-content"
        class:editable={isEditing}
        onclick={() => startEditing('left', leftContent)}
        disabled={!isEditing}
      >
        {processedLeft}
      </button>
    {/if}
  </div>

  <!-- Center section -->
  <div class="header-section center">
    {#if editingSection === 'center'}
      <input
        class="section-input"
        type="text"
        bind:value={editValue}
        onblur={finishEditing}
        onkeydown={handleKeydown}
      />
    {:else}
      <button
        class="section-content"
        class:editable={isEditing}
        onclick={() => startEditing('center', centerContent)}
        disabled={!isEditing}
      >
        {processedCenter}
      </button>
    {/if}
  </div>

  <!-- Right section -->
  <div class="header-section right">
    {#if editingSection === 'right'}
      <input
        class="section-input"
        type="text"
        bind:value={editValue}
        onblur={finishEditing}
        onkeydown={handleKeydown}
      />
    {:else}
      <button
        class="section-content"
        class:editable={isEditing}
        onclick={() => startEditing('right', rightContent)}
        disabled={!isEditing}
      >
        {processedRight}
      </button>
    {/if}
  </div>
</header>

<style>
  .page-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    height: 72px;
    padding: 12px 96px;
    border-bottom: 1px solid var(--glow-border-subtle);
    font-size: 10pt;
    color: var(--glow-text-secondary);
  }

  .page-header.editing {
    border: 1px dashed var(--glow-border-default);
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .header-section {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .header-section.left {
    justify-content: flex-start;
  }

  .header-section.center {
    justify-content: center;
  }

  .header-section.right {
    justify-content: flex-end;
  }

  .section-content {
    font-size: 10pt;
    color: var(--glow-text-secondary);
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: default;
    transition: background-color var(--glow-transition-fast);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section-content.editable {
    cursor: pointer;
  }

  .section-content.editable:hover {
    background-color: var(--glow-bg-elevated);
  }

  .section-content:disabled {
    cursor: default;
  }

  .section-input {
    font-size: 10pt;
    color: var(--glow-text-secondary);
    background-color: var(--glow-bg-elevated);
    border: 1px solid var(--glow-border-default);
    padding: 4px 8px;
    border-radius: 4px;
    outline: none;
    width: 100%;
    max-width: 200px;
  }

  .section-input:focus {
    border-color: var(--glow-accent-primary);
  }
</style>
