import { afterEach, vi } from 'vitest';

// =============================================================================
// Mock: window.matchMedia
// =============================================================================
// Required for components that use media queries (e.g., responsive design, dark mode)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// =============================================================================
// Mock: ResizeObserver
// =============================================================================
// Required for TipTap/ProseMirror and components that observe element size changes
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private observedElements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.observedElements.add(target);
  }

  unobserve(target: Element) {
    this.observedElements.delete(target);
  }

  disconnect() {
    this.observedElements.clear();
  }

  // Helper method for tests to trigger resize callback
  trigger(entries?: ResizeObserverEntry[]) {
    if (entries) {
      this.callback(entries, this);
    }
  }
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// =============================================================================
// Mock: getBoundingClientRect
// =============================================================================
// Required for position calculations in TipTap, tooltips, dropdowns, etc.
const mockBoundingClientRect: DOMRect = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  top: 0,
  right: 100,
  bottom: 100,
  left: 0,
  toJSON: () => ({}),
};

Element.prototype.getBoundingClientRect = vi.fn(() => mockBoundingClientRect);

// =============================================================================
// Mock: scrollIntoView
// =============================================================================
// Required for navigation and focus management
Element.prototype.scrollIntoView = vi.fn();

// =============================================================================
// Mock: getComputedStyle
// =============================================================================
// Required for style calculations
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = vi.fn((element: Element) => {
  return originalGetComputedStyle(element);
});

// =============================================================================
// Mock: Range and Selection APIs
// =============================================================================
// Required for TipTap/ProseMirror text selection
if (typeof document.createRange !== 'function') {
  document.createRange = () => {
    const range = {
      setStart: vi.fn(),
      setEnd: vi.fn(),
      commonAncestorContainer: document.body,
      getBoundingClientRect: vi.fn(() => mockBoundingClientRect),
      getClientRects: vi.fn(() => [mockBoundingClientRect]),
      selectNodeContents: vi.fn(),
      collapse: vi.fn(),
      cloneRange: vi.fn(),
    };
    return range as unknown as Range;
  };
}

// =============================================================================
// Mock: IntersectionObserver
// =============================================================================
// Required for lazy loading and visibility detection
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: readonly number[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(): void {
    // Mock implementation - no-op
  }
  unobserve(): void {
    // Mock implementation - no-op
  }
  disconnect(): void {
    // Mock implementation - no-op
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// =============================================================================
// Mock: requestAnimationFrame / cancelAnimationFrame
// =============================================================================
// Required for animations and smooth updates
if (typeof window.requestAnimationFrame !== 'function') {
  window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 0) as unknown as number;
  });
}

if (typeof window.cancelAnimationFrame !== 'function') {
  window.cancelAnimationFrame = vi.fn((id: number) => {
    clearTimeout(id);
  });
}

// =============================================================================
// Mock: ClipboardEvent and clipboard API
// =============================================================================
// Required for copy/paste functionality in editors
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
  },
  writable: true,
});

// =============================================================================
// Cleanup after each test
// =============================================================================
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Clean up the DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Reset any modified global state
  vi.unstubAllGlobals();
});

// =============================================================================
// Type augmentation for custom matchers (if needed in future)
// =============================================================================
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Assertion {
      // Add custom matchers here if needed
    }
  }
}

export {};
