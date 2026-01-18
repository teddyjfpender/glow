/**
 * BacklinkIndex - Index for tracking document links and backlinks
 *
 * Provides efficient tracking of wiki-style [[links]] between documents,
 * including backlink retrieval, unlinked mention detection, and graph statistics.
 */

import { LinkParser } from './link-parser';
import type { SerializedIndex, SerializedDocument, SerializedLink } from './backlink-store';

// ============================================================================
// Types
// ============================================================================

export interface DocumentLink {
  sourceId: string;
  targetId: string | null;
  targetTitle: string;
  context: string;
  position: number;
}

export interface BacklinkResult {
  documentId: string;
  documentTitle: string;
  context: string;
  position: number;
}

export interface UnlinkedMention {
  documentId: string;
  documentTitle: string;
  mentionText: string;
  context: string;
  position: number;
}

interface IndexedDocument {
  id: string;
  title: string;
  content: string;
}

// Re-export for convenience
export type { SerializedIndex, SerializedDocument, SerializedLink };

// ============================================================================
// BacklinkIndex Class
// ============================================================================

export class BacklinkIndex {
  // Document storage
  private documents = new Map<string, IndexedDocument>();

  // Title to ID mapping (lowercase for case-insensitive lookup)
  private titleToId = new Map<string, string>();

  // Original title storage (preserves case)
  private idToTitle = new Map<string, string>();

  // Outgoing links: documentId -> Set of target titles
  private outgoingLinks = new Map<string, DocumentLink[]>();

  // Incoming links: documentId -> Set of source document IDs
  private incomingLinks = new Map<string, Set<string>>();

  // Link parser instance
  private parser = new LinkParser();

  // ============================================================================
  // Document Indexing
  // ============================================================================

  /**
   * Add a document to the index and extract its links
   */
  addDocument(id: string, title: string, content: string): void {
    // Store document
    this.documents.set(id, { id, title, content });
    this.titleToId.set(title.toLowerCase(), id);
    this.idToTitle.set(id, title);

    // Extract and index links
    this.indexLinks(id, content);

    // Update existing links that might now resolve to this document
    this.resolveExistingLinks(title, id);
  }

  /**
   * Update a document in the index
   */
  updateDocument(id: string, title: string, content: string): void {
    // Remove old links from this document
    this.removeLinksFromDocument(id);

    // Update document data
    const oldDoc = this.documents.get(id);
    if (oldDoc && oldDoc.title !== title) {
      // Title changed, update title index
      this.titleToId.delete(oldDoc.title.toLowerCase());
      this.unresolveLinksToTitle(oldDoc.title);
    }

    this.documents.set(id, { id, title, content });
    this.titleToId.set(title.toLowerCase(), id);
    this.idToTitle.set(id, title);

    // Re-extract links
    this.indexLinks(id, content);

    // Update existing links that might now resolve to this document
    this.resolveExistingLinks(title, id);
  }

  /**
   * Remove a document from the index
   */
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Remove from title index
    this.titleToId.delete(doc.title.toLowerCase());
    this.idToTitle.delete(id);

    // Remove outgoing links (and update incoming for targets)
    this.removeLinksFromDocument(id);

    // Update any links that pointed to this document (set targetId to null)
    this.unresolveLinksToDocument(id);

    // Remove from incoming links
    this.incomingLinks.delete(id);

