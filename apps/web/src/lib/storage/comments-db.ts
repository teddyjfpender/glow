/**
 * IndexedDB storage for comments.
 * Provides a simple async API for comment CRUD operations.
 */

import { browser } from '$app/environment';
import { openDB, COMMENTS_STORE_NAME } from './db';
import type { Comment, CommentId } from '$lib/comments/types';

/**
 * Get all comments for a specific document.
 * Returns comments sorted by createdAt in ascending order.
 */
export async function getAllComments(documentId: string): Promise<Comment[]> {
  if (!browser) {
    return [];
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMMENTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(COMMENTS_STORE_NAME);
    const index = store.index('documentId');
    const request = index.openCursor(IDBKeyRange.only(documentId));

    const comments: Comment[] = [];

    request.onsuccess = (): void => {
      const cursor = request.result;
      if (cursor !== null) {
        comments.push(cursor.value as Comment);
        cursor.continue();
      } else {
        // Sort by createdAt ascending
        comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        resolve(comments);
      }
    };

    request.onerror = (): void => {
      reject(new Error('Failed to get comments'));
    };
  });
}

/**
 * Get a single comment by its ID.
 */
export async function getComment(id: CommentId): Promise<Comment | null> {
  if (!browser) {
    return null;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMMENTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(COMMENTS_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = (): void => {
      resolve((request.result as Comment | undefined) ?? null);
    };

    request.onerror = (): void => {
      reject(new Error('Failed to get comment'));
    };
  });
}

/**
 * Save a comment (create or update).
 * If the comment already exists, it will be updated.
 */
export async function saveComment(comment: Comment): Promise<void> {
  if (!browser) {
    return;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMMENTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(COMMENTS_STORE_NAME);
    const request = store.put(comment);

    request.onsuccess = (): void => {
      resolve();
    };

    request.onerror = (): void => {
      reject(new Error('Failed to save comment'));
    };
  });
}

/**
 * Delete a comment by its ID.
 */
export async function deleteComment(id: CommentId): Promise<void> {
  if (!browser) {
    return;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMMENTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(COMMENTS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = (): void => {
      resolve();
    };

    request.onerror = (): void => {
      reject(new Error('Failed to delete comment'));
    };
  });
}

/**
 * Delete all comments for a specific document.
 * Useful when deleting a document.
 */
export async function deleteAllCommentsForDocument(documentId: string): Promise<void> {
  if (!browser) {
    return;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMMENTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(COMMENTS_STORE_NAME);
    const index = store.index('documentId');
    const request = index.openCursor(IDBKeyRange.only(documentId));

    request.onsuccess = (): void => {
      const cursor = request.result;
      if (cursor !== null) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = (): void => {
      reject(new Error('Failed to delete comments for document'));
    };
  });
}
