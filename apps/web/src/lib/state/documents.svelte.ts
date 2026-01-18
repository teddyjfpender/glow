/**
 * Documents list state management using Svelte 5 runes.
 */

import {
  getAllDocuments,
  createDocument,
  deleteDocument,
  duplicateDocument,
  type StoredDocument,
} from '$lib/storage/db';
import { backlinksState } from '$lib/state/backlinks.svelte';

interface DocumentsState {
  documents: StoredDocument[];
  isLoading: boolean;
  error: string | null;
}

function createDocumentsState(): {
  readonly documents: StoredDocument[];
  readonly isLoading: boolean;
  readonly error: string | null;
  load: () => Promise<void>;
  create: (title?: string) => Promise<StoredDocument>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<StoredDocument>;
} {
  let state = $state<DocumentsState>({
    documents: [],
    isLoading: true,
    error: null,
  });

  async function load(): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      const docs = await getAllDocuments();
      state.documents = docs;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to load documents';
    } finally {
      state.isLoading = false;
    }
  }

  async function create(title?: string): Promise<StoredDocument> {
    const doc = await createDocument(title);
    state.documents = [doc, ...state.documents];
    // Add to backlinks index
    backlinksState.indexDocument(doc);
    return doc;
  }

  async function remove(id: string): Promise<void> {
    await deleteDocument(id);
    state.documents = state.documents.filter((d) => d.id !== id);
    // Remove from backlinks index
    backlinksState.removeDocument(id);
  }

  async function duplicate(id: string): Promise<StoredDocument> {
    const doc = await duplicateDocument(id);
    state.documents = [doc, ...state.documents];
    // Add to backlinks index
    backlinksState.indexDocument(doc);
    return doc;
  }

  return {
    get documents(): StoredDocument[] {
      return state.documents;
    },
    get isLoading(): boolean {
      return state.isLoading;
    },
    get error(): string | null {
      return state.error;
    },
    load,
    create,
    remove,
    duplicate,
  };
}

export const documentsState = createDocumentsState();
