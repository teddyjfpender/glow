/**
 * Header/Footer state management for multi-page documents using Svelte 5 runes.
 * Supports different configurations for first page vs. subsequent pages.
 */

export interface HeaderFooterSection {
  left: string;
  center: string;
  right: string;
}

export interface HeaderFooterConfig {
  header: HeaderFooterSection;
  footer: HeaderFooterSection;
  differentFirstPage: boolean;
  firstPageHeader?: HeaderFooterSection;
  firstPageFooter?: HeaderFooterSection;
}

interface HeaderFooterState {
  header: HeaderFooterSection;
  footer: HeaderFooterSection;
  differentFirstPage: boolean;
  firstPageHeader: HeaderFooterSection;
  firstPageFooter: HeaderFooterSection;
}

function createDefaultSection(): HeaderFooterSection {
  return {
    left: '',
    center: '',
    right: '',
  };
}

function createDefaultFooterSection(): HeaderFooterSection {
  return {
    left: '',
    center: 'Page {pageNumber} of {totalPages}',
    right: '',
  };
}

function createHeaderFooterState(): {
  readonly header: HeaderFooterSection;
  readonly footer: HeaderFooterSection;
  readonly differentFirstPage: boolean;
  readonly firstPageHeader: HeaderFooterSection;
  readonly firstPageFooter: HeaderFooterSection;
  readonly config: HeaderFooterConfig;
  setHeaderSection: (section: 'left' | 'center' | 'right', value: string) => void;
  setFooterSection: (section: 'left' | 'center' | 'right', value: string) => void;
  setFirstPageHeader: (section: 'left' | 'center' | 'right', value: string) => void;
  setFirstPageFooter: (section: 'left' | 'center' | 'right', value: string) => void;
  toggleDifferentFirstPage: () => void;
  reset: () => void;
  getConfigForPage: (pageNumber: number, totalPages?: number) => { header: HeaderFooterSection; footer: HeaderFooterSection };
} {
  let state = $state<HeaderFooterState>({
    header: createDefaultSection(),
    footer: createDefaultFooterSection(),
    differentFirstPage: false,
    firstPageHeader: createDefaultSection(),
    firstPageFooter: createDefaultSection(),
  });

  function setHeaderSection(section: 'left' | 'center' | 'right', value: string): void {
    state.header[section] = value;
  }

  function setFooterSection(section: 'left' | 'center' | 'right', value: string): void {
    state.footer[section] = value;
  }

  function setFirstPageHeader(section: 'left' | 'center' | 'right', value: string): void {
    state.firstPageHeader[section] = value;
  }

  function setFirstPageFooter(section: 'left' | 'center' | 'right', value: string): void {
    state.firstPageFooter[section] = value;
  }

  function toggleDifferentFirstPage(): void {
    state.differentFirstPage = !state.differentFirstPage;
  }

  function reset(): void {
    state.header = createDefaultSection();
    state.footer = createDefaultFooterSection();
    state.differentFirstPage = false;
    state.firstPageHeader = createDefaultSection();
    state.firstPageFooter = createDefaultSection();
  }

  function processPlaceholders(text: string, pageNumber: number, totalPages: number): string {
    return text
      .replace(/\{pageNumber\}/g, String(pageNumber))
      .replace(/\{totalPages\}/g, String(totalPages));
  }

  function processSection(section: HeaderFooterSection, pageNumber: number, totalPages: number): HeaderFooterSection {
    return {
      left: processPlaceholders(section.left, pageNumber, totalPages),
      center: processPlaceholders(section.center, pageNumber, totalPages),
      right: processPlaceholders(section.right, pageNumber, totalPages),
    };
  }

  function getConfigForPage(pageNumber: number, totalPages: number = 1): { header: HeaderFooterSection; footer: HeaderFooterSection } {
    const isFirstPage = pageNumber === 1;

    if (state.differentFirstPage && isFirstPage) {
      return {
        header: processSection(state.firstPageHeader, pageNumber, totalPages),
        footer: processSection(state.firstPageFooter, pageNumber, totalPages),
      };
    }

    return {
      header: processSection(state.header, pageNumber, totalPages),
      footer: processSection(state.footer, pageNumber, totalPages),
    };
  }

  return {
    get header(): HeaderFooterSection {
      return state.header;
    },
    get footer(): HeaderFooterSection {
      return state.footer;
    },
    get differentFirstPage(): boolean {
      return state.differentFirstPage;
    },
    get firstPageHeader(): HeaderFooterSection {
      return state.firstPageHeader;
    },
    get firstPageFooter(): HeaderFooterSection {
      return state.firstPageFooter;
    },
    get config(): HeaderFooterConfig {
      return {
        header: state.header,
        footer: state.footer,
        differentFirstPage: state.differentFirstPage,
        firstPageHeader: state.differentFirstPage ? state.firstPageHeader : undefined,
        firstPageFooter: state.differentFirstPage ? state.firstPageFooter : undefined,
      };
    },
    setHeaderSection,
    setFooterSection,
    setFirstPageHeader,
    setFirstPageFooter,
    toggleDifferentFirstPage,
    reset,
    getConfigForPage,
  };
}

export const headerFooterState = createHeaderFooterState();
