/**
 * IndexedDB storage for multiple documents.
 * Provides a simple async API for document CRUD operations.
 */

const DB_NAME = 'glow-docs';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  previewText: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise !== null) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (): void => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (): void => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event): void => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('modifiedAt', 'modifiedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });

  return dbPromise;
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

function generatePreview(content: string, maxLength = 200): string {
  const text = stripHtml(content);
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('modifiedAt');
    const request = index.openCursor(null, 'prev'); // Sort by modifiedAt descending

    const documents: StoredDocument[] = [];

    request.onsuccess = (): void => {
      const cursor = request.result;
      if (cursor !== null) {
        documents.push(cursor.value as StoredDocument);
        cursor.continue();
      } else {
        resolve(documents);
      }
    };

    request.onerror = (): void => {
      reject(new Error('Failed to get documents'));
    };
  });
}

export async function getDocument(id: string): Promise<StoredDocument | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = (): void => {
      resolve((request.result as StoredDocument | undefined) ?? null);
    };

    request.onerror = (): void => {
      reject(new Error('Failed to get document'));
    };
  });
}

export async function createDocument(title = 'Untitled document'): Promise<StoredDocument> {
  const db = await openDB();
  const now = new Date().toISOString();

  const doc: StoredDocument = {
    id: generateId(),
    title,
    content: '',
    createdAt: now,
    modifiedAt: now,
    previewText: '',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(doc);

    request.onsuccess = (): void => {
      resolve(doc);
    };

    request.onerror = (): void => {
      reject(new Error('Failed to create document'));
    };
  });
}

export async function saveDocument(doc: Partial<StoredDocument> & { id: string }): Promise<void> {
  const db = await openDB();
  const existing = await getDocument(doc.id);

  if (existing === null) {
    throw new Error('Document not found');
  }

  const updated: StoredDocument = {
    ...existing,
    ...doc,
    modifiedAt: new Date().toISOString(),
    previewText: doc.content !== undefined ? generatePreview(doc.content) : existing.previewText,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = (): void => {
      resolve();
    };

    request.onerror = (): void => {
      reject(new Error('Failed to save document'));
    };
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = (): void => {
      resolve();
    };

    request.onerror = (): void => {
      reject(new Error('Failed to delete document'));
    };
  });
}

export async function duplicateDocument(id: string): Promise<StoredDocument> {
  const original = await getDocument(id);

  if (original === null) {
    throw new Error('Document not found');
  }

  const now = new Date().toISOString();

  const doc: StoredDocument = {
    id: generateId(),
    title: `${original.title} (Copy)`,
    content: original.content,
    createdAt: now,
    modifiedAt: now,
    previewText: original.previewText,
  };

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(doc);

    request.onsuccess = (): void => {
      resolve(doc);
    };

    request.onerror = (): void => {
      reject(new Error('Failed to duplicate document'));
    };
  });
}
