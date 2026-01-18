/**
 * Backlinks State Management
 *
 * Provides reactive access to the backlink index with automatic persistence.
 * Loads from IndexedDB on startup, falls back to rebuilding from documents.
 */

import { browser } from '$app/environment';
import { BacklinkIndex } from '$lib/backlinks/backlink-index';
import {
  loadBacklinkIndex,
  saveBacklinkIndex,
  clearBacklinkIndex,
} from '$lib/backlinks/backlink-store';
import { getAllDocuments, type StoredDocument } from '$lib/storage/db';

// Debounce delay for saving (ms)
const SAVE_DEBOUNCE_MS = 1000;

class BacklinksState {
  // The underlying index
  private index = new BacklinkIndex();

  // State
  isLoading = $state(true);
  isInitialized = $state(false);
  error = $state<string | null>(null);

  // Version counter to trigger reactivity on index changes
  private version = $state(0);

  // Debounce timer for saving
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the backlinks index
   * Attempts to load from IndexedDB, falls back to rebuilding from documents
   */
  async initialize(): Promise<void> {
    if (!browser) return;
    if (this.isInitialized) return;

    this.isLoading = true;
    this.error = null;

    try {
      // Try to load from IndexedDB first
      const stored = await loadBacklinkIndex();

      if (stored && stored.documents.length > 0) {
        // Restore from stored index
        this.index.deserialize(stored);
      } else {
        // No cached index, rebuild from documents
        await this.rebuildFromDocuments();
      }

      this.isInitialized = true;
      this.version++;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to initialize backlinks';

      // Try to rebuild even on error
      try {
        await this.rebuildFromDocuments();
        this.isInitialized = true;
        this.error = null;
      } catch {
        // Ignore rebuild error
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Rebuild the index from all documents in the database
   */
  async rebuildFromDocuments(): Promise<void> {
    if (!browser) return;

    const documents = await getAllDocuments();
    this.index.clear();

    for (const doc of documents) {
      this.index.addDocument(doc.id, doc.title, doc.content);
    }

    this.version++;

    // Save the rebuilt index
    await this.save();
  }

  // ============================================================================
  // Document Operations
  // ============================================================================

  /**
   * Add or update a document in the index
   */
  indexDocument(doc: StoredDocument): void {
    if (!browser) return;

    // Check if document exists
    if (this.index.getDocumentTitle(doc.id) !== null) {
      this.index.updateDocument(doc.id, doc.title, doc.content);
    } else {
      this.index.addDocument(doc.id, doc.title, doc.content);
    }

    this.version++;
    this.scheduleSave();
  }

  /**
   * Remove a document from the index
   */
  removeDocument(documentId: string): void {
    if (!browser) return;

    this.index.removeDocument(documentId);
    this.version++;
    this.scheduleSave();
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get backlinks to a document
   */
  getBacklinks(documentId: string) {
    // Access version to create reactivity
    void this.version;
    return this.index.getBacklinks(documentId);
  }

  /**
   * Get outgoing links from a document
   */
  getOutgoingLinks(documentId: string) {
    void this.version;
    return this.index.getOutgoingLinks(documentId);
  }

  /**
   * Resolve a link title to a document ID
   */
  resolveLink(linkText: string): string | null {
    void this.version;
    return this.index.resolveLink(linkText);
  }

  /**
   * Get unlinked mentions of a document title
   */
  getUnlinkedMentions(documentTitle: string) {
    void this.version;
    return this.index.getUnlinkedMentions(documentTitle);
  }

  /**
   * Get orphan documents (no incoming or outgoing links)
   */
  getOrphanDocuments(): string[] {
    void this.version;
    return this.index.getOrphanDocuments();
  }

  /**
   * Get most linked documents
   */
  getMostLinkedDocuments(limit?: number) {
    void this.version;
    return this.index.getMostLinkedDocuments(limit);
  }

  /**
   * Get graph data for visualization
   */
  getGraphData() {
    void this.version;
    return this.index.getGraphData();
  }

  // ============================================================================
  // Stats
  // ============================================================================

  get documentCount(): number {
    void this.version;
    return this.index.documentCount;
  }

  get linkCount(): number {
    void this.version;
    return this.index.linkCount;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Schedule a debounced save to IndexedDB
   */
  private scheduleSave(): void {
    if (!browser) return;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      void this.save();
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Save the index to IndexedDB immediately
   */
  async save(): Promise<void> {
    if (!browser) return;

    try {
      const serialized = this.index.serialize();
      await saveBacklinkIndex(serialized);
    } catch {
      // Silently fail on save errors - will rebuild on next load
    }
  }

  /**
   * Clear the index and its persistence
   */
  async clear(): Promise<void> {
    if (!browser) return;

    this.index.clear();
    await clearBacklinkIndex();
    this.version++;
  }

  /**
   * Force rebuild the index from documents
   */
  async forceRebuild(): Promise<void> {
    if (!browser) return;

    this.isInitialized = false;
    await this.rebuildFromDocuments();
    this.isInitialized = true;
  }
}

// Export singleton instance
export const backlinksState = new BacklinksState();
