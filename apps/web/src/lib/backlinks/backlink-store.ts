/**
 * IndexedDB persistence for BacklinkIndex
 *
 * Stores the backlink index for fast startup and persistence across sessions.
 */

import { browser } from '$app/environment';
import { openDB, BACKLINKS_STORE_NAME } from '$lib/storage/db';

// Serializable format for IndexedDB storage
export interface SerializedLink {
  sourceId: string;
  targetId: string | null;
  targetTitle: string;
  context: string;
  position: number;
}

export interface SerializedDocument {
  id: string;
  title: string;
  content: string;
}

export interface SerializedIndex {
  version: 1;
  documents: SerializedDocument[];
  links: SerializedLink[];
  lastUpdated: string;
}

// Singleton key for the index
const INDEX_KEY = 'main';

/**
 * Save the serialized index to IndexedDB
 */
export async function saveBacklinkIndex(index: SerializedIndex): Promise<void> {
  if (!browser) return;

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKLINKS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BACKLINKS_STORE_NAME);

    const request = store.put({
      key: INDEX_KEY,
      ...index,
    });

    request.onsuccess = (): void => {
      resolve();
    };

    request.onerror = (): void => {
      reject(new Error('Failed to save backlink index'));
    };
  });
}

/**
 * Load the serialized index from IndexedDB
 */
export async function loadBacklinkIndex(): Promise<SerializedIndex | null> {
  if (!browser) return null;

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKLINKS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BACKLINKS_STORE_NAME);
    const request = store.get(INDEX_KEY);

    request.onsuccess = (): void => {
      const result = request.result;
      if (result) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { key, ...index } = result;
        resolve(index as SerializedIndex);
      } else {
        resolve(null);
      }
    };

    request.onerror = (): void => {
      reject(new Error('Failed to load backlink index'));
    };
  });
}

/**
 * Clear the backlink index from IndexedDB
 */
export async function clearBacklinkIndex(): Promise<void> {
  if (!browser) return;

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKLINKS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BACKLINKS_STORE_NAME);
    const request = store.delete(INDEX_KEY);

    request.onsuccess = (): void => {
      resolve();
    };

    request.onerror = (): void => {
      reject(new Error('Failed to clear backlink index'));
    };
  });
}
