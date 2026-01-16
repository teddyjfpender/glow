/**
 * Single document state management using Svelte 5 runes.
 * Works with IndexedDB for persistence.
 * Supports multiple pages per document.
 */

import { getDocument, saveDocument, type StoredDocument } from '$lib/storage/db';

export interface PageContent {
  id: string;
  content: string;
}

interface DocumentState {
  id: string | null;
  title: string;
  pages: PageContent[];
  currentPageIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  wordCount: number;
  error: string | null;
}

function generatePageId(): string {
  return crypto.randomUUID();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateWordCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function createDocumentState(): {
  readonly id: string | null;
  readonly title: string;
  readonly content: string;
  readonly pages: PageContent[];
  readonly currentPageIndex: number;
  readonly totalPages: number;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly isLoading: boolean;
  readonly lastSaved: Date | null;
  readonly wordCount: number;
  readonly error: string | null;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  save: () => Promise<void>;
  load: (id: string) => Promise<void>;
  reset: () => void;
  addPage: () => void;
  deletePage: (index: number) => void;
  goToPage: (index: number) => void;
  nextPage: () => void;
  prevPage: () => void;
} {
  let state = $state<DocumentState>({
    id: null,
    title: 'Untitled document',
    pages: [{ id: generatePageId(), content: '' }],
    currentPageIndex: 0,
    isDirty: false,
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    wordCount: 0,
    error: null,
  });

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function setTitle(title: string): void {
    state.title = title;
    state.isDirty = true;
    scheduleSave();
  }

  function setContent(content: string): void {
    // Update the current page's content
    state.pages[state.currentPageIndex].content = content;
    // Calculate word count for all pages combined
    const allContent = state.pages.map(p => p.content).join(' ');
    state.wordCount = calculateWordCount(stripHtml(allContent));
    state.isDirty = true;
    scheduleSave();
  }

  function scheduleSave(): void {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      void save();
    }, 1000);
  }

  async function save(): Promise<void> {
    if (state.id === null || state.isSaving) {
      return;
    }

    state.isSaving = true;
    state.error = null;

    try {
      // Serialize pages to JSON for storage
      const contentToSave = JSON.stringify({
        version: 2,
        pages: state.pages,
        currentPageIndex: state.currentPageIndex,
      });

      await saveDocument({
        id: state.id,
        title: state.title,
        content: contentToSave,
      });

      state.isDirty = false;
      state.lastSaved = new Date();
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to save';
    } finally {
      state.isSaving = false;
    }
  }

  async function load(id: string): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      const doc = await getDocument(id);

      if (doc === null) {
        state.error = 'Document not found';
        return;
      }

      state.id = doc.id;
      state.title = doc.title;

      // Try to parse as multi-page format, fall back to legacy single-page
      let pages: PageContent[];
      let currentPageIndex = 0;

      try {
        const parsed = JSON.parse(doc.content);
        if (parsed.version === 2 && Array.isArray(parsed.pages)) {
          pages = parsed.pages;
          currentPageIndex = parsed.currentPageIndex ?? 0;
        } else {
          // Legacy format - single page
          pages = [{ id: generatePageId(), content: doc.content }];
        }
      } catch {
        // Not JSON - legacy single-page content
        pages = [{ id: generatePageId(), content: doc.content }];
      }

      state.pages = pages;
      state.currentPageIndex = Math.min(currentPageIndex, pages.length - 1);

      const allContent = pages.map(p => p.content).join(' ');
      state.wordCount = calculateWordCount(stripHtml(allContent));
      state.lastSaved = new Date(doc.modifiedAt);
      state.isDirty = false;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to load document';
    } finally {
      state.isLoading = false;
    }
  }

  function reset(): void {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
    }
    state.id = null;
    state.title = 'Untitled document';
    state.pages = [{ id: generatePageId(), content: '' }];
    state.currentPageIndex = 0;
    state.isDirty = false;
    state.isSaving = false;
    state.isLoading = false;
    state.lastSaved = null;
    state.wordCount = 0;
    state.error = null;
  }

  function addPage(): void {
    const newPage: PageContent = { id: generatePageId(), content: '' };
    // Insert after current page
    state.pages.splice(state.currentPageIndex + 1, 0, newPage);
    state.currentPageIndex = state.currentPageIndex + 1;
    state.isDirty = true;
    scheduleSave();
  }

  function deletePage(index: number): void {
    if (state.pages.length <= 1) {
      // Cannot delete the last page
      return;
    }
    if (index < 0 || index >= state.pages.length) {
      return;
    }
    state.pages.splice(index, 1);
    // Adjust currentPageIndex if needed
    if (state.currentPageIndex >= state.pages.length) {
      state.currentPageIndex = state.pages.length - 1;
    } else if (state.currentPageIndex > index) {
      state.currentPageIndex = state.currentPageIndex - 1;
    }
    state.isDirty = true;
    scheduleSave();
  }

  function goToPage(index: number): void {
    if (index < 0 || index >= state.pages.length) {
      return;
    }
    state.currentPageIndex = index;
  }

  function nextPage(): void {
    if (state.currentPageIndex < state.pages.length - 1) {
      state.currentPageIndex = state.currentPageIndex + 1;
    }
  }

  function prevPage(): void {
    if (state.currentPageIndex > 0) {
      state.currentPageIndex = state.currentPageIndex - 1;
    }
  }

  return {
    get id(): string | null {
      return state.id;
    },
    get title(): string {
      return state.title;
    },
    get content(): string {
      // Return current page content
      return state.pages[state.currentPageIndex]?.content ?? '';
    },
    get pages(): PageContent[] {
      return state.pages;
    },
    get currentPageIndex(): number {
      return state.currentPageIndex;
    },
    get totalPages(): number {
      return state.pages.length;
    },
    get isDirty(): boolean {
      return state.isDirty;
    },
    get isSaving(): boolean {
      return state.isSaving;
    },
    get isLoading(): boolean {
      return state.isLoading;
    },
    get lastSaved(): Date | null {
      return state.lastSaved;
    },
    get wordCount(): number {
      return state.wordCount;
    },
    get error(): string | null {
      return state.error;
    },
    setTitle,
    setContent,
    save,
    load,
    reset,
    addPage,
    deletePage,
    goToPage,
    nextPage,
    prevPage,
  };
}

export const documentState = createDocumentState();
