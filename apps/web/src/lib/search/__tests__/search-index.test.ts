/**
 * TDD Tests for Search Index
 *
 * Following TDD methodology:
 * 1. Write failing tests first
 * 2. Implement minimum code to pass
 * 3. Refactor while keeping tests green
 *
 * These tests define the contract for the search index implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Import will be created after tests pass
// import { SearchIndex, type SearchResult } from '../search-index';

// Mock document type matching our schema
interface MockDocument {
  id: string;
  title: string;
  content: string;
  previewText: string;
  createdAt: Date;
  modifiedAt: Date;
}

// Placeholder for SearchIndex - tests will fail until implemented
class SearchIndex {
  private documents: MockDocument[] = [];

  addDocument(_doc: MockDocument): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  updateDocument(_doc: MockDocument): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  removeDocument(_id: string): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  search(_query: string): Promise<SearchResult[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  searchWithFilters(_query: string, _filters: SearchFilters): Promise<SearchResult[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  clear(): void {
    throw new Error('Not implemented');
  }

  get documentCount(): number {
    return this.documents.length;
  }
}

interface SearchResult {
  document: MockDocument;
  score: number;
  matches: {
    field: 'title' | 'content';
    indices: [number, number][];
  }[];
}

interface SearchFilters {
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

describe('SearchIndex', () => {
  let searchIndex: SearchIndex;

  beforeEach(() => {
    searchIndex = new SearchIndex();
  });

  // ============================================================================
  // Indexing Tests
  // ============================================================================

  describe('indexing', () => {
    it('should index a document with title and content', async () => {
      const doc: MockDocument = {
        id: 'doc-1',
        title: 'Meeting Notes',
        content: '<p>Discussed project timeline and deliverables.</p>',
        previewText: 'Discussed project timeline...',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      };

      await searchIndex.addDocument(doc);

      expect(searchIndex.documentCount).toBe(1);
    });

    it('should update an existing document in the index', async () => {
      const doc: MockDocument = {
        id: 'doc-1',
        title: 'Original Title',
        content: '<p>Original content</p>',
        previewText: 'Original content',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      };

      await searchIndex.addDocument(doc);

      const updatedDoc = {
        ...doc,
        title: 'Updated Title',
        content: '<p>Updated content with new information</p>',
        modifiedAt: new Date('2024-01-16'),
      };

      await searchIndex.updateDocument(updatedDoc);

      const results = await searchIndex.search('Updated');
      expect(results).toHaveLength(1);
      expect(results[0].document.title).toBe('Updated Title');
    });

    it('should remove a document from the index', async () => {
      const doc: MockDocument = {
        id: 'doc-1',
        title: 'To Be Deleted',
        content: '<p>This document will be removed</p>',
        previewText: 'This document will be removed',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      };

      await searchIndex.addDocument(doc);
      expect(searchIndex.documentCount).toBe(1);

      await searchIndex.removeDocument('doc-1');
      expect(searchIndex.documentCount).toBe(0);
    });

    it('should handle empty documents gracefully', async () => {
      const doc: MockDocument = {
        id: 'doc-empty',
        title: '',
        content: '',
        previewText: '',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      };

      await searchIndex.addDocument(doc);
      expect(searchIndex.documentCount).toBe(1);

      // Should not throw when searching
      const results = await searchIndex.search('anything');
      expect(results).toHaveLength(0);
    });

    it('should handle special characters in content', async () => {
      const doc: MockDocument = {
        id: 'doc-special',
        title: 'Code Review: fix(bug) #123',
        content: '<p>Fixed the `async/await` issue in src/utils.ts</p>',
        previewText: 'Fixed the async/await issue...',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      };

      await searchIndex.addDocument(doc);

      const results = await searchIndex.search('async/await');
      expect(results).toHaveLength(1);
    });

    it('should strip HTML tags before indexing', async () => {
      const doc: MockDocument = {
        id: 'doc-html',
        title: 'HTML Document',
        content: '<h1>Header</h1><p><strong>Bold</strong> and <em>italic</em></p>',
        previewText: 'Header Bold and italic',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      };

      await searchIndex.addDocument(doc);

      // Should find content, not HTML tags
      const headerResults = await searchIndex.search('Header');
      expect(headerResults).toHaveLength(1);

      // Should NOT find HTML tags
      const tagResults = await searchIndex.search('<h1>');
      expect(tagResults).toHaveLength(0);
    });
  });

  // ============================================================================
  // Search Tests
  // ============================================================================

  describe('searching', () => {
    const testDocuments: MockDocument[] = [
      {
        id: 'doc-1',
        title: 'Project Kickoff Meeting',
        content: '<p>We discussed the project timeline and assigned tasks to team members.</p>',
        previewText: 'We discussed the project timeline...',
        createdAt: new Date('2024-01-10'),
        modifiedAt: new Date('2024-01-10'),
      },
      {
        id: 'doc-2',
        title: 'Weekly Status Update',
        content: '<p>All tasks are on track. The team completed the design phase.</p>',
        previewText: 'All tasks are on track...',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-01-15'),
      },
      {
        id: 'doc-3',
        title: 'Budget Planning',
        content: '<p>Reviewed the quarterly budget and allocated resources for Q2.</p>',
        previewText: 'Reviewed the quarterly budget...',
        createdAt: new Date('2024-01-20'),
        modifiedAt: new Date('2024-01-20'),
      },
    ];

    beforeEach(async () => {
      for (const doc of testDocuments) {
        await searchIndex.addDocument(doc);
      }
    });

    it('should return matching documents ranked by relevance', async () => {
      const results = await searchIndex.search('project');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.title).toContain('Project');
      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should perform case-insensitive search', async () => {
      const lowerResults = await searchIndex.search('project');
      const upperResults = await searchIndex.search('PROJECT');
      const mixedResults = await searchIndex.search('PrOjEcT');

      expect(lowerResults).toHaveLength(upperResults.length);
      expect(lowerResults).toHaveLength(mixedResults.length);
    });

    it('should support partial word matching (fuzzy search)', async () => {
      // "proj" should match "project"
      const results = await searchIndex.search('proj');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const results = await searchIndex.search('xyznonexistent');
      expect(results).toHaveLength(0);
    });

    it('should complete search within 200ms for 1000 documents', async () => {
      // Add 997 more documents (already have 3)
      for (let i = 4; i <= 1000; i++) {
        await searchIndex.addDocument({
          id: `doc-${String(i)}`,
          title: `Document ${String(i)}`,
          content: `<p>Content for document ${String(i)} with some searchable text.</p>`,
          previewText: `Content for document ${String(i)}...`,
          createdAt: new Date('2024-01-01'),
          modifiedAt: new Date('2024-01-01'),
        });
      }

      const start = performance.now();
      await searchIndex.search('searchable');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should search both title and content fields', async () => {
      // "kickoff" only appears in title of doc-1
      const titleResults = await searchIndex.search('kickoff');
      expect(titleResults).toHaveLength(1);
      expect(titleResults[0].document.id).toBe('doc-1');

      // "quarterly" only appears in content of doc-3
      const contentResults = await searchIndex.search('quarterly');
      expect(contentResults).toHaveLength(1);
      expect(contentResults[0].document.id).toBe('doc-3');
    });

    it('should return match positions for highlighting', async () => {
      const results = await searchIndex.search('project');

      expect(results[0].matches).toBeDefined();
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].matches[0]).toHaveProperty('field');
      expect(results[0].matches[0]).toHaveProperty('indices');
    });

    it('should handle empty search query', async () => {
      const results = await searchIndex.search('');
      expect(results).toHaveLength(0);
    });

    it('should handle whitespace-only search query', async () => {
      const results = await searchIndex.search('   ');
      expect(results).toHaveLength(0);
    });
  });

  // ============================================================================
  // Filtering Tests
  // ============================================================================

  describe('filtering', () => {
    const testDocuments: MockDocument[] = [
      {
        id: 'doc-old',
        title: 'Old Document',
        content: '<p>This is an old document about tasks</p>',
        previewText: 'This is an old document...',
        createdAt: new Date('2023-06-01'),
        modifiedAt: new Date('2023-06-15'),
      },
      {
        id: 'doc-recent',
        title: 'Recent Document',
        content: '<p>This is a recent document about tasks</p>',
        previewText: 'This is a recent document...',
        createdAt: new Date('2024-01-10'),
        modifiedAt: new Date('2024-01-15'),
      },
      {
        id: 'doc-today',
        title: 'Today Document',
        content: '<p>This is today document about tasks</p>',
        previewText: 'This is today document...',
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    ];

    beforeEach(async () => {
      for (const doc of testDocuments) {
        await searchIndex.addDocument(doc);
      }
    });

    it('should filter results by date range', async () => {
      const results = await searchIndex.searchWithFilters('tasks', {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      });

      // Should only return the "recent" document, not "old" or "today" (depends on current date)
      expect(results.some((r) => r.document.id === 'doc-recent')).toBe(true);
      expect(results.some((r) => r.document.id === 'doc-old')).toBe(false);
    });

    it('should filter by start date only', async () => {
      const results = await searchIndex.searchWithFilters('tasks', {
        dateRange: {
          start: new Date('2024-01-01'),
        },
      });

      // Should include recent and today, exclude old
      expect(results.some((r) => r.document.id === 'doc-old')).toBe(false);
    });

    it('should filter by end date only', async () => {
      const results = await searchIndex.searchWithFilters('tasks', {
        dateRange: {
          end: new Date('2023-12-31'),
        },
      });

      // Should only include old document
      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('doc-old');
    });

    it('should combine filters with search query', async () => {
      const results = await searchIndex.searchWithFilters('recent', {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0].document.id).toBe('doc-recent');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle concurrent indexing operations', async () => {
      const docs = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${String(i)}`,
        title: `Concurrent Doc ${String(i)}`,
        content: `<p>Content ${String(i)}</p>`,
        previewText: `Content ${String(i)}`,
        createdAt: new Date(),
        modifiedAt: new Date(),
      }));

      // Add all documents concurrently
      await Promise.all(docs.map((doc) => searchIndex.addDocument(doc)));

      expect(searchIndex.documentCount).toBe(10);
    });

    it('should handle very long documents', async () => {
      const longContent = '<p>' + 'Lorem ipsum dolor sit amet. '.repeat(10000) + '</p>';

      const doc: MockDocument = {
        id: 'doc-long',
        title: 'Very Long Document',
        content: longContent,
        previewText: 'Lorem ipsum dolor sit amet...',
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      await searchIndex.addDocument(doc);

      const results = await searchIndex.search('Lorem');
      expect(results).toHaveLength(1);
    });

    it('should handle unicode characters', async () => {
      const doc: MockDocument = {
        id: 'doc-unicode',
        title: 'Notas en Espa?ol',
        content: '<p>Esta es una nota con acentos: caf?, ma?ana, ni?o</p>',
        previewText: 'Esta es una nota con acentos...',
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      await searchIndex.addDocument(doc);

      const results = await searchIndex.search('caf?');
      expect(results).toHaveLength(1);
    });

    it('should clear all indexed documents', async () => {
      await searchIndex.addDocument({
        id: 'doc-1',
        title: 'Test',
        content: '<p>Test</p>',
        previewText: 'Test',
        createdAt: new Date(),
        modifiedAt: new Date(),
      });

      searchIndex.clear();

      expect(searchIndex.documentCount).toBe(0);
      const results = await searchIndex.search('Test');
      expect(results).toHaveLength(0);
    });
  });
});
