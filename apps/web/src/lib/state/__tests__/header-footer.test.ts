// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { headerFooterState } from '../header-footer.svelte';

describe('Header/Footer State', () => {
  beforeEach(() => {
    headerFooterState.reset();
  });

  describe('Initial State', () => {
    it('should have empty header sections', () => {
      expect(headerFooterState.header.left).toBe('');
      expect(headerFooterState.header.center).toBe('');
      expect(headerFooterState.header.right).toBe('');
    });

    it('should have default footer with page numbers in center', () => {
      expect(headerFooterState.footer.center).toBe('Page {pageNumber} of {totalPages}');
    });

    it('should have empty footer left and right sections', () => {
      expect(headerFooterState.footer.left).toBe('');
      expect(headerFooterState.footer.right).toBe('');
    });

    it('should have differentFirstPage set to false', () => {
      expect(headerFooterState.differentFirstPage).toBe(false);
    });

    it('should have empty firstPageHeader sections', () => {
      expect(headerFooterState.firstPageHeader.left).toBe('');
      expect(headerFooterState.firstPageHeader.center).toBe('');
      expect(headerFooterState.firstPageHeader.right).toBe('');
    });

    it('should have empty firstPageFooter sections', () => {
      expect(headerFooterState.firstPageFooter.left).toBe('');
      expect(headerFooterState.firstPageFooter.center).toBe('');
      expect(headerFooterState.firstPageFooter.right).toBe('');
    });
  });

  describe('setHeaderSection', () => {
    it('should update left section correctly', () => {
      headerFooterState.setHeaderSection('left', 'Left Header');
      expect(headerFooterState.header.left).toBe('Left Header');
    });

    it('should update center section correctly', () => {
      headerFooterState.setHeaderSection('center', 'Center Header');
      expect(headerFooterState.header.center).toBe('Center Header');
    });

    it('should update right section correctly', () => {
      headerFooterState.setHeaderSection('right', 'Right Header');
      expect(headerFooterState.header.right).toBe('Right Header');
    });

    it('should not affect other sections when updating one', () => {
      headerFooterState.setHeaderSection('left', 'Left Value');
      headerFooterState.setHeaderSection('center', 'Center Value');

      headerFooterState.setHeaderSection('right', 'Right Value');

      expect(headerFooterState.header.left).toBe('Left Value');
      expect(headerFooterState.header.center).toBe('Center Value');
      expect(headerFooterState.header.right).toBe('Right Value');
    });

    it('should not affect footer sections', () => {
      const originalFooter = { ...headerFooterState.footer };
      headerFooterState.setHeaderSection('center', 'New Header');

      expect(headerFooterState.footer.left).toBe(originalFooter.left);
      expect(headerFooterState.footer.center).toBe(originalFooter.center);
      expect(headerFooterState.footer.right).toBe(originalFooter.right);
    });
  });

  describe('setFooterSection', () => {
    it('should update left section correctly', () => {
      headerFooterState.setFooterSection('left', 'Left Footer');
      expect(headerFooterState.footer.left).toBe('Left Footer');
    });

    it('should update center section correctly', () => {
      headerFooterState.setFooterSection('center', 'Center Footer');
      expect(headerFooterState.footer.center).toBe('Center Footer');
    });

    it('should update right section correctly', () => {
      headerFooterState.setFooterSection('right', 'Right Footer');
      expect(headerFooterState.footer.right).toBe('Right Footer');
    });

    it('should not affect other sections when updating one', () => {
      headerFooterState.setFooterSection('left', 'Left Value');
      headerFooterState.setFooterSection('right', 'Right Value');

      expect(headerFooterState.footer.left).toBe('Left Value');
      expect(headerFooterState.footer.right).toBe('Right Value');
    });

    it('should not affect header sections', () => {
      headerFooterState.setHeaderSection('center', 'Header Value');
      headerFooterState.setFooterSection('center', 'Footer Value');

      expect(headerFooterState.header.center).toBe('Header Value');
      expect(headerFooterState.footer.center).toBe('Footer Value');
    });
  });

  describe('setFirstPageHeader', () => {
    it('should update left section correctly', () => {
      headerFooterState.setFirstPageHeader('left', 'First Page Left');
      expect(headerFooterState.firstPageHeader.left).toBe('First Page Left');
    });

    it('should update center section correctly', () => {
      headerFooterState.setFirstPageHeader('center', 'First Page Center');
      expect(headerFooterState.firstPageHeader.center).toBe('First Page Center');
    });

    it('should update right section correctly', () => {
      headerFooterState.setFirstPageHeader('right', 'First Page Right');
      expect(headerFooterState.firstPageHeader.right).toBe('First Page Right');
    });

    it('should not affect standard header', () => {
      headerFooterState.setHeaderSection('center', 'Standard Header');
      headerFooterState.setFirstPageHeader('center', 'First Page Header');

      expect(headerFooterState.header.center).toBe('Standard Header');
      expect(headerFooterState.firstPageHeader.center).toBe('First Page Header');
    });
  });

  describe('setFirstPageFooter', () => {
    it('should update left section correctly', () => {
      headerFooterState.setFirstPageFooter('left', 'First Page Left');
      expect(headerFooterState.firstPageFooter.left).toBe('First Page Left');
    });

    it('should update center section correctly', () => {
      headerFooterState.setFirstPageFooter('center', 'First Page Center');
      expect(headerFooterState.firstPageFooter.center).toBe('First Page Center');
    });

    it('should update right section correctly', () => {
      headerFooterState.setFirstPageFooter('right', 'First Page Right');
      expect(headerFooterState.firstPageFooter.right).toBe('First Page Right');
    });

    it('should not affect standard footer', () => {
      headerFooterState.setFooterSection('center', 'Standard Footer');
      headerFooterState.setFirstPageFooter('center', 'First Page Footer');

      expect(headerFooterState.footer.center).toBe('Standard Footer');
      expect(headerFooterState.firstPageFooter.center).toBe('First Page Footer');
    });
  });

  describe('toggleDifferentFirstPage', () => {
    it('should toggle from false to true', () => {
      expect(headerFooterState.differentFirstPage).toBe(false);
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(true);
    });

    it('should toggle from true to false', () => {
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(true);
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      expect(headerFooterState.differentFirstPage).toBe(false);
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(true);
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(false);
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(true);
    });
  });

  describe('getConfigForPage', () => {
    it('should return standard header/footer for page 2', () => {
      headerFooterState.setHeaderSection('center', 'Standard Header');
      headerFooterState.setFooterSection('center', 'Standard Footer');
      headerFooterState.toggleDifferentFirstPage();
      headerFooterState.setFirstPageHeader('center', 'First Page Header');
      headerFooterState.setFirstPageFooter('center', 'First Page Footer');

      const config = headerFooterState.getConfigForPage(2, 5);

      expect(config.header.center).toBe('Standard Header');
      expect(config.footer.center).toBe('Standard Footer');
    });

    it('should return standard header/footer for page 3+', () => {
      headerFooterState.setHeaderSection('center', 'Standard Header');
      headerFooterState.toggleDifferentFirstPage();
      headerFooterState.setFirstPageHeader('center', 'First Page Header');

      const config = headerFooterState.getConfigForPage(3, 10);

      expect(config.header.center).toBe('Standard Header');
    });

    it('should return first page header/footer for page 1 when differentFirstPage is true', () => {
      headerFooterState.setHeaderSection('center', 'Standard Header');
      headerFooterState.setFooterSection('center', 'Standard Footer');
      headerFooterState.toggleDifferentFirstPage();
      headerFooterState.setFirstPageHeader('center', 'First Page Header');
      headerFooterState.setFirstPageFooter('center', 'First Page Footer');

      const config = headerFooterState.getConfigForPage(1, 5);

      expect(config.header.center).toBe('First Page Header');
      expect(config.footer.center).toBe('First Page Footer');
    });

    it('should return standard header/footer for page 1 when differentFirstPage is false', () => {
      headerFooterState.setHeaderSection('center', 'Standard Header');
      headerFooterState.setFooterSection('center', 'Standard Footer');
      // differentFirstPage is false by default

      const config = headerFooterState.getConfigForPage(1, 5);

      expect(config.header.center).toBe('Standard Header');
      expect(config.footer.center).toBe('Standard Footer');
    });

    it('should process {pageNumber} placeholder correctly', () => {
      headerFooterState.setFooterSection('center', 'Page {pageNumber}');

      const config = headerFooterState.getConfigForPage(3, 5);

      expect(config.footer.center).toBe('Page 3');
    });

    it('should process {totalPages} placeholder correctly', () => {
      headerFooterState.setFooterSection('center', 'Total: {totalPages}');

      const config = headerFooterState.getConfigForPage(1, 10);

      expect(config.footer.center).toBe('Total: 10');
    });

    it('should process both placeholders together', () => {
      headerFooterState.setFooterSection('center', 'Page {pageNumber} of {totalPages}');

      const config = headerFooterState.getConfigForPage(3, 10);

      expect(config.footer.center).toBe('Page 3 of 10');
    });

    it('should process placeholders in header sections', () => {
      headerFooterState.setHeaderSection('right', '{pageNumber}/{totalPages}');

      const config = headerFooterState.getConfigForPage(2, 5);

      expect(config.header.right).toBe('2/5');
    });

    it('should process placeholders in all sections', () => {
      headerFooterState.setHeaderSection('left', 'Page {pageNumber}');
      headerFooterState.setHeaderSection('center', 'of');
      headerFooterState.setHeaderSection('right', '{totalPages}');

      const config = headerFooterState.getConfigForPage(4, 8);

      expect(config.header.left).toBe('Page 4');
      expect(config.header.center).toBe('of');
      expect(config.header.right).toBe('8');
    });

    it('should handle missing totalPages parameter (defaults to 1)', () => {
      headerFooterState.setFooterSection('center', 'Page {pageNumber} of {totalPages}');

      const config = headerFooterState.getConfigForPage(1);

      expect(config.footer.center).toBe('Page 1 of 1');
    });

    it('should process placeholders in first page header/footer', () => {
      headerFooterState.toggleDifferentFirstPage();
      headerFooterState.setFirstPageHeader('center', 'Page {pageNumber} of {totalPages}');
      headerFooterState.setFirstPageFooter('center', '{pageNumber}');

      const config = headerFooterState.getConfigForPage(1, 5);

      expect(config.header.center).toBe('Page 1 of 5');
      expect(config.footer.center).toBe('1');
    });

    it('should handle multiple placeholder occurrences', () => {
      headerFooterState.setFooterSection('center', '{pageNumber} - {pageNumber} - {pageNumber}');

      const config = headerFooterState.getConfigForPage(7, 10);

      expect(config.footer.center).toBe('7 - 7 - 7');
    });
  });

  describe('config getter', () => {
    it('should return complete config object', () => {
      headerFooterState.setHeaderSection('left', 'Header Left');
      headerFooterState.setFooterSection('right', 'Footer Right');

      const config = headerFooterState.config;

      expect(config).toHaveProperty('header');
      expect(config).toHaveProperty('footer');
      expect(config).toHaveProperty('differentFirstPage');
      expect(config.header.left).toBe('Header Left');
      expect(config.footer.right).toBe('Footer Right');
    });

    it('should include firstPageHeader/Footer when differentFirstPage is true', () => {
      headerFooterState.toggleDifferentFirstPage();
      headerFooterState.setFirstPageHeader('center', 'First Header');
      headerFooterState.setFirstPageFooter('center', 'First Footer');

      const config = headerFooterState.config;

      expect(config.differentFirstPage).toBe(true);
      expect(config.firstPageHeader).toBeDefined();
      expect(config.firstPageFooter).toBeDefined();
      expect(config.firstPageHeader?.center).toBe('First Header');
      expect(config.firstPageFooter?.center).toBe('First Footer');
    });

    it('should not include firstPageHeader/Footer when differentFirstPage is false', () => {
      headerFooterState.setFirstPageHeader('center', 'First Header');
      headerFooterState.setFirstPageFooter('center', 'First Footer');
      // differentFirstPage remains false

      const config = headerFooterState.config;

      expect(config.differentFirstPage).toBe(false);
      expect(config.firstPageHeader).toBeUndefined();
      expect(config.firstPageFooter).toBeUndefined();
    });

    it('should reflect current state', () => {
      const initialConfig = headerFooterState.config;
      expect(initialConfig.header.center).toBe('');

      headerFooterState.setHeaderSection('center', 'Updated');

      const updatedConfig = headerFooterState.config;
      expect(updatedConfig.header.center).toBe('Updated');
    });
  });

  describe('reset', () => {
    it('should restore header to empty sections', () => {
      headerFooterState.setHeaderSection('left', 'Left');
      headerFooterState.setHeaderSection('center', 'Center');
      headerFooterState.setHeaderSection('right', 'Right');

      headerFooterState.reset();

      expect(headerFooterState.header.left).toBe('');
      expect(headerFooterState.header.center).toBe('');
      expect(headerFooterState.header.right).toBe('');
    });

    it('should restore footer to default (page numbers)', () => {
      headerFooterState.setFooterSection('left', 'Left');
      headerFooterState.setFooterSection('center', 'Custom Center');
      headerFooterState.setFooterSection('right', 'Right');

      headerFooterState.reset();

      expect(headerFooterState.footer.left).toBe('');
      expect(headerFooterState.footer.center).toBe('Page {pageNumber} of {totalPages}');
      expect(headerFooterState.footer.right).toBe('');
    });

    it('should reset differentFirstPage to false', () => {
      headerFooterState.toggleDifferentFirstPage();
      expect(headerFooterState.differentFirstPage).toBe(true);

      headerFooterState.reset();

      expect(headerFooterState.differentFirstPage).toBe(false);
    });

    it('should reset firstPageHeader to empty', () => {
      headerFooterState.setFirstPageHeader('left', 'Left');
      headerFooterState.setFirstPageHeader('center', 'Center');
      headerFooterState.setFirstPageHeader('right', 'Right');

      headerFooterState.reset();

      expect(headerFooterState.firstPageHeader.left).toBe('');
      expect(headerFooterState.firstPageHeader.center).toBe('');
      expect(headerFooterState.firstPageHeader.right).toBe('');
    });

    it('should reset firstPageFooter to empty', () => {
      headerFooterState.setFirstPageFooter('left', 'Left');
      headerFooterState.setFirstPageFooter('center', 'Center');
      headerFooterState.setFirstPageFooter('right', 'Right');

      headerFooterState.reset();

      expect(headerFooterState.firstPageFooter.left).toBe('');
      expect(headerFooterState.firstPageFooter.center).toBe('');
      expect(headerFooterState.firstPageFooter.right).toBe('');
    });

    it('should reset all state at once', () => {
      // Modify all state
      headerFooterState.setHeaderSection('center', 'Header');
      headerFooterState.setFooterSection('center', 'Footer');
      headerFooterState.toggleDifferentFirstPage();
      headerFooterState.setFirstPageHeader('center', 'First Header');
      headerFooterState.setFirstPageFooter('center', 'First Footer');

      headerFooterState.reset();

      // Verify all reset
      expect(headerFooterState.header.center).toBe('');
      expect(headerFooterState.footer.center).toBe('Page {pageNumber} of {totalPages}');
      expect(headerFooterState.differentFirstPage).toBe(false);
      expect(headerFooterState.firstPageHeader.center).toBe('');
      expect(headerFooterState.firstPageFooter.center).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      headerFooterState.setHeaderSection('center', 'Value');
      headerFooterState.setHeaderSection('center', '');
      expect(headerFooterState.header.center).toBe('');
    });

    it('should handle special characters in content', () => {
      headerFooterState.setHeaderSection('center', '<script>alert("xss")</script>');
      expect(headerFooterState.header.center).toBe('<script>alert("xss")</script>');
    });

    it('should handle unicode characters', () => {
      headerFooterState.setHeaderSection('center', 'Document Title - 2024');
      expect(headerFooterState.header.center).toBe('Document Title - 2024');
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(1000);
      headerFooterState.setHeaderSection('center', longString);
      expect(headerFooterState.header.center).toBe(longString);
    });

    it('should handle page number 0', () => {
      headerFooterState.setFooterSection('center', 'Page {pageNumber}');
      const config = headerFooterState.getConfigForPage(0, 5);
      expect(config.footer.center).toBe('Page 0');
    });

    it('should handle negative page numbers', () => {
      headerFooterState.setFooterSection('center', 'Page {pageNumber}');
      const config = headerFooterState.getConfigForPage(-1, 5);
      expect(config.footer.center).toBe('Page -1');
    });

    it('should handle totalPages of 0', () => {
      headerFooterState.setFooterSection('center', 'of {totalPages}');
      const config = headerFooterState.getConfigForPage(1, 0);
      expect(config.footer.center).toBe('of 0');
    });

    it('should not interpret placeholders that are not exact matches', () => {
      headerFooterState.setFooterSection('center', '{pageNumbers} {totalPage}');
      const config = headerFooterState.getConfigForPage(3, 10);
      expect(config.footer.center).toBe('{pageNumbers} {totalPage}');
    });
  });
});
