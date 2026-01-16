# Multi-Page Document Feature Implementation Plan

## Overview

This document outlines the implementation strategy for true multi-page document editing with proper page boundaries, headers, and footers in the Glow document editor.

## Technical Approach: Decoration-Based Virtual Pagination

Based on comprehensive research, we will use a **decoration-based virtual pagination** approach:

1. **Single TipTap Editor Instance** - One editor manages all content
2. **Visual Decorations** - Page boundaries are visual-only (never embedded in schema)
3. **Height Estimation with Caching** - Efficient page break calculations
4. **Separate Header/Footer Components** - Positioned per-page via CSS

### Why This Approach?

- Maintains clean document schema (critical for undo/redo)
- Avoids infinite loops in history operations
- Content remains fully editable everywhere
- Performance-optimized for real-time editing
- Matches patterns from successful implementations (Google Docs, Synology Office)

## Architecture

### Current State (Already Implemented)

The codebase already has multi-page data structures:

```typescript
// document.svelte.ts
interface PageContent {
  id: string;
  content: string;
}

interface DocumentState {
  pages: PageContent[];
  currentPageIndex: number;
  // ... other fields
}

// Methods exist: addPage(), deletePage(), goToPage(), nextPage(), prevPage()
```

### Target Architecture

```
DocumentPage.svelte
├── PageFrame.svelte (per page)
│   ├── PageHeader.svelte
│   ├── PageContent.svelte (viewport into single editor)
│   └── PageFooter.svelte
├── PageNavigator.svelte
└── Single TipTap Editor (manages all content)
```

## Page Dimensions

- **Page Size**: 816px × 1056px (US Letter at 96 DPI)
- **Margins**: 96px horizontal, 96px top, 72px bottom
- **Header Height**: 72px
- **Footer Height**: 60px
- **Content Area**: 624px × 828px per page
- **Page Gap**: 32px between pages

## Implementation Phases

### Phase 1: Foundation - Test Infrastructure (TDD)

**Files to create:**
- `/apps/web/src/lib/editor/extensions/__tests__/page-break.test.ts`
- `/apps/web/src/lib/editor/extensions/__tests__/content-height.test.ts`
- `/apps/web/vitest.setup.ts`

**Tests to write first:**
1. Page break position calculation
2. Content height measurement
3. Page count from content height

### Phase 2: Page Break Extension

**Files to create:**
- `/apps/web/src/lib/editor/extensions/page-break.ts`
- `/apps/web/src/lib/editor/utils/page-metrics.ts`

**Implementation:**
1. Calculate page breaks based on accumulated content height
2. Use ProseMirror decorations to mark page boundaries
3. Track page positions for navigation

### Phase 3: Multi-Page Rendering

**Files to modify:**
- `/apps/web/src/lib/components/DocumentPage.svelte`

**Files to create:**
- `/apps/web/src/lib/components/PageFrame.svelte`
- `/apps/web/src/lib/components/PageHeader.svelte`
- `/apps/web/src/lib/components/PageFooter.svelte`

**Implementation:**
1. Single editor instance containing all content
2. Multiple PageFrame components showing different sections
3. CSS transforms to position content in each page viewport

### Phase 4: Headers & Footers

**Files to create:**
- `/apps/web/src/lib/state/header-footer.svelte.ts`

**Features:**
- Document-wide header/footer definitions
- Left/center/right sections
- Page number variables
- Double-click to edit

### Phase 5: Navigation & Polish

**Features:**
- Page indicator (Page X of Y)
- Keyboard shortcuts (Page Up/Down, Ctrl+Home/End)
- Page thumbnails sidebar (optional)
- Go to page dialog

## Testing Strategy (TDD)

### Unit Tests
- Page break calculation logic
- Content height measurement
- Header/footer rendering
- Document serialization with pages

### Integration Tests
- Content flow across page boundaries
- Cursor movement between pages
- Selection spanning pages
- Undo/redo with page operations

### E2E Tests
- User typing creates new pages
- Editing on any page
- Header/footer editing
- Page navigation interactions

## CSS Design Tokens

```css
:root {
  --glow-page-width: 816px;
  --glow-page-height: 1056px;
  --glow-page-margin-horizontal: 96px;
  --glow-page-margin-top: 96px;
  --glow-page-margin-bottom: 72px;
  --glow-page-gap: 32px;
  --glow-header-height: 72px;
  --glow-footer-height: 60px;
}
```

## Performance Considerations

1. **Lazy height measurement** - Only measure visible/changed content
2. **Cached page positions** - Invalidate only on content changes
3. **Virtual rendering** - Only render visible pages + buffer
4. **Debounced recalculation** - Batch updates during rapid typing

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance with many pages | Virtual rendering, measurement caching |
| Undo/redo complexity | Keep pages as visual layer, not schema |
| Cross-page selection | Track global positions, handle in plugin |
| Content at page boundaries | Smart break-point detection |

## Success Criteria

- [ ] Documents with 100+ pages perform smoothly
- [ ] All content is editable regardless of page
- [ ] Page breaks update in real-time during editing
- [ ] Headers/footers display correctly on each page
- [ ] Undo/redo works without issues
- [ ] Save/load preserves all page data
