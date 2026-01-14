/**
 * Single document state management using Svelte 5 runes.
 * Works with IndexedDB for persistence.
 */

import { getDocument, saveDocument, type StoredDocument } from '$lib/storage/db';

interface DocumentState {
  id: string | null;
  title: string;
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  wordCount: number;
  error: string | null;
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
} {
  let state = $state<DocumentState>({
    id: null,
    title: 'Untitled document',
    content: '',
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
    state.content = content;
    state.wordCount = calculateWordCount(stripHtml(content));
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
      await saveDocument({
        id: state.id,
        title: state.title,
        content: state.content,
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
      state.content = doc.content;
      state.wordCount = calculateWordCount(stripHtml(doc.content));
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
    state.content = '';
    state.isDirty = false;
    state.isSaving = false;
    state.isLoading = false;
    state.lastSaved = null;
    state.wordCount = 0;
    state.error = null;
  }

  return {
    get id(): string | null {
      return state.id;
    },
    get title(): string {
      return state.title;
    },
    get content(): string {
      return state.content;
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
  };
}

export const documentState = createDocumentState();
