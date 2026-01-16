/**
 * Navigation Plugin for Multi-Page Document Support
 *
 * Provides keyboard navigation handlers for scrolling between pages
 * in a multi-page document editor.
 *
 * Supported keyboard shortcuts:
 * - Page Down: Scroll to next page
 * - Page Up: Scroll to previous page
 * - Ctrl+End / Cmd+End: Jump to last page
 * - Ctrl+Home / Cmd+Home: Jump to first page
 * - Ctrl+G / Cmd+G: Open Go-To-Page dialog
 */

import { PAGE_HEIGHT, PAGE_GAP, getPageStartY } from '$lib/editor/utils/page-metrics';
import { paginationState } from '$lib/state/pagination.svelte';

/**
 * Configuration for the navigation handler
 */
export interface NavigationConfig {
  /** The scrollable container element */
  containerRef: HTMLElement;
  /** Callback to open the Go-To-Page dialog */
  onOpenGoToPage: () => void;
}

/**
 * Return type for the navigation handler factory
 */
export interface NavigationHandler {
  /** Handle keydown events for page navigation */
  handleKeyDown: (event: KeyboardEvent) => void;
  /** Programmatically scroll to a specific page */
  scrollToPage: (page: number) => void;
}

/**
 * Creates a navigation handler for keyboard-based page navigation.
 *
 * @param config - Configuration object with container reference and callbacks
 * @returns An object with handleKeyDown and scrollToPage methods
 *
 * @example
 * ```ts
 * const navigation = createNavigationHandler({
 *   containerRef: documentAreaRef,
 *   onOpenGoToPage: () => { isGoToPageOpen = true; },
 * });
 *
 * window.addEventListener('keydown', navigation.handleKeyDown);
 * ```
 */
export function createNavigationHandler(config: NavigationConfig): NavigationHandler {
  const { containerRef, onOpenGoToPage } = config;

  /**
   * Scroll to a specific page number with smooth animation.
   *
   * @param page - The 1-based page number to scroll to
   */
  function scrollToPage(page: number): void {
    // Convert to 0-based index for getPageStartY
    const pageY = getPageStartY(page - 1, PAGE_HEIGHT, PAGE_GAP);
    containerRef.scrollTo({
      top: pageY,
      behavior: 'smooth',
    });
    paginationState.setCurrentPage(page);
  }

  /**
   * Handle keyboard events for page navigation.
   *
   * Ignores events when focus is in an input or textarea element
   * to avoid interfering with text input.
   *
   * @param event - The keyboard event to handle
   */
  function handleKeyDown(event: KeyboardEvent): void {
    // Don't handle if focus is in an input/textarea
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const { currentPage, pageCount } = paginationState;

    switch (event.key) {
      case 'PageDown':
        event.preventDefault();
        if (currentPage < pageCount) {
          scrollToPage(currentPage + 1);
        }
        break;

      case 'PageUp':
        event.preventDefault();
        if (currentPage > 1) {
          scrollToPage(currentPage - 1);
        }
        break;

      case 'Home':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          scrollToPage(1);
        }
        break;

      case 'End':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          scrollToPage(pageCount);
        }
        break;

      case 'g':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onOpenGoToPage();
        }
        break;
    }
  }

  return {
    handleKeyDown,
    scrollToPage,
  };
}
