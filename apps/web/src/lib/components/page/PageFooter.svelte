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
    centerContent = 'Page {pageNumber} of {totalPages}',
    rightContent = '',
    isEditing = false,
  }: Props = $props();

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

  const processedLeft = $derived(replacePlaceholders(leftContent));
  const processedCenter = $derived(replacePlaceholders(centerContent));
  const processedRight = $derived(replacePlaceholders(rightContent));
</script>

<footer class="page-footer" class:editing={isEditing}>
  <div class="footer-section left">
    {#if isEditing}
      <button class="section-button" type="button">
        {processedLeft || 'Click to edit'}
      </button>
    {:else}
      <span class="section-content">{processedLeft}</span>
    {/if}
  </div>

  <div class="footer-section center">
    {#if isEditing}
      <button class="section-button" type="button">
        {processedCenter || 'Click to edit'}
      </button>
    {:else}
      <span class="section-content">{processedCenter}</span>
    {/if}
  </div>

  <div class="footer-section right">
    {#if isEditing}
      <button class="section-button" type="button">
        {processedRight || 'Click to edit'}
      </button>
    {:else}
      <span class="section-content">{processedRight}</span>
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .section-button {
    background: none;
    border: 1px dashed transparent;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 10pt;
    color: var(--glow-text-tertiary);
    cursor: pointer;
    transition:
      background-color var(--glow-transition-fast),
      border-color var(--glow-transition-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .section-button:hover {
    background-color: var(--glow-bg-elevated);
    border-color: var(--glow-border-default);
  }

  .section-button:focus {
    outline: none;
    border-color: var(--glow-accent-primary);
  }
</style>
