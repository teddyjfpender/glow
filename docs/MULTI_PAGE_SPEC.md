# Multi-Page Document Support - Technical Specification

**Version**: 2.0
**Status**: Ready for Implementation
**Last Updated**: 2026-01-16

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [User Stories](#user-stories)
4. [Technical Architecture](#technical-architecture)
5. [TDD Test Suite](#tdd-test-suite)
6. [Implementation Plan](#implementation-plan)
7. [API Reference](#api-reference)
8. [Success Criteria](#success-criteria)

---

## Executive Summary

### Goal
Implement Google Docs-equivalent multi-page document editing with proper page boundaries, headers/footers, content overflow handling, and seamless cross-page editing.

### Approach
**Decoration-Based Virtual Pagination** with a single TipTap/ProseMirror editor instance. Content flows continuously while visual page boundaries are rendered via CSS clipping and ProseMirror decorations. This preserves clean undo/redo history and enables real-time collaborative editing.

### Key Deliverables
1. **Visual Page Rendering**: Multiple discrete page frames with proper dimensions
2. **Content Clipping**: Content respects page boundaries visually
3. **Headers/Footers**: Editable per-page headers and footers with placeholders
4. **Page Navigation**: Keyboard shortcuts, scroll tracking, go-to-page dialog
5. **Smart Page Breaks**: Orphan/widow prevention, keep-with-next for headings
6. **Manual Page Breaks**: User-insertable hard page breaks

---

## Current State Analysis

### What Exists (Completed)

| Component | Status | Location |
|-----------|--------|----------|
| Page metrics constants | ✅ Complete | `lib/editor/utils/page-metrics.ts` |
| Page metrics tests | ✅ Complete | `lib/editor/utils/__tests__/page-metrics.test.ts` |
| Header/footer state | ✅ Complete | `lib/state/header-footer.svelte.ts` |
| PageFrame component | ✅ Complete | `lib/components/page/PageFrame.svelte` |
| PageHeader component | ✅ Complete | `lib/components/page/PageHeader.svelte` |
| PageFooter component | ✅ Complete | `lib/components/page/PageFooter.svelte` |
| Document state (multi-page) | ✅ Complete | `lib/state/document.svelte.ts` |
| Visual page break indicators | ✅ Partial | `lib/components/DocumentPage.svelte` |

### What's Missing (Gaps)

| Feature | Priority | Complexity |
|---------|----------|------------|
| Content clipping per page | P0 | High |
| PageFrame integration in DocumentPage | P0 | Medium |
| Header/footer edit mode | P1 | Medium |
| Manual page break extension | P1 | Medium |
| Page navigation (keyboard) | P1 | Low |
| Current page tracking on scroll | P1 | Low |
| Go-to-page dialog | P2 | Low |
| Orphan/widow handling | P2 | High |
| Page thumbnails sidebar | P3 | Medium |

---

## User Stories

### Epic 1: Visual Page Rendering

#### US-1.1: See Discrete Pages
**As a** document author
**I want to** see my document rendered as discrete pages with visible boundaries
**So that** I understand exactly how the document will print

**Acceptance Criteria:**
- [ ] Document displays as separate page frames with 32px gaps between them
- [ ] Each page frame is 816x1056px (US Letter at 96 DPI)
- [ ] Pages have proper shadow/border styling to appear as paper
- [ ] Page count updates in real-time as content is added/removed

#### US-1.2: Content Respects Page Boundaries
**As a** document author
**I want to** see content clip at page boundaries
**So that** text doesn't visually overflow from one page to the next

**Acceptance Criteria:**
- [ ] Text at page bottom is clipped (not overflowing)
- [ ] Content continues on the next page's content area
- [ ] Single editor instance handles all content (seamless editing)
- [ ] Cursor can move freely across page boundaries

#### US-1.3: View Page Margins
**As a** document author
**I want to** see visual indicators of the printable area
**So that** I know where my content will appear when printed

**Acceptance Criteria:**
- [ ] 96px horizontal margins visible on each page
- [ ] 96px top margin, 72px bottom margin visible
- [ ] Content area is clearly distinguished from margin area
- [ ] Margins are not editable content areas

---

### Epic 2: Headers and Footers

#### US-2.1: View Headers and Footers
**As a** document author
**I want to** see headers and footers on each page
**So that** I can add running titles and page numbers

**Acceptance Criteria:**
- [ ] 72px header area displayed at top of each page
- [ ] 60px footer area displayed at bottom of each page
- [ ] Default footer shows "Page X of Y"
- [ ] Headers/footers are visually distinct from content area

#### US-2.2: Edit Headers and Footers
**As a** document author
**I want to** double-click headers/footers to edit them
**So that** I can customize what appears on each page

**Acceptance Criteria:**
- [ ] Double-click on header enters header edit mode
- [ ] Double-click on footer enters footer edit mode
- [ ] Three sections available: left, center, right
- [ ] Changes apply to all pages (or first page if different)
- [ ] Click outside exits edit mode and saves

#### US-2.3: Use Placeholders in Headers/Footers
**As a** document author
**I want to** insert placeholders like {pageNumber} and {totalPages}
**So that** headers/footers update automatically

**Acceptance Criteria:**
- [ ] `{pageNumber}` renders as current page number
- [ ] `{totalPages}` renders as total page count
- [ ] `{date}` renders as current date (optional)
- [ ] Placeholders update when pages change

#### US-2.4: Different First Page Header/Footer
**As a** document author
**I want to** have a different header/footer on the first page
**So that** I can have a title page without page numbers

**Acceptance Criteria:**
- [ ] Toggle "Different first page" option exists
- [ ] First page can have blank or custom header/footer
- [ ] Subsequent pages use the standard header/footer
- [ ] Setting persists with document save/load

---

### Epic 3: Page Navigation

#### US-3.1: See Current Page Indicator
**As a** document author
**I want to** see which page I'm currently viewing
**So that** I know my position in the document

**Acceptance Criteria:**
- [ ] Footer shows "Page X of Y" for current scroll position
- [ ] Page indicator updates in real-time during scroll
- [ ] Indicator is clickable to open go-to-page dialog
- [ ] Current page is based on viewport center position

#### US-3.2: Navigate with Keyboard
**As a** document author
**I want to** use keyboard shortcuts to navigate pages
**So that** I can quickly move through my document

**Acceptance Criteria:**
- [ ] `Page Down` moves to next page
- [ ] `Page Up` moves to previous page
- [ ] `Ctrl+End` jumps to last page
- [ ] `Ctrl+Home` jumps to first page
- [ ] Navigation respects focus (editor vs. other inputs)

#### US-3.3: Go to Specific Page
**As a** document author
**I want to** jump to a specific page number
**So that** I can quickly navigate long documents

**Acceptance Criteria:**
- [ ] "Go to page" dialog accessible via `Ctrl+G`
- [ ] Input accepts page number 1 to N
- [ ] Invalid page numbers show error
- [ ] Dialog closes and scrolls to page on submit

---

### Epic 4: Page Breaks

#### US-4.1: Insert Manual Page Break
**As a** document author
**I want to** insert a manual page break
**So that** I can control where new pages start

**Acceptance Criteria:**
- [ ] `Ctrl+Enter` inserts page break at cursor
- [ ] Page break shows as horizontal line indicator
- [ ] Page break is selectable and deletable
- [ ] Content after break starts on new page

#### US-4.2: Automatic Page Breaks
**As a** document author
**I want to** have pages break automatically when content overflows
**So that** I don't have to manually manage page breaks

**Acceptance Criteria:**
- [ ] Content automatically flows to next page when exceeding page height
- [ ] Page breaks occur at word boundaries (not mid-word)
- [ ] Images and block elements don't split across pages
- [ ] Tables split at row boundaries when possible

#### US-4.3: Smart Page Break Handling
**As a** document author
**I want to** avoid orphans and widows
**So that** my document looks professional

**Acceptance Criteria:**
- [ ] No single line of paragraph at page top (widow)
- [ ] No single line of paragraph at page bottom (orphan)
- [ ] Headings stay with at least 2 lines of following content
- [ ] Lists don't break before 2nd item

---

### Epic 5: Editing Experience

#### US-5.1: Seamless Cross-Page Editing
**As a** document author
**I want to** edit content that spans page boundaries
**So that** page breaks don't interrupt my workflow

**Acceptance Criteria:**
- [ ] Typing at page boundary doesn't cause jarring jumps
- [ ] Backspace/delete works across page boundaries
- [ ] Copy/paste works across page boundaries
- [ ] Find/replace works across entire document

#### US-5.2: Selection Across Pages
**As a** document author
**I want to** select text across multiple pages
**So that** I can copy, cut, or format large sections

**Acceptance Criteria:**
- [ ] Click-and-drag selection spans pages
- [ ] Shift+click selection spans pages
- [ ] Ctrl+A selects entire document
- [ ] Selection highlight is visible on all affected pages

#### US-5.3: Scroll Following Cursor
**As a** document author
**I want to** have the view scroll to follow my cursor
**So that** I can always see what I'm typing

**Acceptance Criteria:**
- [ ] Typing at page bottom scrolls to show cursor
- [ ] Arrow key navigation scrolls to keep cursor visible
- [ ] Page navigation scrolls smoothly (not jarring)
- [ ] Scroll position preserved on window resize

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DocumentPage.svelte                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Page 1    │  │   Page 2    │  │   Page N    │              │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │              │
│  │ │ Header  │ │  │ │ Header  │ │  │ │ Header  │ │              │
│  │ ├─────────┤ │  │ ├─────────┤ │  │ ├─────────┤ │              │
│  │ │         │ │  │ │         │ │  │ │         │ │              │
│  │ │ Content │ │  │ │ Content │ │  │ │ Content │ │              │
│  │ │ Viewport│ │  │ │ Viewport│ │  │ │ Viewport│ │              │
│  │ │         │ │  │ │         │ │  │ │         │ │              │
│  │ ├─────────┤ │  │ ├─────────┤ │  │ ├─────────┤ │              │
│  │ │ Footer  │ │  │ │ Footer  │ │  │ │ Footer  │ │              │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Single TipTap Editor Instance                │   │
│  │  (Hidden, positioned absolutely, renders all content)     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Content Height Calculator
Measures content to determine page breaks.

```typescript
// lib/editor/utils/content-height.ts
interface ContentMeasurement {
  totalHeight: number;
  pageBreakPositions: number[];  // Y positions where pages break
  linePositions: LinePosition[]; // For orphan/widow detection
}

interface LinePosition {
  top: number;
  height: number;
  nodePos: number;         // ProseMirror position
  isParagraphStart: boolean;
  isParagraphEnd: boolean;
  isHeading: boolean;
}
```

#### 2. Page Break Extension (ProseMirror)
Handles manual page breaks as document nodes.

```typescript
// lib/editor/extensions/page-break.ts
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML: () => [{ tag: 'div[data-page-break]' }],
  renderHTML: () => ['div', { 'data-page-break': 'true', class: 'page-break' }],
  addKeyboardShortcuts: () => ({
    'Mod-Enter': () => commands.insertPageBreak(),
  }),
});
```

#### 3. Page Viewport Component
Renders a clipped view into the editor content.

```typescript
// lib/components/page/PageViewport.svelte
interface Props {
  pageIndex: number;
  editorElement: HTMLElement;
  contentStartY: number;  // Where this page's content starts in editor
  contentHeight: number;  // PAGE_CONTENT_HEIGHT (828px)
}
```

#### 4. Pagination Plugin (ProseMirror)
Tracks page positions and provides decorations.

```typescript
// lib/editor/plugins/pagination.ts
interface PaginationState {
  pageCount: number;
  pageBreaks: PageBreak[];
  currentPage: number;
}

interface PageBreak {
  position: number;    // ProseMirror doc position
  yOffset: number;     // Pixel offset from doc start
  isManual: boolean;   // User-inserted vs. automatic
}
```

### Data Flow

```
┌──────────────┐     ┌────────────────┐     ┌─────────────────┐
│   Editor     │────▶│  Content       │────▶│  Pagination     │
│   Content    │     │  Measurement   │     │  State          │
└──────────────┘     └────────────────┘     └─────────────────┘
                                                     │
                                                     ▼
┌──────────────┐     ┌────────────────┐     ┌─────────────────┐
│   Page       │◀────│  Page Viewport │◀────│  Page Break     │
│   Frames     │     │  Calculation   │     │  Positions      │
└──────────────┘     └────────────────┘     └─────────────────┘
```

### State Management

```typescript
// lib/state/pagination.svelte.ts
interface PaginationState {
  pageCount: number;
  currentPage: number;
  pageBreaks: readonly PageBreakInfo[];
  scrollPosition: number;
  isCalculating: boolean;
}

interface PageBreakInfo {
  pageIndex: number;
  contentStartY: number;
  contentEndY: number;
  prosemirrorPosition: number;
  isManualBreak: boolean;
}
```

---

## TDD Test Suite

### Test File Structure

```
apps/web/src/lib/
├── editor/
│   ├── extensions/
│   │   └── __tests__/
│   │       ├── page-break.test.ts           # Manual page break extension
│   │       └── page-break-integration.test.ts
│   ├── plugins/
│   │   └── __tests__/
│   │       ├── pagination.test.ts           # Pagination plugin
│   │       └── pagination-decorations.test.ts
│   └── utils/
│       └── __tests__/
│           ├── page-metrics.test.ts         # ✅ EXISTS
│           ├── content-height.test.ts       # Content measurement
│           └── page-break-calculation.test.ts
├── components/
│   └── page/
│       └── __tests__/
│           ├── PageViewport.test.ts         # Content viewport
│           ├── PageFrame.test.ts            # Full page rendering
│           ├── PageHeader.test.ts           # Header component
│           └── PageFooter.test.ts           # Footer component
├── state/
│   └── __tests__/
│       ├── pagination.test.ts               # Pagination state
│       └── header-footer.test.ts            # Header/footer state
└── integration/
    └── __tests__/
        ├── multi-page-editing.test.ts       # Cross-page editing
        ├── page-navigation.test.ts          # Keyboard navigation
        └── scroll-tracking.test.ts          # Current page tracking
```

### Test Specifications

#### 1. Page Break Extension Tests

```typescript
// lib/editor/extensions/__tests__/page-break.test.ts

describe('PageBreak Extension', () => {
  describe('Node Definition', () => {
    it('should be a block-level atomic node', () => {
      // Test node is in block group and cannot be edited
    });

    it('should parse from HTML div[data-page-break]', () => {
      // Test HTML parsing
    });

    it('should render to HTML with data-page-break attribute', () => {
      // Test HTML serialization
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should insert page break on Ctrl+Enter', () => {
      // Test shortcut creates page break at cursor
    });

    it('should insert page break on Cmd+Enter (Mac)', () => {
      // Test Mac variant
    });
  });

  describe('Commands', () => {
    it('insertPageBreak should add page break node at selection', () => {
      // Test command inserts node
    });

    it('should not insert page break inside inline content', () => {
      // Test cannot insert mid-word
    });

    it('deletePageBreak should remove page break node', () => {
      // Test deletion
    });
  });

  describe('Selection Behavior', () => {
    it('should be selectable as a whole', () => {
      // Test node selection
    });

    it('should be deletable with backspace', () => {
      // Test backspace removes when selected
    });

    it('should be deletable with delete key', () => {
      // Test delete key removes when selected
    });
  });
});
```

#### 2. Content Height Measurement Tests

```typescript
// lib/editor/utils/__tests__/content-height.test.ts

describe('Content Height Measurement', () => {
  describe('measureContentHeight', () => {
    it('should return total height of editor content', () => {
      // Mock editor with known content height
    });

    it('should return 0 for empty editor', () => {
      // Empty editor edge case
    });

    it('should account for block element margins', () => {
      // Ensure margins are included
    });
  });

  describe('calculatePageBreakPositions', () => {
    it('should return empty array for single-page content', () => {
      // Content fits on one page
    });

    it('should return one break position for two-page content', () => {
      // Content needs exactly two pages
    });

    it('should calculate breaks at PAGE_CONTENT_HEIGHT intervals', () => {
      // Verify break positions at 828px intervals
    });

    it('should include manual page breaks in positions', () => {
      // Manual breaks override automatic
    });
  });

  describe('findLinePositions', () => {
    it('should identify paragraph start lines', () => {
      // First line of each paragraph flagged
    });

    it('should identify paragraph end lines', () => {
      // Last line of each paragraph flagged
    });

    it('should identify heading lines', () => {
      // H1, H2, H3 nodes flagged as headings
    });

    it('should calculate correct Y positions for each line', () => {
      // Verify pixel positions are accurate
    });
  });

  describe('adjustForOrphansWidows', () => {
    it('should move orphan lines to next page', () => {
      // Single line at page bottom moves
    });

    it('should pull widow lines to previous page if space', () => {
      // Single line at page top pulled back
    });

    it('should keep headings with following content', () => {
      // Heading + 2 lines stay together
    });

    it('should not adjust if it would create worse breaks', () => {
      // Edge case where adjustment makes things worse
    });
  });
});
```

#### 3. Pagination Plugin Tests

```typescript
// lib/editor/plugins/__tests__/pagination.test.ts

describe('Pagination Plugin', () => {
  describe('State Initialization', () => {
    it('should initialize with pageCount of 1', () => {
      // Initial state for new documents
    });

    it('should initialize with empty pageBreaks array', () => {
      // No breaks initially
    });
  });

  describe('State Updates', () => {
    it('should update pageCount on content change', () => {
      // Adding content increases page count
    });

    it('should recalculate pageBreaks on content change', () => {
      // Break positions update
    });

    it('should debounce rapid updates', () => {
      // Typing quickly doesn't thrash
    });
  });

  describe('Decorations', () => {
    it('should create widget decoration at each page break', () => {
      // Visual break indicators
    });

    it('should not create decoration at manual page breaks', () => {
      // Manual breaks have their own rendering
    });

    it('should update decorations when breaks change', () => {
      // Decorations stay in sync
    });
  });

  describe('Current Page Tracking', () => {
    it('should update currentPage based on cursor position', () => {
      // Cursor determines current page
    });

    it('should update currentPage based on scroll position', () => {
      // Scroll without cursor change updates
    });
  });
});
```

#### 4. PageViewport Component Tests

```typescript
// lib/components/page/__tests__/PageViewport.test.ts

describe('PageViewport Component', () => {
  describe('Rendering', () => {
    it('should render with correct dimensions', () => {
      // 624px width, 828px height content area
    });

    it('should apply CSS clip to content', () => {
      // Content outside viewport is hidden
    });

    it('should position content based on contentStartY', () => {
      // CSS transform positions content correctly
    });
  });

  describe('Content Display', () => {
    it('should show content starting at contentStartY', () => {
      // First visible content is at page start
    });

    it('should hide content after contentHeight', () => {
      // Content beyond page end is clipped
    });

    it('should handle empty page gracefully', () => {
      // Page with no content renders correctly
    });
  });

  describe('Interaction', () => {
    it('should forward click events to editor', () => {
      // Clicking in viewport focuses editor at correct position
    });

    it('should forward selection events to editor', () => {
      // Selection in viewport updates editor selection
    });
  });
});
```

#### 5. PageFrame Integration Tests

```typescript
// lib/components/page/__tests__/PageFrame.test.ts

describe('PageFrame Component', () => {
  describe('Layout', () => {
    it('should render header at 72px height', () => {
      // Header takes correct space
    });

    it('should render footer at 60px height', () => {
      // Footer takes correct space
    });

    it('should render content area between header and footer', () => {
      // Content area is 828px (1056 - 72 - 96 - 60)
    });
  });

  describe('Header/Footer Props', () => {
    it('should pass headerConfig to PageHeader', () => {
      // Config propagates correctly
    });

    it('should pass footerConfig to PageFooter', () => {
      // Config propagates correctly
    });

    it('should pass pageNumber and totalPages', () => {
      // Numbers propagate for placeholder rendering
    });
  });

  describe('Edit Mode', () => {
    it('should enable header editing when onHeaderEdit provided', () => {
      // Callback enables edit mode
    });

    it('should enable footer editing when onFooterEdit provided', () => {
      // Callback enables edit mode
    });

    it('should call onHeaderEdit when header section edited', () => {
      // Callback called with section and value
    });

    it('should call onFooterEdit when footer section edited', () => {
      // Callback called with section and value
    });
  });
});
```

#### 6. Header/Footer State Tests

```typescript
// lib/state/__tests__/header-footer.test.ts

describe('Header/Footer State', () => {
  describe('Initial State', () => {
    it('should have empty header sections', () => {
      // All header sections empty
    });

    it('should have default footer with page numbers', () => {
      // Center: "Page {pageNumber} of {totalPages}"
    });

    it('should have differentFirstPage as false', () => {
      // Default is same header/footer on all pages
    });
  });

  describe('setHeaderSection', () => {
    it('should update left section', () => {
      // Left section updates
    });

    it('should update center section', () => {
      // Center section updates
    });

    it('should update right section', () => {
      // Right section updates
    });
  });

  describe('setFooterSection', () => {
    it('should update left section', () => {
      // Left section updates
    });

    it('should update center section', () => {
      // Center section updates
    });

    it('should update right section', () => {
      // Right section updates
    });
  });

  describe('getConfigForPage', () => {
    it('should return standard config for non-first page', () => {
      // Page 2+ gets standard config
    });

    it('should return first page config when differentFirstPage is true', () => {
      // Page 1 gets different config
    });

    it('should process {pageNumber} placeholder', () => {
      // Placeholder replaced with actual number
    });

    it('should process {totalPages} placeholder', () => {
      // Placeholder replaced with actual count
    });
  });

  describe('toggleDifferentFirstPage', () => {
    it('should toggle differentFirstPage flag', () => {
      // false -> true -> false
    });
  });

  describe('reset', () => {
    it('should restore all values to defaults', () => {
      // Reset clears customizations
    });
  });
});
```

#### 7. Multi-Page Editing Integration Tests

```typescript
// lib/integration/__tests__/multi-page-editing.test.ts

describe('Multi-Page Editing Integration', () => {
  describe('Content Flow', () => {
    it('should flow content from page 1 to page 2 when exceeding height', () => {
      // Content overflows correctly
    });

    it('should reflow content when deleting from page 1', () => {
      // Content pulls back from page 2
    });

    it('should handle rapid typing across page boundary', () => {
      // No visual glitches during fast typing
    });
  });

  describe('Cursor Movement', () => {
    it('should move cursor from page 1 to page 2 with arrow down', () => {
      // Cursor crosses page boundary
    });

    it('should move cursor from page 2 to page 1 with arrow up', () => {
      // Cursor crosses back
    });

    it('should scroll viewport to follow cursor', () => {
      // View scrolls to keep cursor visible
    });
  });

  describe('Selection', () => {
    it('should allow selection spanning multiple pages', () => {
      // Selection crosses page boundaries
    });

    it('should highlight selection on all affected pages', () => {
      // Visual feedback on each page
    });

    it('should copy multi-page selection correctly', () => {
      // Clipboard contains full content
    });

    it('should cut multi-page selection and reflow', () => {
      // Content reflows after cut
    });
  });

  describe('Undo/Redo', () => {
    it('should undo changes spanning multiple pages', () => {
      // Undo works correctly
    });

    it('should redo changes spanning multiple pages', () => {
      // Redo works correctly
    });

    it('should preserve page count after undo/redo cycle', () => {
      // Page count consistent
    });
  });

  describe('Manual Page Breaks', () => {
    it('should insert manual break and create new page', () => {
      // Break increases page count
    });

    it('should delete manual break and merge pages', () => {
      // Content reflows together
    });

    it('should preserve manual breaks across undo/redo', () => {
      // Breaks survive history operations
    });
  });
});
```

#### 8. Page Navigation Tests

```typescript
// lib/integration/__tests__/page-navigation.test.ts

describe('Page Navigation', () => {
  describe('Keyboard Shortcuts', () => {
    it('should scroll to next page on PageDown', () => {
      // Page Down moves one page
    });

    it('should scroll to previous page on PageUp', () => {
      // Page Up moves one page
    });

    it('should scroll to first page on Ctrl+Home', () => {
      // Jump to start
    });

    it('should scroll to last page on Ctrl+End', () => {
      // Jump to end
    });

    it('should not navigate when focus is in input field', () => {
      // Shortcuts disabled in inputs
    });
  });

  describe('Go To Page Dialog', () => {
    it('should open on Ctrl+G', () => {
      // Dialog opens
    });

    it('should navigate to valid page number', () => {
      // Entering "5" goes to page 5
    });

    it('should show error for invalid page number', () => {
      // Page 100 in 10-page doc shows error
    });

    it('should close on Escape', () => {
      // Dialog dismisses
    });
  });

  describe('Page Indicator', () => {
    it('should show current page and total', () => {
      // "Page 3 of 10"
    });

    it('should update on scroll', () => {
      // Changes as user scrolls
    });

    it('should open go-to-page on click', () => {
      // Click opens dialog
    });
  });

  describe('Scroll Tracking', () => {
    it('should determine current page from viewport center', () => {
      // Center of viewport determines page
    });

    it('should update smoothly during scroll', () => {
      // No jittering
    });

    it('should snap to page on scroll end (optional)', () => {
      // Gentle snap to nearest page
    });
  });
});
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Tests First)

**Duration**: Foundation for all subsequent work

**Tasks**:
1. Create test files for all new modules (as specified in TDD section)
2. Implement `content-height.ts` utilities
3. Implement `page-break.ts` TipTap extension
4. Implement `pagination.ts` ProseMirror plugin

**Files to Create**:
- `lib/editor/utils/content-height.ts`
- `lib/editor/utils/__tests__/content-height.test.ts`
- `lib/editor/extensions/page-break.ts`
- `lib/editor/extensions/__tests__/page-break.test.ts`
- `lib/editor/plugins/pagination.ts`
- `lib/editor/plugins/__tests__/pagination.test.ts`

**Success Criteria**:
- [ ] All unit tests pass
- [ ] Content height accurately measured
- [ ] Page breaks calculated correctly
- [ ] Manual page breaks insert/delete properly

---

### Phase 2: Visual Page Rendering

**Duration**: Depends on Phase 1 completion

**Tasks**:
1. Create `PageViewport.svelte` component
2. Integrate `PageFrame` into `DocumentPage.svelte`
3. Implement CSS clipping for content
4. Wire up pagination state to UI

**Files to Modify**:
- `lib/components/DocumentPage.svelte`
- `lib/components/page/PageFrame.svelte`

**Files to Create**:
- `lib/components/page/PageViewport.svelte`
- `lib/components/page/__tests__/PageViewport.test.ts`
- `lib/state/pagination.svelte.ts`
- `lib/state/__tests__/pagination.test.ts`

**Success Criteria**:
- [ ] Document renders as discrete page frames
- [ ] Content clips at page boundaries
- [ ] Page count updates in real-time
- [ ] Single editor instance works across all pages

---

### Phase 3: Headers and Footers

**Duration**: Depends on Phase 2 completion

**Tasks**:
1. Wire `PageHeader` and `PageFooter` to state
2. Implement double-click edit mode
3. Create header/footer edit UI
4. Implement placeholder processing
5. Add "different first page" toggle

**Files to Modify**:
- `lib/components/page/PageHeader.svelte`
- `lib/components/page/PageFooter.svelte`
- `lib/state/header-footer.svelte.ts`

**Files to Create**:
- `lib/components/HeaderFooterEditor.svelte`
- `lib/state/__tests__/header-footer.test.ts`

**Success Criteria**:
- [ ] Headers/footers display on each page
- [ ] Double-click enters edit mode
- [ ] Placeholders render correctly
- [ ] Different first page option works

---

### Phase 4: Page Navigation

**Duration**: Depends on Phase 2 completion (can parallel Phase 3)

**Tasks**:
1. Implement keyboard shortcuts
2. Create go-to-page dialog
3. Implement current page tracking
4. Update page indicator UI

**Files to Create**:
- `lib/components/GoToPageDialog.svelte`
- `lib/editor/plugins/navigation.ts`
- `lib/integration/__tests__/page-navigation.test.ts`

**Files to Modify**:
- `lib/components/DocumentPage.svelte`

**Success Criteria**:
- [ ] All keyboard shortcuts functional
- [ ] Go-to-page dialog works
- [ ] Page indicator updates on scroll
- [ ] Navigation smooth and responsive

---

### Phase 5: Smart Page Breaks

**Duration**: Depends on Phase 2 completion

**Tasks**:
1. Implement orphan/widow detection
2. Implement keep-with-next for headings
3. Implement line-level break adjustment
4. Add page break CSS styling

**Files to Modify**:
- `lib/editor/utils/content-height.ts`
- `lib/editor/plugins/pagination.ts`

**Files to Create**:
- `lib/editor/utils/__tests__/page-break-calculation.test.ts`

**Success Criteria**:
- [ ] No orphan lines at page top
- [ ] No widow lines at page bottom
- [ ] Headings stay with content
- [ ] Break adjustments minimal and correct

---

### Phase 6: Polish and Performance

**Duration**: Final phase

**Tasks**:
1. Performance optimization (lazy measurement, caching)
2. Virtual rendering for 100+ page documents
3. Print preview mode
4. Edge case handling and bug fixes

**Files to Modify**:
- All component and utility files

**Files to Create**:
- `lib/editor/utils/measurement-cache.ts`
- `lib/components/PrintPreview.svelte`

**Success Criteria**:
- [ ] 100+ page document performs smoothly
- [ ] Print preview matches screen
- [ ] No visual glitches during editing
- [ ] All tests pass

---

## API Reference

### Page Metrics Constants

```typescript
// lib/editor/utils/page-metrics.ts

export const PAGE_WIDTH = 816;           // 8.5" at 96 DPI
export const PAGE_HEIGHT = 1056;         // 11" at 96 DPI
export const PAGE_MARGIN_TOP = 96;       // 1"
export const PAGE_MARGIN_BOTTOM = 72;    // 0.75"
export const PAGE_MARGIN_HORIZONTAL = 96;// 1" each side
export const PAGE_GAP = 32;              // Gap between pages
export const HEADER_HEIGHT = 72;         // Header area
export const FOOTER_HEIGHT = 60;         // Footer area
export const PAGE_CONTENT_HEIGHT = 828;  // Usable content height
```

### Pagination State

```typescript
// lib/state/pagination.svelte.ts

interface PaginationStateAPI {
  // Read-only properties
  readonly pageCount: number;
  readonly currentPage: number;
  readonly pageBreaks: readonly PageBreakInfo[];
  readonly isCalculating: boolean;

  // Methods
  recalculate(): void;
  setCurrentPage(page: number): void;
  goToPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
}
```

### Page Break Extension Commands

```typescript
// Editor commands added by page-break extension
editor.commands.insertPageBreak();  // Insert at cursor
editor.commands.deletePageBreak();  // Remove selected break
editor.can().insertPageBreak();     // Check if can insert
```

### Header/Footer State

```typescript
// lib/state/header-footer.svelte.ts (existing)

interface HeaderFooterStateAPI {
  readonly header: HeaderFooterSection;
  readonly footer: HeaderFooterSection;
  readonly differentFirstPage: boolean;

  setHeaderSection(section: 'left' | 'center' | 'right', value: string): void;
  setFooterSection(section: 'left' | 'center' | 'right', value: string): void;
  toggleDifferentFirstPage(): void;
  getConfigForPage(pageNumber: number, totalPages: number): HeaderFooterConfig;
  reset(): void;
}
```

---

## Success Criteria

### Functional Requirements

| Requirement | Metric | Target |
|-------------|--------|--------|
| Page rendering | Pages display correctly | 100% visual fidelity |
| Content clipping | Content respects boundaries | No overflow visible |
| Header/footer | All pages show headers/footers | 100% coverage |
| Page navigation | Keyboard shortcuts work | All 4 shortcuts |
| Manual page breaks | Insert/delete works | Full functionality |
| Cross-page editing | No cursor/selection issues | Zero blocking bugs |

### Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page calculation time | < 16ms | Chrome DevTools |
| Scroll frame rate | 60 FPS | Chrome DevTools |
| Memory usage (100 pages) | < 100MB | Chrome DevTools |
| Initial render | < 500ms | Lighthouse |

### Test Coverage Requirements

| Category | Target Coverage |
|----------|-----------------|
| Unit tests | > 90% |
| Integration tests | > 80% |
| Edge cases | Documented and tested |

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 100+ |
| Firefox | 100+ |
| Safari | 15+ |
| Edge | 100+ |

---

## Appendix: Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with many pages | Medium | High | Virtual rendering, lazy measurement |
| Undo/redo complexity | Low | High | Keep pages as visual layer only |
| Cross-page selection bugs | Medium | Medium | Extensive integration testing |
| Content at page boundaries | High | Medium | Smart break-point detection |
| Print fidelity issues | Medium | Medium | Dedicated print stylesheet |

---

*End of Specification*
