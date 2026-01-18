/**
 * Single document state management using Svelte 5 runes.
 * Works with IndexedDB for persistence.
 * Supports document tabs for organizing content.
 */

import { getDocument, saveDocument, type StoredDocument } from '$lib/storage/db';
import { tabsState } from '$lib/state/tabs.svelte';
import { backlinksState } from '$lib/state/backlinks.svelte';
import type { Tab, TabsData } from '$lib/types/tabs';

// Legacy interface for migration
interface PageContent {
  id: string;
  content: string;
}

interface DocumentState {
  id: string | null;
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  wordCount: number;
  error: string | null;
}

function generateId(): string {
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

/**
 * Migrate content from various formats to TabsData (version 3).
 */
function migrateContent(rawContent: string): TabsData {
  try {
    const parsed = JSON.parse(rawContent);

    // Version 3: Native tabs format
    if (parsed.version === 3 && Array.isArray(parsed.tabs)) {
      return parsed as TabsData;
    }

    // Version 2: Pages format -> migrate each page to a tab
    if (parsed.version === 2 && Array.isArray(parsed.pages)) {
      const pages = parsed.pages as PageContent[];
      const tabs: Tab[] = pages.map((page, index) => ({
        id: page.id || generateId(),
        name: pages.length === 1 ? 'Tab 1' : `Page ${index + 1}`,
        content: page.content,
        parentId: null,
        order: index,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      return {
        version: 3,
        tabs,
        activeTabId: tabs[0]?.id ?? '',
        expandedTabIds: [],
      };
    }

    // Unknown JSON format - treat as single tab content
    return createSingleTabData(rawContent);
  } catch {
    // Plain HTML content - wrap in single tab
    return createSingleTabData(rawContent);
  }
}

/**
 * Create TabsData with a single tab containing the given content.
 */
function createSingleTabData(content: string): TabsData {
  const tabId = generateId();
  return {
    version: 3,
    tabs: [
      {
        id: tabId,
        name: 'Tab 1',
        content,
        parentId: null,
        order: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      },
    ],
    activeTabId: tabId,
    expandedTabIds: [],
  };
}

function createDocumentState(): {
  readonly id: string | null;
  readonly title: string;
  readonly content: string;
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
  scheduleSave: () => void;
} {
  let state = $state<DocumentState>({
    id: null,
    title: 'Untitled document',
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
    // Update the active tab's content
    const activeTabId = tabsState.activeTabId;
    if (activeTabId !== null) {
      tabsState.updateTabContent(activeTabId, content);
    }

    // Calculate word count for all tabs combined
    const allContent = tabsState.tabsArray.map((t) => t.content).join(' ');
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
      // Serialize tabs to JSON for storage
      const tabsData = tabsState.serialize();
      const contentToSave = JSON.stringify(tabsData);

      await saveDocument({
        id: state.id,
        title: state.title,
        content: contentToSave,
      });

      // Update backlinks index with the saved document
      backlinksState.indexDocument({
        id: state.id,
        title: state.title,
        content: contentToSave,
        createdAt: '',
        modifiedAt: new Date().toISOString(),
        previewText: '',
      });

      state.isDirty = false;
      tabsState.markClean();
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

      // Migrate content to tabs format if needed
      const tabsData = migrateContent(doc.content);

      // Initialize tabs state
      tabsState.initialize(tabsData);

      // Calculate word count for all tabs combined
      const allContent = tabsData.tabs.map((t) => t.content).join(' ');
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
    state.isDirty = false;
    state.isSaving = false;
    state.isLoading = false;
    state.lastSaved = null;
    state.wordCount = 0;
    state.error = null;
    // Also reset tabs state
    tabsState.reset();
  }

  return {
    get id(): string | null {
      return state.id;
    },
    get title(): string {
      return state.title;
    },
    get content(): string {
      // Return active tab's content
      return tabsState.activeTab?.content ?? '';
    },
    get isDirty(): boolean {
      return state.isDirty || tabsState.isDirty;
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
    scheduleSave,
  };
}

export const documentState = createDocumentState();
