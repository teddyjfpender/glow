/**
 * Tabs state management using Svelte 5 runes.
 * Manages document tabs hierarchy and active tab state.
 */

import type { Tab, TabId, TabsData, OutlineHeading } from '$lib/types/tabs';

interface TabsState {
  tabs: Map<TabId, Tab>;
  activeTabId: TabId | null;
  expandedTabIds: Set<TabId>;
  editingTabId: TabId | null;
  isDirty: boolean;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createTabsState(): {
  // State getters
  readonly tabs: Map<TabId, Tab>;
  readonly activeTabId: TabId | null;
  readonly expandedTabIds: Set<TabId>;
  readonly editingTabId: TabId | null;
  readonly isDirty: boolean;
  // Derived getters
  readonly tabsArray: Tab[];
  readonly rootTabs: Tab[];
  readonly activeTab: Tab | null;
  // Helper functions
  getChildren: (parentId: TabId) => Tab[];
  getDepth: (tabId: TabId) => number;
  canHaveChildren: (tabId: TabId) => boolean;
  extractHeadings: (html: string) => OutlineHeading[];
  // Serialization
  initialize: (data: TabsData) => void;
  serialize: () => TabsData;
  // Actions
  setActiveTab: (tabId: TabId) => void;
  addTab: (parentId?: TabId | null) => Tab;
  renameTab: (tabId: TabId, name: string) => void;
  deleteTab: (tabId: TabId) => void;
  duplicateTab: (tabId: TabId) => Tab;
  updateTabContent: (tabId: TabId, content: string) => void;
  expandTab: (tabId: TabId) => void;
  collapseTab: (tabId: TabId) => void;
  toggleExpand: (tabId: TabId) => void;
  moveTab: (tabId: TabId, newParentId: TabId | null, newOrder: number) => void;
  startEditing: (tabId: TabId) => void;
  stopEditing: () => void;
  markClean: () => void;
  reset: () => void;
} {
  let state = $state<TabsState>({
    tabs: new Map(),
    activeTabId: null,
    expandedTabIds: new Set(),
    editingTabId: null,
    isDirty: false,
  });

  // Derived: Get all tabs as array
  const tabsArray = $derived(Array.from(state.tabs.values()));

  // Derived: Root-level tabs (parentId === null) sorted by order
  const rootTabs = $derived(
    tabsArray.filter((t) => t.parentId === null).sort((a, b) => a.order - b.order),
  );

  // Derived: Active tab object
  const activeTab = $derived(
    state.activeTabId !== null ? (state.tabs.get(state.activeTabId) ?? null) : null,
  );

  // Get children of a tab, sorted by order
  function getChildren(parentId: TabId): Tab[] {
    return tabsArray.filter((t) => t.parentId === parentId).sort((a, b) => a.order - b.order);
  }

  // Get nesting depth of a tab (0 for root, 1 for child, 2 for grandchild)
  function getDepth(tabId: TabId): number {
    const tab = state.tabs.get(tabId);
    if (!tab || tab.parentId === null) return 0;
    return 1 + getDepth(tab.parentId);
  }

  // Check if tab can have children (max 3 levels deep means parent can be at depth 0, 1, or 2)
  function canHaveChildren(tabId: TabId): boolean {
    return getDepth(tabId) < 2;
  }

  // Extract headings from HTML content for outline
  function extractHeadings(html: string): OutlineHeading[] {
    if (typeof window === 'undefined') return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings: OutlineHeading[] = [];

    doc.querySelectorAll('h1, h2, h3').forEach((el, index) => {
      const level = parseInt(el.tagName[1]) as 1 | 2 | 3;
      const text = el.textContent?.trim() || '';
      if (text) {
        headings.push({
          id: el.id || `heading-${index}`,
          text,
          level,
        });
      }
    });

    return headings;
  }

  // Initialize from TabsData
  function initialize(data: TabsData): void {
    const map = new Map<TabId, Tab>();
    for (const tab of data.tabs) {
      map.set(tab.id, tab);
    }
    state.tabs = map;
    state.activeTabId = data.activeTabId || (data.tabs[0]?.id ?? null);
    state.expandedTabIds = new Set(data.expandedTabIds);
    state.editingTabId = null;
    state.isDirty = false;
  }

  // Serialize to TabsData
  function serialize(): TabsData {
    return {
      version: 3,
      tabs: Array.from(state.tabs.values()),
      activeTabId: state.activeTabId ?? '',
      expandedTabIds: Array.from(state.expandedTabIds),
    };
  }

  // Actions
  function setActiveTab(tabId: TabId): void {
    if (state.activeTabId === tabId) return;

    state.activeTabId = tabId;
    state.isDirty = true;

    // Auto-expand parent tabs
    const tab = state.tabs.get(tabId);
    if (tab?.parentId) {
      expandParents(tab.parentId);
    }
  }

  function expandParents(tabId: TabId): void {
    const tab = state.tabs.get(tabId);
    if (!tab) return;

    const newExpanded = new Set(state.expandedTabIds);
    newExpanded.add(tabId);
    state.expandedTabIds = newExpanded;

    if (tab.parentId) {
      expandParents(tab.parentId);
    }
  }

  function addTab(parentId: TabId | null = null): Tab {
    // Validate nesting depth
    if (parentId !== null && getDepth(parentId) >= 2) {
      throw new Error('Maximum nesting depth exceeded');
    }

    const siblings = parentId !== null ? getChildren(parentId) : rootTabs;

    const newTab: Tab = {
      id: generateId(),
      name: 'New tab',
      content: '',
      parentId,
      order: siblings.length,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    const newTabs = new Map(state.tabs);
    newTabs.set(newTab.id, newTab);
    state.tabs = newTabs;
    state.activeTabId = newTab.id;
    state.editingTabId = newTab.id; // Start editing name
    state.isDirty = true;

    // Expand parent if adding subtab
    if (parentId !== null) {
      expandTab(parentId);
    }

    return newTab;
  }

  function renameTab(tabId: TabId, name: string): void {
    const tab = state.tabs.get(tabId);
    if (!tab) return;

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === tab.name) {
      state.editingTabId = null;
      return;
    }

    const updated = { ...tab, name: trimmedName, modifiedAt: new Date().toISOString() };
    const newTabs = new Map(state.tabs);
    newTabs.set(tabId, updated);
    state.tabs = newTabs;
    state.editingTabId = null;
    state.isDirty = true;
  }

  function deleteTab(tabId: TabId): void {
    const tab = state.tabs.get(tabId);
    if (!tab) return;

    // Collect all descendant IDs recursively
    const toDelete = new Set<TabId>([tabId]);
    const collectDescendants = (id: TabId): void => {
      for (const child of getChildren(id)) {
        toDelete.add(child.id);
        collectDescendants(child.id);
      }
    };
    collectDescendants(tabId);

    const newTabs = new Map(state.tabs);
    for (const id of toDelete) {
      newTabs.delete(id);
    }

    // Update active tab if deleted
    if (state.activeTabId !== null && toDelete.has(state.activeTabId)) {
      const siblings = tab.parentId !== null ? getChildren(tab.parentId) : rootTabs;
      const remaining = siblings.filter((t) => !toDelete.has(t.id));
      // Try to select a sibling, or parent, or first root tab
      if (remaining.length > 0) {
        state.activeTabId = remaining[0].id;
      } else if (tab.parentId !== null) {
        state.activeTabId = tab.parentId;
      } else {
        const firstRoot = Array.from(newTabs.values()).find((t) => t.parentId === null);
        state.activeTabId = firstRoot?.id ?? null;
      }
    }

    state.tabs = newTabs;
    state.isDirty = true;

    // Ensure at least one tab exists
    if (state.tabs.size === 0) {
      addTab();
    }
  }

  function duplicateTab(tabId: TabId): Tab {
    const tab = state.tabs.get(tabId);
    if (!tab) throw new Error('Tab not found');

    const duplicated: Tab = {
      id: generateId(),
      name: `${tab.name} (copy)`,
      content: tab.content,
      parentId: tab.parentId,
      order: tab.order + 0.5, // Insert after original
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    const newTabs = new Map(state.tabs);
    newTabs.set(duplicated.id, duplicated);
    state.tabs = newTabs;
    state.isDirty = true;

    // Re-normalize order for siblings
    normalizeOrder(duplicated.parentId);

    return duplicated;
  }

  function updateTabContent(tabId: TabId, content: string): void {
    const tab = state.tabs.get(tabId);
    if (!tab) return;

    // Only update if content actually changed
    if (tab.content === content) return;

    const updated = { ...tab, content, modifiedAt: new Date().toISOString() };
    const newTabs = new Map(state.tabs);
    newTabs.set(tabId, updated);
    state.tabs = newTabs;
    state.isDirty = true;
  }

  function expandTab(tabId: TabId): void {
    if (state.expandedTabIds.has(tabId)) return;

    const newExpanded = new Set(state.expandedTabIds);
    newExpanded.add(tabId);
    state.expandedTabIds = newExpanded;
    state.isDirty = true;
  }

  function collapseTab(tabId: TabId): void {
    if (!state.expandedTabIds.has(tabId)) return;

    const newExpanded = new Set(state.expandedTabIds);
    newExpanded.delete(tabId);
    state.expandedTabIds = newExpanded;
    state.isDirty = true;
  }

  function toggleExpand(tabId: TabId): void {
    if (state.expandedTabIds.has(tabId)) {
      collapseTab(tabId);
    } else {
      expandTab(tabId);
    }
  }

  function moveTab(tabId: TabId, newParentId: TabId | null, newOrder: number): void {
    // Validate move doesn't exceed depth limit
    if (newParentId !== null && getDepth(newParentId) >= 2) {
      return; // Can't create 4th level
    }

    // Prevent moving a tab into its own descendants
    if (newParentId !== null) {
      let current: TabId | null = newParentId;
      while (current !== null) {
        if (current === tabId) return; // Would create cycle
        const tab = state.tabs.get(current);
        current = tab?.parentId ?? null;
      }
    }

    const tab = state.tabs.get(tabId);
    if (!tab) return;

    const oldParentId = tab.parentId;
    const updated = { ...tab, parentId: newParentId, order: newOrder };
    const newTabs = new Map(state.tabs);
    newTabs.set(tabId, updated);
    state.tabs = newTabs;
    state.isDirty = true;

    // Re-normalize order for old and new parent
    normalizeOrder(oldParentId);
    if (newParentId !== oldParentId) {
      normalizeOrder(newParentId);
    }
  }

  function normalizeOrder(parentId: TabId | null): void {
    const siblings = parentId !== null ? getChildren(parentId) : rootTabs;
    const sorted = [...siblings].sort((a, b) => a.order - b.order);
    const newTabs = new Map(state.tabs);

    sorted.forEach((tab, index) => {
      if (tab.order !== index) {
        newTabs.set(tab.id, { ...tab, order: index });
      }
    });

    state.tabs = newTabs;
  }

  function startEditing(tabId: TabId): void {
    state.editingTabId = tabId;
  }

  function stopEditing(): void {
    state.editingTabId = null;
  }

  function markClean(): void {
    state.isDirty = false;
  }

  function reset(): void {
    state.tabs = new Map();
    state.activeTabId = null;
    state.expandedTabIds = new Set();
    state.editingTabId = null;
    state.isDirty = false;
  }

  return {
    // State getters
    get tabs(): Map<TabId, Tab> {
      return state.tabs;
    },
    get activeTabId(): TabId | null {
      return state.activeTabId;
    },
    get expandedTabIds(): Set<TabId> {
      return state.expandedTabIds;
    },
    get editingTabId(): TabId | null {
      return state.editingTabId;
    },
    get isDirty(): boolean {
      return state.isDirty;
    },

    // Derived getters
    get tabsArray(): Tab[] {
      return tabsArray;
    },
    get rootTabs(): Tab[] {
      return rootTabs;
    },
    get activeTab(): Tab | null {
      return activeTab;
    },

    // Helper functions
    getChildren,
    getDepth,
    canHaveChildren,
    extractHeadings,

    // Serialization
    initialize,
    serialize,

    // Actions
    setActiveTab,
    addTab,
    renameTab,
    deleteTab,
    duplicateTab,
    updateTabContent,
    expandTab,
    collapseTab,
    toggleExpand,
    moveTab,
    startEditing,
    stopEditing,
    markClean,
    reset,
  };
}

export const tabsState = createTabsState();
