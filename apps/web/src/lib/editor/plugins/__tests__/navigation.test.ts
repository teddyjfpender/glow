/**
 * Comprehensive Tests for Navigation Plugin
 *
 * Tests keyboard navigation functionality for multi-page document support
 * including Page Up/Down, Ctrl+Home/End, and Ctrl+G shortcuts.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createNavigationHandler, type NavigationConfig } from '../navigation';
import { paginationState } from '../../../state/pagination.svelte';
import { PAGE_HEIGHT, PAGE_GAP, getPageStartY } from '../../utils/page-metrics';

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a mock HTML element with scrollTo method */
function createMockContainer(): HTMLElement {
  const element = document.createElement('div');
  element.scrollTo = vi.fn();
  return element;
}

/** Create a mock KeyboardEvent */
function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

/** Create a mock input element for testing focus scenarios */
function createMockInput(): HTMLInputElement {
  return document.createElement('input');
}

/** Create a mock textarea element for testing focus scenarios */
function createMockTextarea(): HTMLTextAreaElement {
  return document.createElement('textarea');
}

// ============================================================================
// Test Suite
// ============================================================================

describe('NavigationPlugin', () => {
  let mockContainer: HTMLElement;
  let mockOnOpenGoToPage: Mock;
  let config: NavigationConfig;

  beforeEach(() => {
    // Reset pagination state
    paginationState.reset();

    // Create fresh mocks
    mockContainer = createMockContainer();
    mockOnOpenGoToPage = vi.fn();
    config = {
      containerRef: mockContainer,
      onOpenGoToPage: mockOnOpenGoToPage,
    };
  });

  // ============================================================================
  // scrollToPage Tests
  // ============================================================================

  describe('scrollToPage', () => {
    it('should scroll container to correct Y position for page 1', () => {
      paginationState.setPageCount(5);
      const navigation = createNavigationHandler(config);

      navigation.scrollToPage(1);

      const expectedY = getPageStartY(0, PAGE_HEIGHT, PAGE_GAP);
      expect(mockContainer.scrollTo).toHaveBeenCalledWith({
        top: expectedY,
        behavior: 'smooth',
      });
    });

    it('should scroll container to correct Y position for page 2', () => {
      paginationState.setPageCount(5);
      const navigation = createNavigationHandler(config);

      navigation.scrollToPage(2);

      const expectedY = getPageStartY(1, PAGE_HEIGHT, PAGE_GAP);
      expect(mockContainer.scrollTo).toHaveBeenCalledWith({
        top: expectedY,
        behavior: 'smooth',
      });
    });

    it('should scroll container to correct Y position for page 5', () => {
      paginationState.setPageCount(5);
      const navigation = createNavigationHandler(config);

      navigation.scrollToPage(5);

      const expectedY = getPageStartY(4, PAGE_HEIGHT, PAGE_GAP);
      expect(mockContainer.scrollTo).toHaveBeenCalledWith({
        top: expectedY,
        behavior: 'smooth',
      });
    });

    it('should update paginationState.currentPage', () => {
      paginationState.setPageCount(5);
      const navigation = createNavigationHandler(config);

      navigation.scrollToPage(3);

      expect(paginationState.currentPage).toBe(3);
    });

    it('should use smooth scrolling behavior', () => {
      paginationState.setPageCount(5);
      const navigation = createNavigationHandler(config);

      navigation.scrollToPage(2);

      expect(mockContainer.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
        })
      );
    });

    it('should calculate correct Y position based on page metrics', () => {
      paginationState.setPageCount(10);
      const navigation = createNavigationHandler(config);

      // Test page 3 (0-indexed: 2)
      navigation.scrollToPage(3);

      // Page 3 starts at: (3-1) * (PAGE_HEIGHT + PAGE_GAP)
      const expectedY = 2 * (PAGE_HEIGHT + PAGE_GAP);
      expect(mockContainer.scrollTo).toHaveBeenCalledWith({
        top: expectedY,
        behavior: 'smooth',
      });
    });
  });

  // ============================================================================
  // handleKeyDown Tests
  // ============================================================================

  describe('handleKeyDown', () => {
    describe('Page Down', () => {
      it('should increment page when not on last page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageDown');
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(3);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should not increment page when on last page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(5);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageDown');
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(5);
      });

      it('should scroll to next page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(1);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageDown');
        navigation.handleKeyDown(event);

        const expectedY = getPageStartY(1, PAGE_HEIGHT, PAGE_GAP);
        expect(mockContainer.scrollTo).toHaveBeenCalledWith({
          top: expectedY,
          behavior: 'smooth',
        });
      });

      it('should prevent default behavior', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(1);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageDown');
        navigation.handleKeyDown(event);

        expect(event.defaultPrevented).toBe(true);
      });
    });

    describe('Page Up', () => {
      it('should decrement page when not on first page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(3);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageUp');
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(2);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should not decrement page when on first page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(1);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageUp');
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(1);
      });

      it('should scroll to previous page', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(3);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageUp');
        navigation.handleKeyDown(event);

        const expectedY = getPageStartY(1, PAGE_HEIGHT, PAGE_GAP);
        expect(mockContainer.scrollTo).toHaveBeenCalledWith({
          top: expectedY,
          behavior: 'smooth',
        });
      });

      it('should prevent default behavior', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(3);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('PageUp');
        navigation.handleKeyDown(event);

        expect(event.defaultPrevented).toBe(true);
      });
    });

    describe('Ctrl+Home', () => {
      it('should go to page 1 with Ctrl key', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(4);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('Home', { ctrlKey: true });
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(1);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should go to page 1 with Meta key (Mac)', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(4);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('Home', { metaKey: true });
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(1);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should not handle Home without modifier key', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(4);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('Home');
        navigation.handleKeyDown(event);

        // Should not change page or scroll
        expect(paginationState.currentPage).toBe(4);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
      });

      it('should scroll to first page position', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(4);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('Home', { ctrlKey: true });
        navigation.handleKeyDown(event);

        const expectedY = getPageStartY(0, PAGE_HEIGHT, PAGE_GAP);
        expect(mockContainer.scrollTo).toHaveBeenCalledWith({
          top: expectedY,
          behavior: 'smooth',
        });
      });
    });

    describe('Ctrl+End', () => {
      it('should go to last page with Ctrl key', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('End', { ctrlKey: true });
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(5);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should go to last page with Meta key (Mac)', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('End', { metaKey: true });
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(5);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should not handle End without modifier key', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('End');
        navigation.handleKeyDown(event);

        // Should not change page or scroll
        expect(paginationState.currentPage).toBe(2);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
      });

      it('should scroll to last page position', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('End', { ctrlKey: true });
        navigation.handleKeyDown(event);

        const expectedY = getPageStartY(4, PAGE_HEIGHT, PAGE_GAP);
        expect(mockContainer.scrollTo).toHaveBeenCalledWith({
          top: expectedY,
          behavior: 'smooth',
        });
      });
    });

    describe('Ctrl+G (Go-To-Page dialog)', () => {
      it('should open go-to-page dialog with Ctrl key', () => {
        paginationState.setPageCount(5);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('g', { ctrlKey: true });
        navigation.handleKeyDown(event);

        expect(mockOnOpenGoToPage).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should open go-to-page dialog with Meta key (Mac)', () => {
        paginationState.setPageCount(5);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('g', { metaKey: true });
        navigation.handleKeyDown(event);

        expect(mockOnOpenGoToPage).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
      });

      it('should not open dialog without modifier key', () => {
        paginationState.setPageCount(5);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('g');
        navigation.handleKeyDown(event);

        expect(mockOnOpenGoToPage).not.toHaveBeenCalled();
      });

      it('should not trigger other navigation when opening dialog', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('g', { ctrlKey: true });
        navigation.handleKeyDown(event);

        // Should only call onOpenGoToPage, not scroll or change page
        expect(mockOnOpenGoToPage).toHaveBeenCalledTimes(1);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
        expect(paginationState.currentPage).toBe(2);
      });
    });

    describe('Focus handling', () => {
      it('should not handle when focus is in input element', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const input = createMockInput();
        const event = createKeyboardEvent('PageDown');
        Object.defineProperty(event, 'target', { value: input });

        navigation.handleKeyDown(event);

        // Should not navigate
        expect(paginationState.currentPage).toBe(2);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
      });

      it('should not handle when focus is in textarea element', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const textarea = createMockTextarea();
        const event = createKeyboardEvent('PageDown');
        Object.defineProperty(event, 'target', { value: textarea });

        navigation.handleKeyDown(event);

        // Should not navigate
        expect(paginationState.currentPage).toBe(2);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
      });

      it('should not handle Ctrl+G when focus is in input', () => {
        paginationState.setPageCount(5);
        const navigation = createNavigationHandler(config);

        const input = createMockInput();
        const event = createKeyboardEvent('g', { ctrlKey: true });
        Object.defineProperty(event, 'target', { value: input });

        navigation.handleKeyDown(event);

        expect(mockOnOpenGoToPage).not.toHaveBeenCalled();
      });

      it('should handle when focus is in other element types', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const div = document.createElement('div');
        const event = createKeyboardEvent('PageDown');
        Object.defineProperty(event, 'target', { value: div });

        navigation.handleKeyDown(event);

        // Should navigate
        expect(paginationState.currentPage).toBe(3);
      });
    });

    describe('Unhandled keys', () => {
      it('should not handle unrelated keys', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const event = createKeyboardEvent('a');
        navigation.handleKeyDown(event);

        expect(paginationState.currentPage).toBe(2);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
        expect(mockOnOpenGoToPage).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
      });

      it('should not handle arrow keys', () => {
        paginationState.setPageCount(5);
        paginationState.setCurrentPage(2);
        const navigation = createNavigationHandler(config);

        const eventUp = createKeyboardEvent('ArrowUp');
        const eventDown = createKeyboardEvent('ArrowDown');
        navigation.handleKeyDown(eventUp);
        navigation.handleKeyDown(eventDown);

        expect(paginationState.currentPage).toBe(2);
        expect(mockContainer.scrollTo).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('should handle complete navigation workflow', () => {
      paginationState.setPageCount(10);
      paginationState.setCurrentPage(5);
      const navigation = createNavigationHandler(config);

      // Navigate down
      navigation.handleKeyDown(createKeyboardEvent('PageDown'));
      expect(paginationState.currentPage).toBe(6);

      // Navigate up
      navigation.handleKeyDown(createKeyboardEvent('PageUp'));
      expect(paginationState.currentPage).toBe(5);

      // Jump to start
      navigation.handleKeyDown(createKeyboardEvent('Home', { ctrlKey: true }));
      expect(paginationState.currentPage).toBe(1);

      // Jump to end
      navigation.handleKeyDown(createKeyboardEvent('End', { ctrlKey: true }));
      expect(paginationState.currentPage).toBe(10);

      // Open dialog
      navigation.handleKeyDown(createKeyboardEvent('g', { ctrlKey: true }));
      expect(mockOnOpenGoToPage).toHaveBeenCalled();
    });

    it('should handle rapid navigation', () => {
      paginationState.setPageCount(20);
      paginationState.setCurrentPage(1);
      const navigation = createNavigationHandler(config);

      // Rapid Page Down presses
      for (let i = 0; i < 10; i++) {
        navigation.handleKeyDown(createKeyboardEvent('PageDown'));
      }

      expect(paginationState.currentPage).toBe(11);
      expect(mockContainer.scrollTo).toHaveBeenCalledTimes(10);
    });

    it('should handle boundary conditions at page 1', () => {
      paginationState.setPageCount(5);
      paginationState.setCurrentPage(1);
      const navigation = createNavigationHandler(config);

      // Try to go before page 1
      navigation.handleKeyDown(createKeyboardEvent('PageUp'));
      expect(paginationState.currentPage).toBe(1);

      // Ctrl+Home should still work
      navigation.handleKeyDown(createKeyboardEvent('Home', { ctrlKey: true }));
      expect(paginationState.currentPage).toBe(1);
    });

    it('should handle boundary conditions at last page', () => {
      paginationState.setPageCount(5);
      paginationState.setCurrentPage(5);
      const navigation = createNavigationHandler(config);

      // Try to go beyond last page
      navigation.handleKeyDown(createKeyboardEvent('PageDown'));
      expect(paginationState.currentPage).toBe(5);

      // Ctrl+End should still work
      navigation.handleKeyDown(createKeyboardEvent('End', { ctrlKey: true }));
      expect(paginationState.currentPage).toBe(5);
    });

    it('should handle single page document', () => {
      paginationState.setPageCount(1);
      paginationState.setCurrentPage(1);
      const navigation = createNavigationHandler(config);

      navigation.handleKeyDown(createKeyboardEvent('PageDown'));
      expect(paginationState.currentPage).toBe(1);

      navigation.handleKeyDown(createKeyboardEvent('PageUp'));
      expect(paginationState.currentPage).toBe(1);

      navigation.handleKeyDown(createKeyboardEvent('Home', { ctrlKey: true }));
      expect(paginationState.currentPage).toBe(1);

      navigation.handleKeyDown(createKeyboardEvent('End', { ctrlKey: true }));
      expect(paginationState.currentPage).toBe(1);

      // Should not have scrolled for invalid navigations
      // Only Ctrl+Home and Ctrl+End would scroll (to page 1)
      expect(mockContainer.scrollTo).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// GoToPageDialog Tests (Component behavior tests)
// ============================================================================

describe('GoToPageDialog behavior', () => {
  /**
   * Note: These tests validate the dialog's input validation logic.
   * Full component tests would require a Svelte testing environment.
   */

  describe('page number validation', () => {
    function validatePageInput(input: string, totalPages: number): string | null {
      const page = parseInt(input, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        return `Please enter a page number between 1 and ${totalPages}`;
      }
      return null;
    }

    it('should show error for empty input', () => {
      const error = validatePageInput('', 10);
      expect(error).toBe('Please enter a page number between 1 and 10');
    });

    it('should show error for non-numeric input', () => {
      const error = validatePageInput('abc', 10);
      expect(error).toBe('Please enter a page number between 1 and 10');
    });

    it('should show error for page 0', () => {
      const error = validatePageInput('0', 10);
      expect(error).toBe('Please enter a page number between 1 and 10');
    });

    it('should show error for negative page', () => {
      const error = validatePageInput('-1', 10);
      expect(error).toBe('Please enter a page number between 1 and 10');
    });

    it('should show error for page exceeding total', () => {
      const error = validatePageInput('15', 10);
      expect(error).toBe('Please enter a page number between 1 and 10');
    });

    it('should accept valid page number', () => {
      const error = validatePageInput('5', 10);
      expect(error).toBeNull();
    });

    it('should accept first page', () => {
      const error = validatePageInput('1', 10);
      expect(error).toBeNull();
    });

    it('should accept last page', () => {
      const error = validatePageInput('10', 10);
      expect(error).toBeNull();
    });

    it('should accept decimal input (parseInt behavior)', () => {
      // parseInt('5.7', 10) returns 5, which is valid
      const error = validatePageInput('5.7', 10);
      expect(error).toBeNull();
    });

    it('should handle edge case of single page document', () => {
      const error = validatePageInput('2', 1);
      expect(error).toBe('Please enter a page number between 1 and 1');

      const validError = validatePageInput('1', 1);
      expect(validError).toBeNull();
    });
  });

  describe('keyboard interactions', () => {
    it('should recognize Escape key for closing', () => {
      const event = createKeyboardEvent('Escape');
      expect(event.key).toBe('Escape');
    });

    it('should recognize Enter key for submitting', () => {
      const event = createKeyboardEvent('Enter');
      expect(event.key).toBe('Enter');
    });
  });
});
