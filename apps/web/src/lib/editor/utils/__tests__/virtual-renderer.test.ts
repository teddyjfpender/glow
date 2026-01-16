// @vitest-environment jsdom
/**
 * Tests for Virtual Renderer Utility Module
 *
 * Comprehensive tests for the virtual rendering system that enables
 * efficient rendering of large multi-page documents.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createVirtualRenderer,
  createScrollHandler,
  createFastScrollDetector,
  calculatePageTransitions,
  isPageFullyVisible,
  getPageVisibilityPercentage,
  getMostVisiblePage,
  DEFAULT_BUFFER_SIZE,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_VELOCITY_THRESHOLD,
  DEFAULT_TIME_WINDOW_MS,
  type VirtualRendererConfig,
  type VirtualRenderState,
  type PageRange,
  type VirtualRendererAPI,
} from '../virtual-renderer';
import { PAGE_HEIGHT, PAGE_GAP } from '../page-metrics';

describe('Virtual Renderer', () => {
  describe('createVirtualRenderer', () => {
    describe('Configuration', () => {
      it('should create renderer with default configuration', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });

        expect(renderer).toBeDefined();
        expect(renderer.getVisibleRange).toBeDefined();
        expect(renderer.shouldRenderPage).toBeDefined();
        expect(renderer.getPageTop).toBeDefined();
        expect(renderer.getScrollTopForPage).toBeDefined();
        expect(renderer.getState).toBeDefined();
      });

      it('should use default buffer size of 2', () => {
        expect(DEFAULT_BUFFER_SIZE).toBe(2);
      });

      it('should accept custom buffer size', () => {
        const renderer = createVirtualRenderer({
          totalPages: 20,
          bufferSize: 3,
        });

        // With viewport showing page 5, buffer of 3 should include pages 2-8
        const scrollTop = 5 * (PAGE_HEIGHT + PAGE_GAP);
        const viewportHeight = PAGE_HEIGHT;
        const range = renderer.getVisibleRange(scrollTop, viewportHeight);

        // Page 5 visible, buffer 3 = pages 2-8
        expect(range.start).toBe(2);
        expect(range.end).toBe(8);
      });

      it('should use default page dimensions from page-metrics', () => {
        const renderer = createVirtualRenderer({ totalPages: 5 });
        const pageTop = renderer.getPageTop(1);
        expect(pageTop).toBe(PAGE_HEIGHT + PAGE_GAP);
      });

      it('should accept custom page height and gap', () => {
        const customPageHeight = 500;
        const customPageGap = 20;
        const renderer = createVirtualRenderer({
          totalPages: 5,
          pageHeight: customPageHeight,
          pageGap: customPageGap,
        });

        const pageTop = renderer.getPageTop(1);
        expect(pageTop).toBe(customPageHeight + customPageGap);
      });

      it('should enforce minimum of 1 total page', () => {
        const renderer = createVirtualRenderer({ totalPages: 0 });
        const state = renderer.getState(0, 500);
        expect(state.totalPages).toBe(1);
      });

      it('should enforce minimum of 1 for negative total pages', () => {
        const renderer = createVirtualRenderer({ totalPages: -5 });
        const state = renderer.getState(0, 500);
        expect(state.totalPages).toBe(1);
      });
    });

    describe('getVisibleRange', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 20 });
      });

      it('should return range starting at 0 for scrollTop 0', () => {
        const range = renderer.getVisibleRange(0, PAGE_HEIGHT);
        expect(range.start).toBe(0);
      });

      it('should include buffer pages above and below visible pages', () => {
        // Scroll to show page 5 (index 5)
        const scrollTop = 5 * (PAGE_HEIGHT + PAGE_GAP);
        const viewportHeight = PAGE_HEIGHT;

        const range = renderer.getVisibleRange(scrollTop, viewportHeight);

        // Page 5 visible, buffer 2 = pages 3-7
        expect(range.start).toBe(3);
        expect(range.end).toBe(7);
      });

      it('should not go below 0 for start', () => {
        const range = renderer.getVisibleRange(0, PAGE_HEIGHT);
        expect(range.start).toBe(0);
      });

      it('should not exceed totalPages - 1 for end', () => {
        // Scroll to last page
        const scrollTop = 19 * (PAGE_HEIGHT + PAGE_GAP);
        const viewportHeight = PAGE_HEIGHT;

        const range = renderer.getVisibleRange(scrollTop, viewportHeight);

        expect(range.end).toBe(19);
      });

      it('should handle viewport showing multiple pages', () => {
        // Viewport tall enough to show 3 pages
        const viewportHeight = PAGE_HEIGHT * 3 + PAGE_GAP * 2;
        const scrollTop = 2 * (PAGE_HEIGHT + PAGE_GAP);

        const range = renderer.getVisibleRange(scrollTop, viewportHeight);

        // Pages 2, 3, 4, 5 visible (due to partial overlap), buffer 2 = 0-7
        expect(range.start).toBe(0);
        expect(range.end).toBeGreaterThanOrEqual(6);
      });

      it('should handle small document with few pages', () => {
        const smallRenderer = createVirtualRenderer({ totalPages: 3 });
        const range = smallRenderer.getVisibleRange(0, PAGE_HEIGHT * 2);

        expect(range.start).toBe(0);
        expect(range.end).toBe(2);
      });

      it('should return valid range for single page document', () => {
        const singlePageRenderer = createVirtualRenderer({ totalPages: 1 });
        const range = singlePageRenderer.getVisibleRange(0, PAGE_HEIGHT);

        expect(range.start).toBe(0);
        expect(range.end).toBe(0);
      });
    });

    describe('shouldRenderPage', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 20 });
      });

      it('should return true for visible pages', () => {
        const scrollTop = 5 * (PAGE_HEIGHT + PAGE_GAP);
        expect(renderer.shouldRenderPage(5, scrollTop, PAGE_HEIGHT)).toBe(true);
      });

      it('should return true for buffered pages', () => {
        const scrollTop = 5 * (PAGE_HEIGHT + PAGE_GAP);
        // Buffer page above
        expect(renderer.shouldRenderPage(3, scrollTop, PAGE_HEIGHT)).toBe(true);
        // Buffer page below
        expect(renderer.shouldRenderPage(7, scrollTop, PAGE_HEIGHT)).toBe(true);
      });

      it('should return false for pages outside buffer', () => {
        const scrollTop = 10 * (PAGE_HEIGHT + PAGE_GAP);
        // Far from viewport
        expect(renderer.shouldRenderPage(0, scrollTop, PAGE_HEIGHT)).toBe(false);
        expect(renderer.shouldRenderPage(19, scrollTop, PAGE_HEIGHT)).toBe(false);
      });

      it('should return false for invalid page indices', () => {
        expect(renderer.shouldRenderPage(-1, 0, PAGE_HEIGHT)).toBe(false);
        expect(renderer.shouldRenderPage(100, 0, PAGE_HEIGHT)).toBe(false);
      });

      it('should return true for first page at scroll 0', () => {
        expect(renderer.shouldRenderPage(0, 0, PAGE_HEIGHT)).toBe(true);
      });
    });

    describe('getPageTop', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 10 });
      });

      it('should return 0 for first page', () => {
        expect(renderer.getPageTop(0)).toBe(0);
      });

      it('should return correct Y for second page', () => {
        const expected = PAGE_HEIGHT + PAGE_GAP;
        expect(renderer.getPageTop(1)).toBe(expected);
      });

      it('should return correct Y for nth page', () => {
        const pageIndex = 5;
        const expected = pageIndex * (PAGE_HEIGHT + PAGE_GAP);
        expect(renderer.getPageTop(pageIndex)).toBe(expected);
      });

      it('should return 0 for negative page index', () => {
        expect(renderer.getPageTop(-1)).toBe(0);
      });

      it('should clamp to last valid page for index beyond total', () => {
        const expected = 9 * (PAGE_HEIGHT + PAGE_GAP);
        expect(renderer.getPageTop(100)).toBe(expected);
      });
    });

    describe('getScrollTopForPage', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 10 });
      });

      it('should return scroll position that shows page at top', () => {
        for (let i = 0; i < 10; i++) {
          const scrollTop = renderer.getScrollTopForPage(i);
          const pageTop = renderer.getPageTop(i);
          expect(scrollTop).toBe(pageTop);
        }
      });

      it('should be consistent with getPageTop', () => {
        expect(renderer.getScrollTopForPage(5)).toBe(renderer.getPageTop(5));
      });
    });

    describe('getState', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 20 });
      });

      it('should return complete state object', () => {
        const state = renderer.getState(0, PAGE_HEIGHT);

        expect(state.visiblePages).toBeDefined();
        expect(state.bufferedPages).toBeDefined();
        expect(state.totalPages).toBe(20);
        expect(state.scrollTop).toBe(0);
        expect(state.viewportHeight).toBe(PAGE_HEIGHT);
      });

      it('should have visiblePages as subset of bufferedPages', () => {
        const scrollTop = 5 * (PAGE_HEIGHT + PAGE_GAP);
        const state = renderer.getState(scrollTop, PAGE_HEIGHT);

        for (const visiblePage of state.visiblePages) {
          expect(state.bufferedPages).toContain(visiblePage);
        }
      });

      it('should have bufferedPages in sorted order', () => {
        const scrollTop = 10 * (PAGE_HEIGHT + PAGE_GAP);
        const state = renderer.getState(scrollTop, PAGE_HEIGHT);

        for (let i = 1; i < state.bufferedPages.length; i++) {
          expect(state.bufferedPages[i]).toBeGreaterThan(state.bufferedPages[i - 1]);
        }
      });

      it('should correctly track scrollTop and viewportHeight', () => {
        const scrollTop = 500;
        const viewportHeight = 800;
        const state = renderer.getState(scrollTop, viewportHeight);

        expect(state.scrollTop).toBe(scrollTop);
        expect(state.viewportHeight).toBe(viewportHeight);
      });
    });

    describe('setTotalPages', () => {
      it('should update total page count', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });
        renderer.setTotalPages(50);

        const state = renderer.getState(0, PAGE_HEIGHT);
        expect(state.totalPages).toBe(50);
      });

      it('should enforce minimum of 1 page', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });
        renderer.setTotalPages(0);

        const state = renderer.getState(0, PAGE_HEIGHT);
        expect(state.totalPages).toBe(1);
      });

      it('should recalculate visible range after update', () => {
        const renderer = createVirtualRenderer({ totalPages: 5 });

        // Initially can see up to page 4 (index)
        let range = renderer.getVisibleRange(0, PAGE_HEIGHT * 10);
        expect(range.end).toBe(4);

        // Increase pages
        renderer.setTotalPages(100);
        range = renderer.getVisibleRange(0, PAGE_HEIGHT * 10);
        expect(range.end).toBeGreaterThan(4);
      });
    });

    describe('getTotalHeight', () => {
      it('should calculate correct total document height', () => {
        const totalPages = 5;
        const renderer = createVirtualRenderer({ totalPages });

        const expected = totalPages * PAGE_HEIGHT + (totalPages - 1) * PAGE_GAP;
        expect(renderer.getTotalHeight()).toBe(expected);
      });

      it('should return page height for single page', () => {
        const renderer = createVirtualRenderer({ totalPages: 1 });
        expect(renderer.getTotalHeight()).toBe(PAGE_HEIGHT);
      });

      it('should work with custom dimensions', () => {
        const pageHeight = 500;
        const pageGap = 20;
        const totalPages = 10;

        const renderer = createVirtualRenderer({
          totalPages,
          pageHeight,
          pageGap,
        });

        const expected = totalPages * pageHeight + (totalPages - 1) * pageGap;
        expect(renderer.getTotalHeight()).toBe(expected);
      });
    });

    describe('getPlaceholderHeight', () => {
      it('should return page height plus gap', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });
        expect(renderer.getPlaceholderHeight()).toBe(PAGE_HEIGHT + PAGE_GAP);
      });

      it('should use custom page height and gap', () => {
        const pageHeight = 500;
        const pageGap = 20;
        const renderer = createVirtualRenderer({
          totalPages: 10,
          pageHeight,
          pageGap,
        });

        expect(renderer.getPlaceholderHeight()).toBe(pageHeight + pageGap);
      });
    });

    describe('getPageAtY', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 20 });
      });

      it('should return 0 for Y position 0', () => {
        expect(renderer.getPageAtY(0)).toBe(0);
      });

      it('should return 0 for negative Y position', () => {
        expect(renderer.getPageAtY(-100)).toBe(0);
      });

      it('should return correct page for Y within a page', () => {
        const pageUnit = PAGE_HEIGHT + PAGE_GAP;
        expect(renderer.getPageAtY(pageUnit * 5 + 100)).toBe(5);
      });

      it('should clamp to last page for Y beyond document', () => {
        const veryLargeY = 1000000;
        expect(renderer.getPageAtY(veryLargeY)).toBe(19);
      });
    });

    describe('getIntersectingPages', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 20 });
      });

      it('should return pages that intersect viewport', () => {
        const pages = renderer.getIntersectingPages(0, PAGE_HEIGHT);
        expect(pages).toContain(0);
      });

      it('should return multiple pages for large viewport', () => {
        const viewportHeight = PAGE_HEIGHT * 3;
        const pages = renderer.getIntersectingPages(0, viewportHeight);
        expect(pages.length).toBeGreaterThanOrEqual(3);
      });

      it('should return empty array for zero viewport height', () => {
        const pages = renderer.getIntersectingPages(0, 0);
        expect(pages).toEqual([]);
      });

      it('should handle partial page visibility', () => {
        // Scroll halfway through first page
        const scrollTop = PAGE_HEIGHT / 2;
        const pages = renderer.getIntersectingPages(scrollTop, PAGE_HEIGHT);

        // Should see parts of page 0 and page 1
        expect(pages).toContain(0);
        expect(pages).toContain(1);
      });
    });

    describe('getBufferedPages', () => {
      let renderer: VirtualRendererAPI;

      beforeEach(() => {
        renderer = createVirtualRenderer({ totalPages: 20 });
      });

      it('should include visible pages plus buffer', () => {
        const scrollTop = 5 * (PAGE_HEIGHT + PAGE_GAP);
        const buffered = renderer.getBufferedPages(scrollTop, PAGE_HEIGHT);

        // Page 5 visible, buffer 2 = pages 3-7
        expect(buffered).toContain(5);
        expect(buffered).toContain(3);
        expect(buffered).toContain(7);
      });

      it('should match getVisibleRange', () => {
        const scrollTop = 10 * (PAGE_HEIGHT + PAGE_GAP);
        const viewportHeight = PAGE_HEIGHT;

        const buffered = renderer.getBufferedPages(scrollTop, viewportHeight);
        const range = renderer.getVisibleRange(scrollTop, viewportHeight);

        expect(buffered.length).toBe(range.end - range.start + 1);
        expect(buffered[0]).toBe(range.start);
        expect(buffered[buffered.length - 1]).toBe(range.end);
      });
    });
  });

  describe('createScrollHandler', () => {
    let renderer: VirtualRendererAPI;

    beforeEach(() => {
      renderer = createVirtualRenderer({ totalPages: 20 });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('Configuration', () => {
      it('should use default debounce of 16ms', () => {
        expect(DEFAULT_DEBOUNCE_MS).toBe(16);
      });

      it('should accept custom debounce time', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 100,
          onRenderStateChange: callback,
        });

        handler.handleScroll(0, PAGE_HEIGHT);

        // Should not fire immediately
        expect(callback).not.toHaveBeenCalled();

        // Should fire after 100ms
        vi.advanceTimersByTime(100);
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('handleScroll', () => {
      it('should debounce rapid scroll events', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 50,
          onRenderStateChange: callback,
        });

        // Simulate rapid scrolling
        handler.handleScroll(0, PAGE_HEIGHT);
        handler.handleScroll(100, PAGE_HEIGHT);
        handler.handleScroll(200, PAGE_HEIGHT);
        handler.handleScroll(300, PAGE_HEIGHT);

        // Advance time less than debounce
        vi.advanceTimersByTime(40);
        expect(callback).not.toHaveBeenCalled();

        // Advance past debounce time
        vi.advanceTimersByTime(20);
        expect(callback).toHaveBeenCalledTimes(1);

        // Should receive the last scroll position
        const state = callback.mock.calls[0][0] as VirtualRenderState;
        expect(state.scrollTop).toBe(300);
      });

      it('should not call callback if state unchanged', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 16,
          onRenderStateChange: callback,
        });

        // First scroll
        handler.handleScroll(0, PAGE_HEIGHT);
        vi.advanceTimersByTime(20);
        expect(callback).toHaveBeenCalledTimes(1);

        // Same position - should still call initially to update
        handler.handleScroll(0, PAGE_HEIGHT);
        vi.advanceTimersByTime(20);
        // Callback not called again since state is same
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('should call callback when visible pages change', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 16,
          onRenderStateChange: callback,
        });

        // First scroll - page 0
        handler.handleScroll(0, PAGE_HEIGHT);
        vi.advanceTimersByTime(20);
        expect(callback).toHaveBeenCalledTimes(1);

        // Scroll to page 10
        handler.handleScroll(10 * (PAGE_HEIGHT + PAGE_GAP), PAGE_HEIGHT);
        vi.advanceTimersByTime(20);
        expect(callback).toHaveBeenCalledTimes(2);
      });
    });

    describe('forceUpdate', () => {
      it('should bypass debounce and update immediately', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 100,
          onRenderStateChange: callback,
        });

        handler.forceUpdate(0, PAGE_HEIGHT);
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('should cancel pending debounced update', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 100,
          onRenderStateChange: callback,
        });

        // Start a debounced scroll
        handler.handleScroll(100, PAGE_HEIGHT);

        // Force update with different position
        handler.forceUpdate(500, PAGE_HEIGHT);

        // Advance past debounce time
        vi.advanceTimersByTime(150);

        // Should only have been called once (from forceUpdate)
        expect(callback).toHaveBeenCalledTimes(1);
        const state = callback.mock.calls[0][0] as VirtualRenderState;
        expect(state.scrollTop).toBe(500);
      });
    });

    describe('cancel', () => {
      it('should cancel pending debounced updates', () => {
        const callback = vi.fn();
        const handler = createScrollHandler({
          renderer,
          debounceMs: 100,
          onRenderStateChange: callback,
        });

        handler.handleScroll(0, PAGE_HEIGHT);
        handler.cancel();

        vi.advanceTimersByTime(200);
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('getLastState', () => {
      it('should return null before any updates', () => {
        const handler = createScrollHandler({ renderer });
        expect(handler.getLastState()).toBeNull();
      });

      it('should return last computed state', () => {
        const handler = createScrollHandler({
          renderer,
          debounceMs: 16,
        });

        handler.forceUpdate(0, PAGE_HEIGHT);
        const state = handler.getLastState();

        expect(state).not.toBeNull();
        expect(state?.scrollTop).toBe(0);
        expect(state?.viewportHeight).toBe(PAGE_HEIGHT);
      });
    });
  });

  describe('createFastScrollDetector', () => {
    describe('Configuration', () => {
      it('should use default velocity threshold of 200', () => {
        expect(DEFAULT_VELOCITY_THRESHOLD).toBe(200);
      });

      it('should use default time window of 100ms', () => {
        expect(DEFAULT_TIME_WINDOW_MS).toBe(100);
      });

      it('should accept custom velocity threshold', () => {
        const detector = createFastScrollDetector({ velocityThreshold: 500 });
        expect(detector).toBeDefined();
      });

      it('should accept custom time window', () => {
        const detector = createFastScrollDetector({ timeWindowMs: 50 });
        expect(detector).toBeDefined();
      });
    });

    describe('update', () => {
      it('should return false for initial update', () => {
        const detector = createFastScrollDetector();
        expect(detector.update(0)).toBe(false);
      });

      it('should detect fast scrolling when velocity exceeds threshold', async () => {
        const detector = createFastScrollDetector({ velocityThreshold: 200 });

        // First update
        detector.update(0);

        // Wait real time and scroll a lot (high velocity)
        await new Promise((resolve) => setTimeout(resolve, 20));
        // 1000 pixels in ~20ms = ~50000 px/sec, definitely fast
        const isFast = detector.update(1000);

        expect(isFast).toBe(true);
      });

      it('should return false for slow scrolling', async () => {
        // Use a very high threshold so slow scrolling is definitely detected
        const detector = createFastScrollDetector({ velocityThreshold: 100000 });

        detector.update(0);
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 10 pixels in 100ms = 100 px/sec < 100000 threshold
        const isFast = detector.update(10);
        expect(isFast).toBe(false);
      });

      it('should reset velocity when time gap is too large', async () => {
        const detector = createFastScrollDetector({
          velocityThreshold: 100,
          timeWindowMs: 50, // Short time window
        });

        detector.update(0);
        await new Promise((resolve) => setTimeout(resolve, 10));
        detector.update(100); // Fast scroll

        // Wait longer than 2x timeWindowMs to reset
        await new Promise((resolve) => setTimeout(resolve, 150));

        // This should reset velocity
        const isFast = detector.update(110);
        expect(isFast).toBe(false);
      });
    });

    describe('getVelocity', () => {
      it('should return 0 initially', () => {
        const detector = createFastScrollDetector();
        expect(detector.getVelocity()).toBe(0);
      });

      it('should return positive velocity after movement', async () => {
        const detector = createFastScrollDetector();

        detector.update(0);
        await new Promise((resolve) => setTimeout(resolve, 50));
        detector.update(100);

        // Velocity should be positive (100 pixels moved)
        expect(detector.getVelocity()).toBeGreaterThan(0);
      });
    });

    describe('isFastScrolling', () => {
      it('should return false initially', () => {
        const detector = createFastScrollDetector();
        expect(detector.isFastScrolling()).toBe(false);
      });

      it('should track fast scrolling state', async () => {
        const detector = createFastScrollDetector({ velocityThreshold: 100 });

        detector.update(0);
        await new Promise((resolve) => setTimeout(resolve, 10));
        detector.update(500); // High velocity movement

        expect(detector.isFastScrolling()).toBe(true);
      });
    });

    describe('reset', () => {
      it('should reset all state', async () => {
        const detector = createFastScrollDetector({ velocityThreshold: 100 });

        detector.update(0);
        await new Promise((resolve) => setTimeout(resolve, 10));
        detector.update(500);

        expect(detector.isFastScrolling()).toBe(true);

        detector.reset();

        expect(detector.getVelocity()).toBe(0);
        expect(detector.isFastScrolling()).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('calculatePageTransitions', () => {
      it('should return all pages as entering for null previous state', () => {
        const currentState: VirtualRenderState = {
          visiblePages: [5],
          bufferedPages: [3, 4, 5, 6, 7],
          totalPages: 20,
          scrollTop: 0,
          viewportHeight: PAGE_HEIGHT,
        };

        const { entering, exiting } = calculatePageTransitions(null, currentState);

        expect(entering).toEqual([3, 4, 5, 6, 7]);
        expect(exiting).toEqual([]);
      });

      it('should detect entering pages', () => {
        const previousState: VirtualRenderState = {
          visiblePages: [5],
          bufferedPages: [3, 4, 5, 6, 7],
          totalPages: 20,
          scrollTop: 0,
          viewportHeight: PAGE_HEIGHT,
        };

        const currentState: VirtualRenderState = {
          visiblePages: [7],
          bufferedPages: [5, 6, 7, 8, 9],
          totalPages: 20,
          scrollTop: 0,
          viewportHeight: PAGE_HEIGHT,
        };

        const { entering } = calculatePageTransitions(previousState, currentState);

        expect(entering).toContain(8);
        expect(entering).toContain(9);
        expect(entering).not.toContain(5);
        expect(entering).not.toContain(6);
        expect(entering).not.toContain(7);
      });

      it('should detect exiting pages', () => {
        const previousState: VirtualRenderState = {
          visiblePages: [5],
          bufferedPages: [3, 4, 5, 6, 7],
          totalPages: 20,
          scrollTop: 0,
          viewportHeight: PAGE_HEIGHT,
        };

        const currentState: VirtualRenderState = {
          visiblePages: [7],
          bufferedPages: [5, 6, 7, 8, 9],
          totalPages: 20,
          scrollTop: 0,
          viewportHeight: PAGE_HEIGHT,
        };

        const { exiting } = calculatePageTransitions(previousState, currentState);

        expect(exiting).toContain(3);
        expect(exiting).toContain(4);
        expect(exiting).not.toContain(5);
      });

      it('should handle no changes', () => {
        const state: VirtualRenderState = {
          visiblePages: [5],
          bufferedPages: [3, 4, 5, 6, 7],
          totalPages: 20,
          scrollTop: 0,
          viewportHeight: PAGE_HEIGHT,
        };

        const { entering, exiting } = calculatePageTransitions(state, state);

        expect(entering).toEqual([]);
        expect(exiting).toEqual([]);
      });
    });

    describe('isPageFullyVisible', () => {
      it('should return true when page is fully within viewport', () => {
        // Page 0 at scrollTop 0 with viewport larger than page
        const result = isPageFullyVisible(0, 0, PAGE_HEIGHT + 100);
        expect(result).toBe(true);
      });

      it('should return false when page extends beyond viewport', () => {
        // Page 0, viewport smaller than page
        const result = isPageFullyVisible(0, 0, PAGE_HEIGHT - 100);
        expect(result).toBe(false);
      });

      it('should return false when page top is above viewport', () => {
        // Scroll down past page 0
        const result = isPageFullyVisible(0, PAGE_HEIGHT / 2, PAGE_HEIGHT);
        expect(result).toBe(false);
      });

      it('should handle custom page dimensions', () => {
        const pageHeight = 500;
        const pageGap = 20;

        // Page 1 starts at 520, viewport starts at 520 with height 600
        const result = isPageFullyVisible(1, 520, 600, pageHeight, pageGap);
        expect(result).toBe(true);
      });
    });

    describe('getPageVisibilityPercentage', () => {
      it('should return 1 for fully visible page', () => {
        const percentage = getPageVisibilityPercentage(0, 0, PAGE_HEIGHT + 100);
        expect(percentage).toBe(1);
      });

      it('should return 0 for completely hidden page', () => {
        // Page 5 is far below viewport
        const percentage = getPageVisibilityPercentage(5, 0, PAGE_HEIGHT);
        expect(percentage).toBe(0);
      });

      it('should return partial visibility for partially visible page', () => {
        // Half of page 0 visible
        const scrollTop = PAGE_HEIGHT / 2;
        const percentage = getPageVisibilityPercentage(0, scrollTop, PAGE_HEIGHT);

        expect(percentage).toBeGreaterThan(0);
        expect(percentage).toBeLessThan(1);
        expect(percentage).toBeCloseTo(0.5, 1);
      });

      it('should handle page in gap area', () => {
        // Scroll to middle of gap between page 0 and 1
        const scrollTop = PAGE_HEIGHT + PAGE_GAP / 2;
        const percentage = getPageVisibilityPercentage(0, scrollTop, PAGE_HEIGHT);

        // Page 0 ends before viewport starts
        expect(percentage).toBe(0);
      });

      it('should work with custom dimensions', () => {
        const pageHeight = 500;
        const pageGap = 20;

        // Page 0 fully visible
        const percentage = getPageVisibilityPercentage(0, 0, 600, pageHeight, pageGap);
        expect(percentage).toBe(1);
      });
    });

    describe('getMostVisiblePage', () => {
      it('should return first page at scroll 0', () => {
        const mostVisible = getMostVisiblePage(0, PAGE_HEIGHT, 20);
        expect(mostVisible).toBe(0);
      });

      it('should return 0 for zero total pages', () => {
        const mostVisible = getMostVisiblePage(0, PAGE_HEIGHT, 0);
        expect(mostVisible).toBe(0);
      });

      it('should return page with highest visibility', () => {
        // Scroll to show mostly page 5
        const pageUnit = PAGE_HEIGHT + PAGE_GAP;
        const scrollTop = 5 * pageUnit + 100; // Slightly past page 5 start
        const viewportHeight = PAGE_HEIGHT;

        const mostVisible = getMostVisiblePage(scrollTop, viewportHeight, 20);

        // Page 5 should be most visible
        expect(mostVisible).toBe(5);
      });

      it('should handle edge case of viewport spanning multiple pages equally', () => {
        // Position viewport to split evenly between pages
        const pageUnit = PAGE_HEIGHT + PAGE_GAP;
        const scrollTop = pageUnit - PAGE_HEIGHT / 2;
        const viewportHeight = PAGE_HEIGHT;

        const mostVisible = getMostVisiblePage(scrollTop, viewportHeight, 20);

        // Should return one of the two visible pages
        expect([0, 1]).toContain(mostVisible);
      });

      it('should work with custom dimensions', () => {
        const pageHeight = 500;
        const pageGap = 20;
        const pageUnit = pageHeight + pageGap;

        const scrollTop = 2 * pageUnit;
        const mostVisible = getMostVisiblePage(scrollTop, pageHeight, 10, pageHeight, pageGap);

        expect(mostVisible).toBe(2);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('100+ Page Document', () => {
      it('should handle document with 100 pages', () => {
        const renderer = createVirtualRenderer({ totalPages: 100 });

        // Scroll to middle of document
        const scrollTop = 50 * (PAGE_HEIGHT + PAGE_GAP);
        const state = renderer.getState(scrollTop, PAGE_HEIGHT);

        expect(state.totalPages).toBe(100);
        expect(state.bufferedPages.length).toBeLessThan(10); // Should not render all pages
        expect(state.bufferedPages).toContain(50);
      });

      it('should maintain consistent buffer at different scroll positions', () => {
        const renderer = createVirtualRenderer({ totalPages: 100, bufferSize: 2 });

        const positions = [0, 25, 50, 75, 99];

        for (const page of positions) {
          const scrollTop = page * (PAGE_HEIGHT + PAGE_GAP);
          const range = renderer.getVisibleRange(scrollTop, PAGE_HEIGHT);

          // Buffer size should be consistent (except at edges)
          if (page > 2 && page < 97) {
            expect(range.end - range.start).toBeGreaterThanOrEqual(4); // visible + 2 buffer each side
          }
        }
      });
    });

    describe('Scroll Position Tracking', () => {
      it('should correctly track page through programmatic navigation', () => {
        const renderer = createVirtualRenderer({ totalPages: 50 });

        for (let targetPage = 0; targetPage < 50; targetPage += 10) {
          const scrollTop = renderer.getScrollTopForPage(targetPage);
          const state = renderer.getState(scrollTop, PAGE_HEIGHT);

          expect(state.visiblePages).toContain(targetPage);
        }
      });
    });

    describe('Fast Scrolling Behavior', () => {
      it('should detect fast scrolling through document', async () => {
        const detector = createFastScrollDetector({ velocityThreshold: 100 });
        const renderer = createVirtualRenderer({ totalPages: 100 });

        // Initial position
        detector.update(0);

        // Wait a short time and do large scroll (fast)
        await new Promise((resolve) => setTimeout(resolve, 10));
        const scrollTop = 5000;
        const isFast = detector.update(scrollTop);

        expect(isFast).toBe(true);

        // Renderer should still provide valid ranges during fast scroll
        const range = renderer.getVisibleRange(scrollTop, PAGE_HEIGHT);
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.end).toBeLessThan(100);
      });

      it('should provide valid ranges regardless of scroll speed', () => {
        const renderer = createVirtualRenderer({ totalPages: 100 });

        // Test various scroll positions
        const positions = [0, 1000, 5000, 10000, 50000];

        for (const scrollTop of positions) {
          const range = renderer.getVisibleRange(scrollTop, PAGE_HEIGHT);
          expect(range.start).toBeGreaterThanOrEqual(0);
          expect(range.end).toBeLessThanOrEqual(99);
          expect(range.start).toBeLessThanOrEqual(range.end);
        }
      });
    });

    describe('Debounced Updates', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should batch rapid updates efficiently', () => {
        const renderer = createVirtualRenderer({ totalPages: 100 });
        const callback = vi.fn();

        const handler = createScrollHandler({
          renderer,
          debounceMs: 100, // Longer debounce to ensure batching
          onRenderStateChange: callback,
        });

        // Simulate rapid scrolling - all within debounce window
        for (let i = 0; i < 10; i++) {
          handler.handleScroll(i * 1000, PAGE_HEIGHT);
          // Don't advance time, simulating rapid-fire events
        }

        // Should not have fired yet (still within debounce)
        expect(callback).not.toHaveBeenCalled();

        // Complete the debounce
        vi.advanceTimersByTime(150);

        // Should have fired once with final position
        expect(callback).toHaveBeenCalledTimes(1);
        const state = callback.mock.calls[0][0] as VirtualRenderState;
        expect(state.scrollTop).toBe(9000); // Last position
      });

      it('should call callback after debounce period expires', () => {
        const renderer = createVirtualRenderer({ totalPages: 100 });
        const callback = vi.fn();

        const handler = createScrollHandler({
          renderer,
          debounceMs: 50,
          onRenderStateChange: callback,
        });

        handler.handleScroll(500, PAGE_HEIGHT);

        // Not called immediately
        expect(callback).not.toHaveBeenCalled();

        // Wait for debounce
        vi.advanceTimersByTime(60);

        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Single Page Document', () => {
      it('should handle single page correctly', () => {
        const renderer = createVirtualRenderer({ totalPages: 1 });

        const state = renderer.getState(0, PAGE_HEIGHT);
        expect(state.visiblePages).toEqual([0]);
        expect(state.bufferedPages).toEqual([0]);
        expect(renderer.getTotalHeight()).toBe(PAGE_HEIGHT);
      });
    });

    describe('Viewport Larger Than Document', () => {
      it('should show all pages when viewport is larger than document', () => {
        const renderer = createVirtualRenderer({ totalPages: 3 });
        const hugeViewport = PAGE_HEIGHT * 10;

        const state = renderer.getState(0, hugeViewport);
        expect(state.bufferedPages).toEqual([0, 1, 2]);
      });
    });

    describe('Very Small Viewport', () => {
      it('should handle viewport smaller than a single page', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });
        const tinyViewport = 100; // Much smaller than PAGE_HEIGHT

        const state = renderer.getState(0, tinyViewport);

        // Should still buffer pages
        expect(state.bufferedPages.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Negative Scroll Position', () => {
      it('should handle negative scroll position gracefully', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });

        const range = renderer.getVisibleRange(-100, PAGE_HEIGHT);
        expect(range.start).toBe(0);
      });
    });

    describe('Scroll Beyond Document', () => {
      it('should handle scroll position beyond document end', () => {
        const renderer = createVirtualRenderer({ totalPages: 10 });
        const totalHeight = renderer.getTotalHeight();

        const range = renderer.getVisibleRange(totalHeight + 1000, PAGE_HEIGHT);
        expect(range.end).toBeLessThanOrEqual(9);
      });
    });
  });
});
