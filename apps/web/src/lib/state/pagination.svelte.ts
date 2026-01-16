/**
 * Pagination state management for multi-page documents using Svelte 5 runes.
 * Tracks page breaks, current page, and navigation state.
 */

export interface PageBreakInfo {
  pageIndex: number;
  contentStartY: number;    // Y position where this page's content starts
  contentEndY: number;      // Y position where this page's content ends
  prosemirrorPos: number;   // ProseMirror document position
  isManualBreak: boolean;   // User-inserted vs automatic
}

interface PaginationState {
  pageCount: number;
  currentPage: number;
  pageBreaks: PageBreakInfo[];
  scrollPosition: number;
  isCalculating: boolean;
}

interface PaginationStateAPI {
  // Read-only
  readonly pageCount: number;
  readonly currentPage: number;
  readonly pageBreaks: readonly PageBreakInfo[];
  readonly isCalculating: boolean;
  readonly scrollPosition: number;

  // Methods
  setPageCount(count: number): void;
  setCurrentPage(page: number): void;
  setPageBreaks(breaks: PageBreakInfo[]): void;
  setScrollPosition(position: number): void;
  setCalculating(isCalculating: boolean): void;

  goToPage(page: number): void;
  nextPage(): void;
  prevPage(): void;

  getPageAtY(yPosition: number): number;
  getPageBreakInfo(pageIndex: number): PageBreakInfo | undefined;

  reset(): void;
}

function createPaginationState(): PaginationStateAPI {
  let state = $state<PaginationState>({
    pageCount: 1,
    currentPage: 1,
    pageBreaks: [],
    scrollPosition: 0,
    isCalculating: false,
  });

  function setPageCount(count: number): void {
    state.pageCount = Math.max(1, count);
    // Clamp currentPage if it exceeds new pageCount
    if (state.currentPage > state.pageCount) {
      state.currentPage = state.pageCount;
    }
  }

  function setCurrentPage(page: number): void {
    // Ignore NaN values
    if (Number.isNaN(page)) {
      return;
    }
    // Clamp to valid range (1 to pageCount)
    state.currentPage = Math.max(1, Math.min(page, state.pageCount));
  }

  function setPageBreaks(breaks: PageBreakInfo[]): void {
    // Sort by pageIndex
    const sortedBreaks = [...breaks].sort((a, b) => a.pageIndex - b.pageIndex);
    state.pageBreaks = sortedBreaks;
  }

  function setScrollPosition(position: number): void {
    state.scrollPosition = position;
  }

  function setCalculating(isCalculating: boolean): void {
    state.isCalculating = isCalculating;
  }

  function goToPage(page: number): void {
    setCurrentPage(page);
  }

  function nextPage(): void {
    if (state.currentPage < state.pageCount) {
      state.currentPage = state.currentPage + 1;
    }
  }

  function prevPage(): void {
    if (state.currentPage > 1) {
      state.currentPage = state.currentPage - 1;
    }
  }

  function getPageAtY(yPosition: number): number {
    // If no page breaks, return 1
    if (state.pageBreaks.length === 0) {
      return 1;
    }

    // Handle negative Y positions
    if (yPosition < 0) {
      return 1;
    }

    // Find the page that contains this Y position
    for (const pageBreak of state.pageBreaks) {
      if (yPosition >= pageBreak.contentStartY && yPosition < pageBreak.contentEndY) {
        return pageBreak.pageIndex;
      }
    }

    // If position is beyond all content, return last page
    const lastBreak = state.pageBreaks[state.pageBreaks.length - 1];
    if (yPosition >= lastBreak.contentEndY) {
      return lastBreak.pageIndex;
    }

    // Default to first page
    return 1;
  }

  function getPageBreakInfo(pageIndex: number): PageBreakInfo | undefined {
    return state.pageBreaks.find((b) => b.pageIndex === pageIndex);
  }

  function reset(): void {
    state.pageCount = 1;
    state.currentPage = 1;
    state.pageBreaks = [];
    state.scrollPosition = 0;
    state.isCalculating = false;
  }

  return {
    get pageCount(): number {
      return state.pageCount;
    },
    get currentPage(): number {
      return state.currentPage;
    },
    get pageBreaks(): readonly PageBreakInfo[] {
      return state.pageBreaks;
    },
    get isCalculating(): boolean {
      return state.isCalculating;
    },
    get scrollPosition(): number {
      return state.scrollPosition;
    },
    setPageCount,
    setCurrentPage,
    setPageBreaks,
    setScrollPosition,
    setCalculating,
    goToPage,
    nextPage,
    prevPage,
    getPageAtY,
    getPageBreakInfo,
    reset,
  };
}

export const paginationState = createPaginationState();
