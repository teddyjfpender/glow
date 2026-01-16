<script lang="ts">
  interface Props {
    pageNumber: number;
    totalPages: number;
    leftContent?: string;
    centerContent?: string;
    rightContent?: string;
    isEditing?: boolean;
    onEdit?: (section: 'left' | 'center' | 'right', value: string) => void;
  }

  const {
    pageNumber,
    totalPages,
    leftContent = '',
    centerContent = 'Page {pageNumber} of {totalPages}',
    rightContent = '',
    isEditing = false,
    onEdit,
  }: Props = $props();

  // Track which section is being edited
  let editingSection: 'left' | 'center' | 'right' | null = $state(null);
  let editValue = $state('');

  /**
   * Replace placeholder variables in content string
   * Supports: {pageNumber}, {totalPages}, {date}
   */
  function replacePlaceholders(content: string): string {
    if (!content) return '';

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return content
      .replace(/\{pageNumber\}/g, String(pageNumber))
      .replace(/\{totalPages\}/g, String(totalPages))
      .replace(/\{date\}/g, formattedDate);
  }

  function startEditing(section: 'left' | 'center' | 'right'): void {
    if (!isEditing || !onEdit) return;
    editingSection = section;
    // Use raw content (not processed) for editing
    editValue = section === 'left' ? leftContent
              : section === 'center' ? centerContent
              : rightContent;
  }

  function saveEdit(): void {
    if (editingSection && onEdit) {
      onEdit(editingSection, editValue);
    }
    editingSection = null;
    editValue = '';
  }

  function cancelEdit(): void {
    editingSection = null;
    editValue = '';
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }

  const processedLeft = $derived(replacePlaceholders(leftContent));
  const processedCenter = $derived(replacePlaceholders(centerContent));
  const processedRight = $derived(replacePlaceholders(rightContent));
</script>

<footer class="page-footer" class:editing={isEditing}>
  <!-- Left section -->
  <div class="footer-section left">
    {#if editingSection === 'left'}
      <input
        class="section-input"
        type="text"
        bind:value={editValue}
        onblur={saveEdit}
        onkeydown={handleKeydown}
        autofocus
      />
    {:else}
      <div
        class="section-content"
        class:editable={isEditing && !!onEdit}
        ondblclick={() => startEditing('left')}
        role={isEditing && onEdit ? 'button' : undefined}
        tabindex={isEditing && onEdit ? 0 : undefined}
      >
        {processedLeft || (isEditing && onEdit ? 'Double-click to edit' : '')}
      </div>
    {/if}
  </div>

  <!-- Center section -->
  <div class="footer-section center">
    {#if editingSection === 'center'}
      <input
        class="section-input"
        type="text"
        bind:value={editValue}
        onblur={saveEdit}
        onkeydown={handleKeydown}
        autofocus
      />
    {:else}
      <div
        class="section-content"
        class:editable={isEditing && !!onEdit}
        ondblclick={() => startEditing('center')}
        role={isEditing && onEdit ? 'button' : undefined}
        tabindex={isEditing && onEdit ? 0 : undefined}
      >
        {processedCenter || (isEditing && onEdit ? 'Double-click to edit' : '')}
      </div>
    {/if}
  </div>

  <!-- Right section -->
  <div class="footer-section right">
    {#if editingSection === 'right'}
      <input
        class="section-input"
        type="text"
        bind:value={editValue}
        onblur={saveEdit}
        onkeydown={handleKeydown}
        autofocus
      />
    {:else}
      <div
        class="section-content"
        class:editable={isEditing && !!onEdit}
        ondblclick={() => startEditing('right')}
        role={isEditing && onEdit ? 'button' : undefined}
        tabindex={isEditing && onEdit ? 0 : undefined}
      >
        {processedRight || (isEditing && onEdit ? 'Double-click to edit' : '')}
      </div>
    {/if}
  </div>
</footer>

<style>
  .page-footer {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    height: 60px;
    padding: 12px 96px;
    border-top: 1px solid var(--glow-border-subtle);
    font-size: 10pt;
    color: var(--glow-text-tertiary);
  }

  .page-footer.editing {
    border: 1px dashed var(--glow-border-default);
    border-radius: 4px;
    margin: 0 -1px -1px -1px;
  }

  .footer-section {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .footer-section.left {
    justify-content: flex-start;
  }

  .footer-section.center {
    justify-content: center;
  }

  .footer-section.right {
    justify-content: flex-end;
  }

  .section-content {
    font-size: 10pt;
    color: var(--glow-text-tertiary);
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: default;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-height: 1.5em;
  }

  .section-content.editable {
    cursor: pointer;
    border: 1px dashed transparent;
  }

  .section-content.editable:hover {
    background-color: var(--glow-bg-elevated);
    border-color: var(--glow-border-default);
  }

  .section-input {
    font-size: 10pt;
    color: var(--glow-text-tertiary);
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
