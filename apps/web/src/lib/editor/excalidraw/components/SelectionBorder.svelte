<script lang="ts">
  type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

  interface Props {
    width: number;
    height: number;
    onResizeStart?: (handle: HandlePosition, e: MouseEvent) => void;
    onResize?: (handle: HandlePosition, deltaX: number, deltaY: number, e: MouseEvent) => void;
    onResizeEnd?: (handle: HandlePosition) => void;
  }

  const { width, height, onResizeStart, onResize, onResizeEnd }: Props = $props();

  let activeHandle = $state<HandlePosition | null>(null);
  let startX = $state(0);
  let startY = $state(0);

  const handles: { position: HandlePosition; cursor: string }[] = [
    { position: 'nw', cursor: 'nwse-resize' },
    { position: 'n', cursor: 'ns-resize' },
    { position: 'ne', cursor: 'nesw-resize' },
    { position: 'e', cursor: 'ew-resize' },
    { position: 'se', cursor: 'nwse-resize' },
    { position: 's', cursor: 'ns-resize' },
    { position: 'sw', cursor: 'nesw-resize' },
    { position: 'w', cursor: 'ew-resize' },
  ];

  function getHandleStyle(position: HandlePosition): string {
    const size = 8;
    const offset = -size / 2;

    const offsetStr = String(offset);
    switch (position) {
      case 'nw':
        return `top: ${offsetStr}px; left: ${offsetStr}px;`;
      case 'n':
        return `top: ${offsetStr}px; left: calc(50% + ${offsetStr}px);`;
      case 'ne':
        return `top: ${offsetStr}px; right: ${offsetStr}px;`;
      case 'e':
        return `top: calc(50% + ${offsetStr}px); right: ${offsetStr}px;`;
      case 'se':
        return `bottom: ${offsetStr}px; right: ${offsetStr}px;`;
      case 's':
        return `bottom: ${offsetStr}px; left: calc(50% + ${offsetStr}px);`;
      case 'sw':
        return `bottom: ${offsetStr}px; left: ${offsetStr}px;`;
      case 'w':
        return `top: calc(50% + ${offsetStr}px); left: ${offsetStr}px;`;
      default:
        return '';
    }
  }

  function handleMouseDown(position: HandlePosition, e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    activeHandle = position;
    startX = e.clientX;
    startY = e.clientY;

    onResizeStart?.(position, e);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!activeHandle) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    onResize?.(activeHandle, deltaX, deltaY, e);
  }

  function handleMouseUp(): void {
    if (activeHandle) {
      onResizeEnd?.(activeHandle);
    }

    activeHandle = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
</script>

<div class="selection-border" style="width: {width}px; height: {height}px;">
  {#each handles as { position, cursor }}
    <!-- svelte-ignore a11y_role_has_required_aria_props -->
    <div
      class="resize-handle"
      style="{getHandleStyle(position)} cursor: {cursor};"
      onmousedown={(e) => handleMouseDown(position, e)}
      role="slider"
      tabindex="-1"
      aria-label="Resize handle {position}"
    ></div>
  {/each}
</div>

<style>
  .selection-border {
    position: absolute;
    top: 0;
    left: 0;
    border: 2px solid #3b82f6;
    pointer-events: none;
    box-sizing: border-box;
  }

  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: white;
    border: 1px solid #3b82f6;
    box-sizing: border-box;
    pointer-events: auto;
    z-index: 10;
  }

  .resize-handle:hover {
    background: #3b82f6;
  }
</style>
