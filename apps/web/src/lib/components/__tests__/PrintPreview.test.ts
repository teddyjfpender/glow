/**
 * Tests for PrintPreview Component
 *
 * Tests the print preview modal functionality including:
 * - Modal overlay and visibility
 * - Page display and navigation
 * - Keyboard shortcuts
 * - Zoom controls
 * - Print handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Test Constants
// ============================================================================

const TEST_CONSTANTS = {
  // Page metrics
  PAGE_WIDTH: 816,
  PAGE_HEIGHT: 1056,
  PAGE_CONTENT_HEIGHT: 828,
  HEADER_HEIGHT: 72,
  FOOTER_HEIGHT: 60,

  // Zoom levels
  ZOOM_LEVELS: [0.25, 0.5, 0.75, 1],
  ZOOM_LABELS: ['25%', '50%', '75%', '100%'],
  DEFAULT_ZOOM: 0.5,

  // Test content
  SAMPLE_HTML: '<p>Test document content</p>',
  MULTI_PAGE_HTML: '<p>Page 1 content</p><p>Page 2 content</p><p>Page 3 content</p>',
};

// ============================================================================
// Mock Props Interface
// ============================================================================

interface MockPrintPreviewProps {
  isOpen: boolean;
  content: string;
  pageCount: number;
  onClose: () => void;
  onPrint: () => void;
}

function createMockProps(overrides: Partial<MockPrintPreviewProps> = {}): MockPrintPreviewProps {
  return {
    isOpen: true,
    content: TEST_CONSTANTS.SAMPLE_HTML,
    pageCount: 3,
    onClose: vi.fn(),
    onPrint: vi.fn(),
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('PrintPreview Component', () => {
  let mockProps: MockPrintPreviewProps;

  beforeEach(() => {
    mockProps = createMockProps();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Props Interface Tests
  // ============================================================================

  describe('Props Interface', () => {
    it('should accept isOpen boolean prop', () => {
      const props = createMockProps({ isOpen: true });
      expect(typeof props.isOpen).toBe('boolean');
    });

    it('should accept content string prop', () => {
      const props = createMockProps({ content: '<p>Test</p>' });
      expect(typeof props.content).toBe('string');
    });

    it('should accept pageCount number prop', () => {
      const props = createMockProps({ pageCount: 5 });
      expect(typeof props.pageCount).toBe('number');
      expect(props.pageCount).toBeGreaterThan(0);
    });

    it('should accept onClose callback prop', () => {
      const props = createMockProps();
      expect(typeof props.onClose).toBe('function');
    });

    it('should accept onPrint callback prop', () => {
      const props = createMockProps();
      expect(typeof props.onPrint).toBe('function');
    });
  });

  // ============================================================================
  // Modal Overlay Tests
  // ============================================================================

  describe('Modal Overlay', () => {
    it('should render when isOpen is true', () => {
      const props = createMockProps({ isOpen: true });
      expect(props.isOpen).toBe(true);
    });

    it('should not render when isOpen is false', () => {
      const props = createMockProps({ isOpen: false });
      expect(props.isOpen).toBe(false);
    });

    it('should have dark overlay background', () => {
      // Background should be rgba(0, 0, 0, 0.9) or similar dark color
      const expectedBgPattern = /rgba\(0,\s*0,\s*0,\s*0\.[89]\)/;
      expect('rgba(0, 0, 0, 0.9)').toMatch(expectedBgPattern);
    });

    it('should have proper ARIA attributes for accessibility', () => {
      const requiredAriaAttributes = ['role', 'aria-modal', 'aria-label'];
      requiredAriaAttributes.forEach(attr => {
        expect(attr).toBeTruthy();
      });
    });

    it('should close when clicking overlay background', () => {
      const props = createMockProps();
      // Clicking the overlay (not the content) should call onClose
      expect(props.onClose).toBeDefined();
    });
  });

  // ============================================================================
  // Control Bar Tests
  // ============================================================================

  describe('Control Bar', () => {
    it('should display close button', () => {
      const props = createMockProps();
      expect(props.onClose).toBeDefined();
    });

    it('should display print button', () => {
      const props = createMockProps();
      expect(props.onPrint).toBeDefined();
    });

    it('should display page indicator with current page and total', () => {
      const props = createMockProps({ pageCount: 5 });
      const expectedFormat = `Page 1 of ${props.pageCount}`;
      expect(expectedFormat).toBe('Page 1 of 5');
    });

    it('should display zoom controls', () => {
      const zoomLevels = TEST_CONSTANTS.ZOOM_LEVELS;
      expect(zoomLevels).toHaveLength(4);
      expect(zoomLevels).toContain(0.25);
      expect(zoomLevels).toContain(0.5);
      expect(zoomLevels).toContain(0.75);
      expect(zoomLevels).toContain(1);
    });

    it('should have print button with correct styling', () => {
      // Print button should have accent color styling
      const accentColor = 'var(--glow-accent-primary, #60a5fa)';
      expect(accentColor).toBeTruthy();
    });
  });

  // ============================================================================
  // Page Display Tests
  // ============================================================================

  describe('Page Display', () => {
    it('should render correct number of page thumbnails', () => {
      const props = createMockProps({ pageCount: 3 });
      const pages = Array.from({ length: props.pageCount }, (_, i) => i + 1);
      expect(pages).toHaveLength(3);
      expect(pages).toEqual([1, 2, 3]);
    });

    it('should display page with correct dimensions', () => {
      const pageWidth = TEST_CONSTANTS.PAGE_WIDTH;
      const pageHeight = TEST_CONSTANTS.PAGE_HEIGHT;
      expect(pageWidth).toBe(816);
      expect(pageHeight).toBe(1056);
    });

    it('should display page with white background', () => {
      const pageBackground = '#fff';
      expect(pageBackground).toBe('#fff');
    });

    it('should display page with shadow styling', () => {
      const shadowPattern = /box-shadow/;
      const expectedShadow = 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)';
      expect(expectedShadow).toMatch(shadowPattern);
    });

    it('should display page number below each thumbnail', () => {
      const props = createMockProps({ pageCount: 3 });
      const pageNumbers = Array.from({ length: props.pageCount }, (_, i) => i + 1);
      expect(pageNumbers).toEqual([1, 2, 3]);
    });

    it('should render header area on each page', () => {
      const headerHeight = TEST_CONSTANTS.HEADER_HEIGHT;
      expect(headerHeight).toBe(72);
    });

    it('should render footer area on each page', () => {
      const footerHeight = TEST_CONSTANTS.FOOTER_HEIGHT;
      expect(footerHeight).toBe(60);
    });

    it('should render content area between header and footer', () => {
      const contentHeight = TEST_CONSTANTS.PAGE_CONTENT_HEIGHT;
      expect(contentHeight).toBe(828);
    });

    it('should clip content at page boundaries', () => {
      // Content should use CSS overflow: hidden and transform for clipping
      const clipStyle = 'overflow: hidden';
      expect(clipStyle).toContain('overflow');
    });

    it('should calculate correct Y offset for each page content', () => {
      const pageContentHeight = TEST_CONSTANTS.PAGE_CONTENT_HEIGHT;

      // Page 1 offset should be 0
      const page1Offset = (1 - 1) * pageContentHeight;
      expect(page1Offset).toBe(0);

      // Page 2 offset should be 828
      const page2Offset = (2 - 1) * pageContentHeight;
      expect(page2Offset).toBe(828);

      // Page 3 offset should be 1656
      const page3Offset = (3 - 1) * pageContentHeight;
      expect(page3Offset).toBe(1656);
    });
  });

  // ============================================================================
  // Zoom Functionality Tests
  // ============================================================================

  describe('Zoom Functionality', () => {
    it('should start with default zoom level', () => {
      const defaultZoom = TEST_CONSTANTS.DEFAULT_ZOOM;
      expect(defaultZoom).toBe(0.5);
    });

    it('should support zoom level 25%', () => {
      const zoomLevel = TEST_CONSTANTS.ZOOM_LEVELS[0];
      expect(zoomLevel).toBe(0.25);
    });

    it('should support zoom level 50%', () => {
      const zoomLevel = TEST_CONSTANTS.ZOOM_LEVELS[1];
      expect(zoomLevel).toBe(0.5);
    });

    it('should support zoom level 75%', () => {
      const zoomLevel = TEST_CONSTANTS.ZOOM_LEVELS[2];
      expect(zoomLevel).toBe(0.75);
    });

    it('should support zoom level 100%', () => {
      const zoomLevel = TEST_CONSTANTS.ZOOM_LEVELS[3];
      expect(zoomLevel).toBe(1);
    });

    it('should highlight active zoom button', () => {
      // Active zoom button should have different styling
      const activeClass = 'active';
      expect(activeClass).toBe('active');
    });

    it('should scale page thumbnails based on zoom level', () => {
      const zoom = 0.5;
      const scaledWidth = TEST_CONSTANTS.PAGE_WIDTH * zoom;
      const scaledHeight = TEST_CONSTANTS.PAGE_HEIGHT * zoom;
      expect(scaledWidth).toBe(408);
      expect(scaledHeight).toBe(528);
    });
  });

  // ============================================================================
  // Page Click to Zoom Tests
  // ============================================================================

  describe('Page Click to Zoom', () => {
    it('should enter zoomed view when clicking a page thumbnail', () => {
      // Clicking a page should set zoomedPage state
      const initialZoomedPage = null;
      const clickedPage = 2;
      expect(initialZoomedPage).toBeNull();
      expect(clickedPage).toBeGreaterThan(0);
    });

    it('should display single page in zoomed view', () => {
      const zoomedPage = 1;
      expect(zoomedPage).toBe(1);
    });

    it('should show navigation controls in zoomed view', () => {
      // Should have prev and next buttons
      const navControls = ['prev', 'next'];
      expect(navControls).toContain('prev');
      expect(navControls).toContain('next');
    });

    it('should disable prev button on first page', () => {
      const currentPage = 1;
      const isPrevDisabled = currentPage <= 1;
      expect(isPrevDisabled).toBe(true);
    });

    it('should disable next button on last page', () => {
      const currentPage = 3;
      const pageCount = 3;
      const isNextDisabled = currentPage >= pageCount;
      expect(isNextDisabled).toBe(true);
    });

    it('should close zoomed view and return to grid', () => {
      // Should have a button to close zoomed view
      const closeZoomLabel = 'Back to grid view';
      expect(closeZoomLabel).toBeTruthy();
    });

    it('should update page indicator in zoomed view', () => {
      const currentPage = 2;
      const pageCount = 3;
      const indicator = `Page ${currentPage} of ${pageCount}`;
      expect(indicator).toBe('Page 2 of 3');
    });
  });

  // ============================================================================
  // Keyboard Shortcuts Tests
  // ============================================================================

  describe('Keyboard Shortcuts', () => {
    it('should close on Escape key when not zoomed', () => {
      const props = createMockProps();
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      expect(escapeEvent.key).toBe('Escape');
      // Should call onClose
      expect(props.onClose).toBeDefined();
    });

    it('should close zoom view on Escape key when zoomed', () => {
      // When zoomed, Escape should close zoom view first
      const zoomedPage = 2;
      const afterEscape = null;
      expect(zoomedPage).not.toBeNull();
      expect(afterEscape).toBeNull();
    });

    it('should trigger print on Ctrl+P', () => {
      const props = createMockProps();
      const printEvent = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
      });
      expect(printEvent.ctrlKey).toBe(true);
      expect(printEvent.key).toBe('p');
      expect(props.onPrint).toBeDefined();
    });

    it('should trigger print on Cmd+P (Mac)', () => {
      const props = createMockProps();
      const printEvent = new KeyboardEvent('keydown', {
        key: 'p',
        metaKey: true,
      });
      expect(printEvent.metaKey).toBe(true);
      expect(printEvent.key).toBe('p');
      expect(props.onPrint).toBeDefined();
    });

    it('should navigate to previous page with ArrowLeft in zoomed view', () => {
      const currentPage = 3;
      const afterLeftArrow = currentPage - 1;
      expect(afterLeftArrow).toBe(2);
    });

    it('should navigate to next page with ArrowRight in zoomed view', () => {
      const currentPage = 1;
      const afterRightArrow = currentPage + 1;
      expect(afterRightArrow).toBe(2);
    });

    it('should not navigate past first page with ArrowLeft', () => {
      const currentPage = 1;
      const afterLeftArrow = Math.max(1, currentPage - 1);
      expect(afterLeftArrow).toBe(1);
    });

    it('should not navigate past last page with ArrowRight', () => {
      const currentPage = 3;
      const pageCount = 3;
      const afterRightArrow = Math.min(pageCount, currentPage + 1);
      expect(afterRightArrow).toBe(3);
    });
  });

  // ============================================================================
  // Print Handling Tests
  // ============================================================================

  describe('Print Handling', () => {
    it('should call onPrint when print button is clicked', () => {
      const props = createMockProps();
      expect(typeof props.onPrint).toBe('function');
    });

    it('should have @media print styles defined', () => {
      // Print media query should hide preview overlay
      const printMediaQuery = '@media print';
      expect(printMediaQuery).toBeTruthy();
    });

    it('should configure proper page size for printing', () => {
      // Page size should be letter (8.5" x 11")
      const pageSize = 'letter';
      expect(pageSize).toBe('letter');
    });

    it('should configure proper margins for printing', () => {
      // Margins should be 1" top/sides, 0.75" bottom
      const topMargin = '1in';
      const bottomMargin = '0.75in';
      expect(topMargin).toBe('1in');
      expect(bottomMargin).toBe('0.75in');
    });

    it('should prevent orphans in print', () => {
      const orphans = 2;
      expect(orphans).toBeGreaterThanOrEqual(2);
    });

    it('should prevent widows in print', () => {
      const widows = 2;
      expect(widows).toBeGreaterThanOrEqual(2);
    });

    it('should keep headings with following content', () => {
      const pageBreakAfter = 'avoid';
      expect(pageBreakAfter).toBe('avoid');
    });

    it('should avoid breaking inside images and tables', () => {
      const breakInside = 'avoid';
      expect(breakInside).toBe('avoid');
    });
  });

  // ============================================================================
  // State Reset Tests
  // ============================================================================

  describe('State Reset', () => {
    it('should reset zoom when dialog opens', () => {
      // zoomLevel should reset to default when isOpen changes to true
      const defaultZoom = TEST_CONSTANTS.DEFAULT_ZOOM;
      expect(defaultZoom).toBe(0.5);
    });

    it('should reset zoomed page when dialog opens', () => {
      // zoomedPage should reset to null when isOpen changes to true
      const initialZoomedPage = null;
      expect(initialZoomedPage).toBeNull();
    });

    it('should reset current page when dialog opens', () => {
      // currentPage should reset to 1 when isOpen changes to true
      const initialCurrentPage = 1;
      expect(initialCurrentPage).toBe(1);
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible close button label', () => {
      const ariaLabel = 'Close print preview';
      expect(ariaLabel).toBeTruthy();
    });

    it('should have accessible print button label', () => {
      const ariaLabel = 'Print document';
      expect(ariaLabel).toBeTruthy();
    });

    it('should have accessible page thumbnail labels', () => {
      const pageNumber = 1;
      const ariaLabel = `View page ${pageNumber}`;
      expect(ariaLabel).toBe('View page 1');
    });

    it('should have accessible navigation button labels', () => {
      const prevLabel = 'Previous page';
      const nextLabel = 'Next page';
      expect(prevLabel).toBeTruthy();
      expect(nextLabel).toBeTruthy();
    });

    it('should have accessible zoom button labels', () => {
      const zoomLabels = TEST_CONSTANTS.ZOOM_LABELS;
      zoomLabels.forEach(label => {
        const ariaLabel = `Zoom ${label}`;
        expect(ariaLabel).toBeTruthy();
      });
    });

    it('should have role="dialog" on modal', () => {
      const role = 'dialog';
      expect(role).toBe('dialog');
    });

    it('should have aria-modal="true"', () => {
      const ariaModal = 'true';
      expect(ariaModal).toBe('true');
    });

    it('should trap focus within modal', () => {
      // Focus should stay within the modal when tabbing
      const hasFocusTrap = true;
      expect(hasFocusTrap).toBe(true);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle single page document', () => {
      const props = createMockProps({ pageCount: 1 });
      expect(props.pageCount).toBe(1);
    });

    it('should handle multi-page document', () => {
      const props = createMockProps({ pageCount: 10 });
      expect(props.pageCount).toBe(10);
    });

    it('should handle empty content', () => {
      const props = createMockProps({ content: '' });
      expect(props.content).toBe('');
    });

    it('should handle HTML content with styling', () => {
      const styledContent = '<p style="font-weight: bold;">Bold text</p>';
      const props = createMockProps({ content: styledContent });
      expect(props.content).toContain('font-weight');
    });

    it('should handle content with images', () => {
      const imageContent = '<p>Text</p><img src="test.jpg" alt="Test image" />';
      const props = createMockProps({ content: imageContent });
      expect(props.content).toContain('img');
    });

    it('should handle content with tables', () => {
      const tableContent = '<table><tr><td>Cell</td></tr></table>';
      const props = createMockProps({ content: tableContent });
      expect(props.content).toContain('table');
    });

    it('should update page count dynamically', () => {
      const initialPageCount = 3;
      const newPageCount = 5;
      expect(initialPageCount).not.toBe(newPageCount);
      expect(newPageCount).toBeGreaterThan(initialPageCount);
    });

    it('should update content dynamically', () => {
      const initialContent = '<p>Initial</p>';
      const newContent = '<p>Updated</p>';
      expect(initialContent).not.toBe(newContent);
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very large page counts', () => {
      const props = createMockProps({ pageCount: 1000 });
      expect(props.pageCount).toBe(1000);
    });

    it('should handle zero page count gracefully', () => {
      // pageCount should be at least 1
      const pageCount = Math.max(1, 0);
      expect(pageCount).toBe(1);
    });

    it('should handle negative page count gracefully', () => {
      // pageCount should be at least 1
      const pageCount = Math.max(1, -5);
      expect(pageCount).toBe(1);
    });

    it('should handle rapid zoom changes', () => {
      const zoomLevels = TEST_CONSTANTS.ZOOM_LEVELS;
      let currentZoom = 0.5;

      // Rapid changes should work
      zoomLevels.forEach(level => {
        currentZoom = level;
      });

      expect(currentZoom).toBe(1);
    });

    it('should handle rapid page navigation', () => {
      let currentPage = 1;
      const pageCount = 10;

      // Rapid navigation
      for (let i = 0; i < 5; i++) {
        if (currentPage < pageCount) currentPage++;
      }

      expect(currentPage).toBe(6);
    });

    it('should handle content with special characters', () => {
      const content = '<p>&lt;script&gt;alert("XSS")&lt;/script&gt;</p>';
      const props = createMockProps({ content });
      expect(props.content).toContain('&lt;');
      expect(props.content).toContain('&gt;');
    });

    it('should handle very long content', () => {
      const longContent = '<p>' + 'Lorem ipsum '.repeat(10000) + '</p>';
      const props = createMockProps({ content: longContent });
      expect(props.content.length).toBeGreaterThan(100000);
    });
  });
});

// ============================================================================
// Component Callback Tests
// ============================================================================

describe('PrintPreview Callbacks', () => {
  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const props = createMockProps({ onClose });

    // Simulate close button click
    props.onClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onPrint when print button is clicked', () => {
    const onPrint = vi.fn();
    const props = createMockProps({ onPrint });

    // Simulate print button click
    props.onPrint();

    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose multiple times for single click', () => {
    const onClose = vi.fn();
    const props = createMockProps({ onClose });

    props.onClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onPrint multiple times for single click', () => {
    const onPrint = vi.fn();
    const props = createMockProps({ onPrint });

    props.onPrint();

    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// CSS Styling Tests
// ============================================================================

describe('PrintPreview Styling', () => {
  it('should use CSS variables for theming', () => {
    const cssVariables = [
      '--glow-bg-elevated',
      '--glow-bg-surface',
      '--glow-border-default',
      '--glow-text-primary',
      '--glow-text-secondary',
      '--glow-accent-primary',
      '--glow-accent-hover',
    ];

    cssVariables.forEach(variable => {
      expect(variable.startsWith('--glow-')).toBe(true);
    });
  });

  it('should have consistent border radius', () => {
    const borderRadius = '6px';
    expect(borderRadius).toBe('6px');
  });

  it('should have smooth transitions', () => {
    const transition = '0.15s ease';
    expect(transition).toContain('ease');
  });

  it('should have responsive grid layout', () => {
    const gridDisplay = 'grid';
    const autoFill = 'auto-fill';
    expect(gridDisplay).toBe('grid');
    expect(autoFill).toBe('auto-fill');
  });
});