    // Remove document
    this.documents.delete(id);
  }

  // ============================================================================
  // Link Resolution
  // ============================================================================

  /**
   * Resolve a link text to a document ID
   * Supports exact match, case-insensitive match, and partial match
   */
  resolveLink(linkText: string): string | null {
    const normalizedText = linkText.toLowerCase();

    // 1. Try exact match (case-insensitive)
    const exactMatch = this.titleToId.get(normalizedText);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. Try partial match (title contains linkText)
    let partialMatch: string | null = null;
    for (const [storedTitle, docId] of this.titleToId.entries()) {
      if (storedTitle.includes(normalizedText)) {
        // Prefer shorter matches (more specific)
        if (!partialMatch) {
          partialMatch = docId;
        }
      }
    }

    return partialMatch;
  }

  // ============================================================================
  // Backlink Retrieval
  // ============================================================================

  /**
   * Get all documents that link TO the specified document
   */
  getBacklinks(documentId: string): BacklinkResult[] {
    const results: BacklinkResult[] = [];
    const sourceIds = this.incomingLinks.get(documentId);

    if (!sourceIds) {
      return results;
    }

    for (const sourceId of sourceIds) {
      const sourceDoc = this.documents.get(sourceId);
      const sourceLinks = this.outgoingLinks.get(sourceId);

      if (!sourceDoc || !sourceLinks) continue;

      // Find links from this source that point to our target
      for (const link of sourceLinks) {
        if (link.targetId === documentId) {
          results.push({
            documentId: sourceId,
            documentTitle: sourceDoc.title,
            context: link.context,
            position: link.position,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get all links FROM the specified document
   */
  getOutgoingLinks(documentId: string): DocumentLink[] {
    return this.outgoingLinks.get(documentId) || [];
  }

  // ============================================================================
  // Unlinked Mentions
  // ============================================================================

  /**
   * Find text mentions of a document title that are not already linked
   */
  getUnlinkedMentions(documentTitle: string): UnlinkedMention[] {
    const mentions: UnlinkedMention[] = [];
    const targetId = this.resolveLink(documentTitle);
    const searchPattern = new RegExp(this.escapeRegex(documentTitle), 'gi');

    for (const [docId, doc] of this.documents.entries()) {
      // Skip the document itself
      if (targetId && docId === targetId) continue;

      // Skip documents that already link to the target
      const docLinks = this.outgoingLinks.get(docId) || [];
      const alreadyLinks = docLinks.some(
        (link) =>
          link.targetTitle.toLowerCase() === documentTitle.toLowerCase() ||
          link.targetId === targetId
      );

      if (alreadyLinks) continue;

      // Search for mentions in content
      const content = this.stripHtml(doc.content);
      let match: RegExpExecArray | null;

      // Reset regex
      searchPattern.lastIndex = 0;

      while ((match = searchPattern.exec(content)) !== null) {
        // Make sure this isn't inside a link already
        if (!this.isInsideLink(doc.content, match.index)) {
          mentions.push({
            documentId: docId,
            documentTitle: doc.title,
            mentionText: match[0],
            context: this.extractContext(content, match.index, match[0].length),
            position: match.index,
          });
        }
      }
    }

    return mentions;
  }

  // ============================================================================
  // Graph Statistics
  // ============================================================================

  /**
   * Get documents with no incoming or outgoing links
   */
  getOrphanDocuments(): string[] {
    const orphans: string[] = [];

    for (const docId of this.documents.keys()) {
      const outgoing = this.outgoingLinks.get(docId) || [];
      const incoming = this.incomingLinks.get(docId) || new Set();

      // Filter outgoing to only count resolved links
      const hasOutgoing = outgoing.length > 0;
      const hasIncoming = incoming.size > 0;

      if (!hasOutgoing && !hasIncoming) {
        orphans.push(docId);
      }
    }

    return orphans;
  }

  /**
   * Get documents sorted by number of incoming links
   */
  getMostLinkedDocuments(limit?: number): { id: string; count: number }[] {
    const counts: { id: string; count: number }[] = [];

    for (const docId of this.documents.keys()) {
      const incoming = this.incomingLinks.get(docId);
      const count = incoming ? incoming.size : 0;
      counts.push({ id: docId, count });
    }

    // Sort by count descending
    counts.sort((a, b) => b.count - a.count);

    // Apply limit if specified
    if (limit !== undefined) {
      return counts.slice(0, limit);
    }

    return counts;
  }

  // ============================================================================
  // Clear and Reset
  // ============================================================================

  /**
   * Clear all data from the index
   */
  clear(): void {
    this.documents.clear();
    this.titleToId.clear();
    this.idToTitle.clear();
    this.outgoingLinks.clear();
    this.incomingLinks.clear();
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize the index to a format suitable for IndexedDB storage
   */
  serialize(): SerializedIndex {
    const documents: SerializedDocument[] = [];
    const links: SerializedLink[] = [];

    // Serialize documents
    for (const doc of this.documents.values()) {
      documents.push({
        id: doc.id,
        title: doc.title,
        content: doc.content,
      });
    }

    // Serialize all links
    for (const docLinks of this.outgoingLinks.values()) {
      for (const link of docLinks) {
        links.push({
          sourceId: link.sourceId,
          targetId: link.targetId,
          targetTitle: link.targetTitle,
          context: link.context,
          position: link.position,
        });
      }
    }

    return {
      version: 1,
      documents,
      links,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Restore the index from serialized data
   */
  deserialize(data: SerializedIndex): void {
    // Clear existing data
    this.clear();

    // Restore documents and build title map
    for (const doc of data.documents) {
      this.documents.set(doc.id, {
        id: doc.id,
        title: doc.title,
        content: doc.content,
      });
      this.titleToId.set(doc.title.toLowerCase(), doc.id);
      this.idToTitle.set(doc.id, doc.title);
    }

    // Restore links and rebuild incoming link map
    for (const link of data.links) {
      const sourceId = link.sourceId;

      // Add to outgoing links
      if (!this.outgoingLinks.has(sourceId)) {
        this.outgoingLinks.set(sourceId, []);
      }
      this.outgoingLinks.get(sourceId)!.push({
        sourceId: link.sourceId,
        targetId: link.targetId,
        targetTitle: link.targetTitle,
        context: link.context,
        position: link.position,
      });

      // Update incoming links
      if (link.targetId) {
        if (!this.incomingLinks.has(link.targetId)) {
          this.incomingLinks.set(link.targetId, new Set());
        }
        this.incomingLinks.get(link.targetId)!.add(sourceId);
      }
    }
  }

  /**
   * Check if the index is empty
   */
  isEmpty(): boolean {
    return this.documents.size === 0;
  }

  /**
   * Get all documents with their link counts for graph visualization
   */
  getGraphData(): {
    nodes: Array<{ id: string; title: string; linkCount: number }>;
    edges: Array<{ source: string; target: string }>;
  } {
    const nodes: Array<{ id: string; title: string; linkCount: number }> = [];
    const edges: Array<{ source: string; target: string }> = [];

    // Build nodes with incoming link counts
    for (const doc of this.documents.values()) {
      const incoming = this.incomingLinks.get(doc.id);
      nodes.push({
        id: doc.id,
        title: doc.title,
        linkCount: incoming ? incoming.size : 0,
      });
    }

    // Build edges (only resolved links)
    for (const [sourceId, links] of this.outgoingLinks.entries()) {
      for (const link of links) {
        if (link.targetId) {
          edges.push({
            source: sourceId,
            target: link.targetId,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Get a document's title by ID
   */
  getDocumentTitle(id: string): string | null {
    return this.idToTitle.get(id) ?? null;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get the number of indexed documents
   */
  get documentCount(): number {
    return this.documents.size;
  }

  /**
   * Get the total number of links
   */
  get linkCount(): number {
    let count = 0;
    for (const links of this.outgoingLinks.values()) {
      count += links.length;
    }
    return count;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract and index links from document content
   */
  private indexLinks(documentId: string, content: string): void {
    const extractedLinks = this.extractLinksFromContent(content);
    const links: DocumentLink[] = [];
    const strippedContent = this.stripHtml(content);

    for (const link of extractedLinks) {
      // Use the stored document ID if available, otherwise try to resolve
      const targetId = link.documentId || this.resolveLink(link.title);

      const docLink: DocumentLink = {
        sourceId: documentId,
        targetId,
        targetTitle: link.title,
        context: this.extractContext(strippedContent, link.position, link.title.length),
        position: link.position,
      };

      links.push(docLink);

      // Update incoming links for the target
      if (targetId) {
        if (!this.incomingLinks.has(targetId)) {
          this.incomingLinks.set(targetId, new Set());
        }
        this.incomingLinks.get(targetId)!.add(documentId);
      }
    }

    this.outgoingLinks.set(documentId, links);
  }

  /**
   * Extract links from document content (handles TabsData JSON and HTML)
   */
  private extractLinksFromContent(content: string): { documentId: string | null; title: string; position: number }[] {
    const allLinks: { documentId: string | null; title: string; position: number }[] = [];

    try {
      // Try to parse as TabsData JSON
      const tabsData = JSON.parse(content) as { version?: number; tabs?: { content?: string }[] };

      if (tabsData.version === 3 && Array.isArray(tabsData.tabs)) {
        // Extract links from each tab's content
        for (const tab of tabsData.tabs) {
          if (tab.content) {
            const links = this.extractLinksFromHtml(tab.content);
            allLinks.push(...links);
          }
        }
      } else if (typeof content === 'string') {
        // Legacy format - treat content as HTML directly
        const links = this.extractLinksFromHtml(content);
        allLinks.push(...links);
      }
    } catch {
      // If JSON parse fails, try treating as raw HTML
      const links = this.extractLinksFromHtml(content);
      allLinks.push(...links);
    }

    return allLinks;
  }

  /**
   * Extract links from HTML content
   * Links are stored as <span data-internal-link data-document-id="..." data-title="...">
   */
  private extractLinksFromHtml(html: string): { documentId: string | null; title: string; position: number }[] {
    const links: { documentId: string | null; title: string; position: number }[] = [];

    // Match data-internal-link spans with their attributes
    const linkPattern = /<span[^>]*data-internal-link[^>]*>/g;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(html)) !== null) {
      const spanHtml = match[0];

      // Extract document-id (may be empty or missing for unresolved links)
      const docIdPattern = /data-document-id="([^"]*)"/;
      const docIdMatch = docIdPattern.exec(spanHtml);
      const documentId = docIdMatch?.[1] || null;

      // Extract title
      const titlePattern = /data-title="([^"]*)"/;
      const titleMatch = titlePattern.exec(spanHtml);
      const title = titleMatch?.[1] || '';

      if (title) {
        links.push({
          documentId: documentId || null,
          title,
          position: match.index
        });
      }
    }

    return links;
  }

  /**
   * Remove all outgoing links from a document
   */
  private removeLinksFromDocument(documentId: string): void {
    const links = this.outgoingLinks.get(documentId);
    if (!links) return;

    // Remove this document from incoming links of all targets
    for (const link of links) {
      if (link.targetId) {
        const incoming = this.incomingLinks.get(link.targetId);
        if (incoming) {
          incoming.delete(documentId);
          if (incoming.size === 0) {
            this.incomingLinks.delete(link.targetId);
          }
        }
      }
    }

    this.outgoingLinks.delete(documentId);
  }

  /**
   * Update existing links when a new document is added that might be their target
   */
  private resolveExistingLinks(title: string, documentId: string): void {
    const normalizedTitle = title.toLowerCase();

    for (const [sourceId, links] of this.outgoingLinks.entries()) {
      for (const link of links) {
        // If this link was unresolved and matches the new document
        if (link.targetId === null && link.targetTitle.toLowerCase() === normalizedTitle) {
          link.targetId = documentId;

          // Add to incoming links
          if (!this.incomingLinks.has(documentId)) {
            this.incomingLinks.set(documentId, new Set());
          }
          this.incomingLinks.get(documentId)!.add(sourceId);
        }
      }
    }
  }

  /**
   * Unresolve links when a document is removed
   */
  private unresolveLinksToDocument(documentId: string): void {
    for (const links of this.outgoingLinks.values()) {
      for (const link of links) {
        if (link.targetId === documentId) {
          link.targetId = null;
        }
      }
    }
  }

  /**
   * Unresolve links when a document title changes
   */
  private unresolveLinksToTitle(title: string): void {
    const normalizedTitle = title.toLowerCase();

    for (const links of this.outgoingLinks.values()) {
      for (const link of links) {
        if (link.targetTitle.toLowerCase() === normalizedTitle) {
          link.targetId = null;
        }
      }
    }
  }

  /**
   * Extract context around a position in the content
   */
  private extractContext(content: string, position: number, length: number): string {
    const maxContext = 200;
    const contextRadius = Math.floor((maxContext - length) / 2);

    const start = Math.max(0, position - contextRadius);
    const end = Math.min(content.length, position + length + contextRadius);

    let context = content.slice(start, end);

    // Add ellipsis if truncated
    if (start > 0) {
      context = '...' + context;
    }
    if (end < content.length) {
      context = context + '...';
    }

    return context.trim();
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Check if a position in content is inside a link
   */
  private isInsideLink(content: string, position: number): boolean {
    // Find the last [[ before position
    const beforePosition = content.slice(0, position);
    const lastOpenBracket = beforePosition.lastIndexOf('[[');

    if (lastOpenBracket === -1) {
      return false;
    }

    // Check if there's a closing ]] between the [[ and our position
    const betweenContent = content.slice(lastOpenBracket, position);
    const hasClosing = betweenContent.includes(']]');

    return !hasClosing;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
