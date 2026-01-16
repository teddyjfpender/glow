<script lang="ts">
  import type { Snippet } from 'svelte';
  import PageHeader from './PageHeader.svelte';
  import PageFooter from './PageFooter.svelte';
  import {
    PAGE_WIDTH,
    PAGE_HEIGHT,
    HEADER_HEIGHT,
    FOOTER_HEIGHT,
  } from '$lib/editor/utils/page-metrics';

  interface Props {
    pageNumber: number;
    totalPages: number;
    headerConfig?: { left?: string; center?: string; right?: string };
    footerConfig?: { left?: string; center?: string; right?: string };
    children: Snippet;
    onHeaderEdit?: (section: 'left' | 'center' | 'right', value: string) => void;
    onFooterEdit?: (section: 'left' | 'center' | 'right', value: string) => void;
  }

  const {
    pageNumber,
    totalPages,
    headerConfig = {},
    footerConfig = {},
    children,
    onHeaderEdit,
    onFooterEdit,
  }: Props = $props();

  // Determine if editing is enabled based on callback presence
  const isHeaderEditing = $derived(!!onHeaderEdit);
  const isFooterEditing = $derived(!!onFooterEdit);

  // Export PAGE constants for external use
  export { PAGE_WIDTH, PAGE_HEIGHT, HEADER_HEIGHT, FOOTER_HEIGHT };
</script>

<div class="page-frame">
  <PageHeader
    {pageNumber}
    {totalPages}
    leftContent={headerConfig.left}
    centerContent={headerConfig.center}
    rightContent={headerConfig.right}
    isEditing={isHeaderEditing}
    onEdit={onHeaderEdit}
  />

  <div class="page-content">
    {@render children()}
  </div>

  <PageFooter
    {pageNumber}
    {totalPages}
    leftContent={footerConfig.left}
    centerContent={footerConfig.center}
    rightContent={footerConfig.right}
    isEditing={isFooterEditing}
    onEdit={onFooterEdit}
  />
</div>

<style>
  .page-frame {
    display: grid;
    grid-template-rows: 72px 1fr 60px;
    width: 816px;
    height: 1056px;
    background-color: #121212;
    border-radius: 2px;
    box-shadow:
      0 1px 3px rgb(0 0 0 / 0.3),
      0 4px 12px rgb(0 0 0 / 0.2);
  }

  .page-content {
    overflow: hidden;
  }
</style>
