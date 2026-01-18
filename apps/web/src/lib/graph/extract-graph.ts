/**
 * Graph Data Extraction Utility
 *
 * Extracts nodes (documents) and edges (links) from the document database
 * for use with Cytoscape.js visualization.
 */

import { getAllDocuments, type StoredDocument } from '$lib/storage/db';

export interface GraphNode {
  id: string;
  title: string;
  previewText: string;
  modifiedAt: string;
  linkCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  resolved: boolean;
}

export interface DocumentGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ExtractedLink {
  documentId: string | null;
  title: string;
}

/**
 * Extract links from a document's HTML content.
 * Links are stored as <span data-internal-link data-document-id="..." data-title="...">
 */
function extractLinksFromHtml(html: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];

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
      links.push({ documentId, title });
    }
  }

  return links;
}

interface TabContent {
  content?: string;
}

interface TabsData {
  version: number;
  tabs: TabContent[];
}

/**
 * Parse document content and extract all links from all tabs.
 */
function extractLinksFromDocument(doc: StoredDocument): ExtractedLink[] {
  const allLinks: ExtractedLink[] = [];

  try {
    // Try to parse as TabsData JSON
    const tabsData = JSON.parse(doc.content) as TabsData;

    if (tabsData.version === 3 && Array.isArray(tabsData.tabs)) {
      // Extract links from each tab's content
      for (const tab of tabsData.tabs) {
        if (tab.content) {
          const links = extractLinksFromHtml(tab.content);
          allLinks.push(...links);
        }
      }
    } else if (typeof doc.content === 'string') {
      // Legacy format - treat content as HTML directly
      const links = extractLinksFromHtml(doc.content);
      allLinks.push(...links);
    }
  } catch {
    // If JSON parse fails, try treating as raw HTML
    const links = extractLinksFromHtml(doc.content);
    allLinks.push(...links);
  }

  return allLinks;
}

/**
 * Build a complete document graph from all documents in the database.
 */
export async function buildDocumentGraph(): Promise<DocumentGraph> {
  const documents = await getAllDocuments();

  // Create a map of title -> document id for link resolution
  const titleToIdMap = new Map<string, string>();
  for (const doc of documents) {
    titleToIdMap.set(doc.title.toLowerCase(), doc.id);
  }

  // Track incoming link counts for node sizing
  const incomingLinkCounts = new Map<string, number>();

  // Build edges and track link counts
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>(); // Prevent duplicate edges

  for (const doc of documents) {
    const links = extractLinksFromDocument(doc);

    for (const link of links) {
      // Resolve the target document
      let targetId = link.documentId;

      // If no documentId, try to resolve by title
      if (!targetId && link.title) {
        targetId = titleToIdMap.get(link.title.toLowerCase()) || null;
      }

      if (targetId && targetId !== doc.id) {
        // Create a unique edge id to prevent duplicates
        const edgeKey = `${doc.id}->${targetId}`;

        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);

          edges.push({
            id: edgeKey,
            source: doc.id,
            target: targetId,
            resolved: true,
          });

          // Count incoming links
          incomingLinkCounts.set(targetId, (incomingLinkCounts.get(targetId) || 0) + 1);
        }
      }
    }
  }

  // Build nodes with link counts
  const nodes: GraphNode[] = documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    previewText: doc.previewText,
    modifiedAt: doc.modifiedAt,
    linkCount: incomingLinkCounts.get(doc.id) || 0,
  }));

  return { nodes, edges };
}

/**
 * Convert graph data to Cytoscape.js elements format.
 */
export function toCytoscapeElements(graph: DocumentGraph): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = [];

  // Add nodes
  for (const node of graph.nodes) {
    elements.push({
      data: {
        id: node.id,
        label: node.title,
        previewText: node.previewText,
        linkCount: node.linkCount,
      },
    });
  }

  // Add edges
  for (const edge of graph.edges) {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
      },
    });
  }

  return elements;
}
