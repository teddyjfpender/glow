/**
 * Types for internal document linking system.
 * Supports Obsidian-style [[wiki-links]] between documents.
 */

export type LinkId = string;

/**
 * Represents a link from one document to another.
 */
export interface DocumentLink {
  id: LinkId;
  sourceDocumentId: string;
  targetDocumentId: string | null; // null if unresolved
  targetTitle: string; // Original link text
  displayText: string | null; // Custom display text if provided via [[title|display]]
  headingAnchor: string | null; // #heading if present
  position: {
    tabId: string; // Which tab contains the link
    from: number; // Start position in content
    to: number; // End position in content
  };
  context: string; // Surrounding text for backlinks display
  createdAt: string;
  modifiedAt: string;
}

/**
 * Result when querying backlinks to a document.
 */
export interface BacklinkResult {
  documentId: string;
  documentTitle: string;
  tabId: string;
  tabName: string;
  context: string; // Text excerpt around the link
  position: number;
}

/**
 * Represents a mention of a document title that isn't linked.
 */
export interface UnlinkedMention {
  documentId: string;
  documentTitle: string;
  mentionText: string; // The matching text
  context: string; // Surrounding text
  position: number;
}

/**
 * Result of resolving a link text to a document.
 */
export interface LinkResolution {
  resolved: boolean;
  documentId: string | null;
  documentTitle: string;
  confidence: 'exact' | 'case-insensitive' | 'partial';
}

/**
 * Attributes stored on the internal link mark in ProseMirror.
 */
export interface InternalLinkAttributes {
  documentId: string | null; // null if unresolved
  title: string; // Original link text
  displayText: string | null; // Custom display text
  anchor: string | null; // #heading or #^block
  resolved: boolean;
}

/**
 * Parsed link from content.
 */
export interface ParsedLink {
  fullMatch: string; // The full [[...]] text
  title: string; // Document title
  displayText: string | null; // Custom display text
  anchor: string | null; // Heading anchor
  startIndex: number;
  endIndex: number;
}

/**
 * Document info for the link index.
 */
export interface IndexedDocument {
  id: string;
  title: string;
  aliases: string[];
  outgoingLinks: DocumentLink[];
}

/**
 * Link statistics for a document.
 */
export interface LinkStats {
  outgoingCount: number;
  incomingCount: number;
  unresolvedCount: number;
}
