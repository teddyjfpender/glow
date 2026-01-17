/**
 * Type definitions for document tabs feature.
 * Tabs allow organizing content into separate sections within a single document.
 */

export type TabId = string;

/**
 * Represents a single tab within a document.
 * Tabs can be nested up to 3 levels deep.
 */
export interface Tab {
  /** Unique identifier for the tab */
  id: TabId;
  /** Display name of the tab */
  name: string;
  /** TipTap HTML content of the tab */
  content: string;
  /** Parent tab ID, or null for root-level tabs */
  parentId: TabId | null;
  /** Sort order within siblings (lower = first) */
  order: number;
  /** ISO 8601 timestamp when tab was created */
  createdAt: string;
  /** ISO 8601 timestamp when tab was last modified */
  modifiedAt: string;
}

/**
 * Serialized tabs data structure stored in document content.
 */
export interface TabsData {
  /** Schema version for migration purposes */
  version: 3;
  /** Array of all tabs in the document */
  tabs: Tab[];
  /** ID of the currently active tab */
  activeTabId: TabId;
  /** IDs of tabs that are expanded in the UI (showing children) */
  expandedTabIds: TabId[];
}

/**
 * Heading extracted from tab content for the outline.
 */
export interface OutlineHeading {
  /** Unique identifier (from element ID or generated) */
  id: string;
  /** Heading text content */
  text: string;
  /** Heading level (1, 2, or 3) */
  level: 1 | 2 | 3;
}
