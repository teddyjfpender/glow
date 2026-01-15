# Glow Product Roadmap

> A strategic roadmap to make Glow a step-function improvement over existing note-taking products (Notion, Obsidian, Apple Notes).

## Executive Summary

Glow has solid technical foundations:
- Modern Svelte 5 + TipTap editor
- Deep Excalidraw integration (unique differentiator)
- CRDT infrastructure ready (Yrs in Rust backend)
- IndexedDB local storage working

**Key gaps to address:** Real-time collaboration, search, sharing, export/import, and mobile support.

---

## Tier 1: Core Value Multipliers

These features transform Glow from "nice local editor" to "must-have collaborative tool."

---

### Feature 1: Full-Text Search

**Priority:** P0 (Critical)
**Effort:** Medium (1-2 weeks)
**Impact:** High - Essential for users with 10+ documents

#### User Stories

**US-1.1: Basic Document Search**
> As a user, I want to search across all my documents by content or title, so that I can quickly find information without manually browsing.

**Acceptance Criteria:**
- [ ] Search input in header/sidebar is visible and accessible via `Cmd/Ctrl+K`
- [ ] Search results appear within 200ms for up to 1000 documents
- [ ] Results show document title, matched text snippet (50 chars context), and last modified date
- [ ] Clicking a result navigates to the document with search term highlighted
- [ ] Empty state shows "No results found" with search tips
- [ ] Search is case-insensitive by default
- [ ] Search works completely offline

**US-1.2: Search Highlighting**
> As a user, when I navigate to a document from search results, I want the matched terms highlighted so I can quickly locate the relevant section.

**Acceptance Criteria:**
- [ ] Matched terms are highlighted with a distinct background color
- [ ] "Next" and "Previous" buttons navigate between matches
- [ ] Match count displayed (e.g., "3 of 12 matches")
- [ ] Highlights persist until user clears search or edits near the highlight
- [ ] `Escape` key clears highlights

**US-1.3: Search Filters**
> As a user, I want to filter search results by date range or document type, so I can narrow down results in large document collections.

**Acceptance Criteria:**
- [ ] Filter dropdown with options: "All time", "Today", "This week", "This month", "Custom range"
- [ ] Filters combine with search query (AND logic)
- [ ] Active filters shown as removable chips
- [ ] Filter state persists during session

#### Technical Design

```
/apps/web/src/lib/
├── search/
│   ├── search-index.ts        # In-memory full-text index using Fuse.js or MiniSearch
│   ├── search-state.svelte.ts # Search query, results, filters state
│   └── __tests__/
│       ├── search-index.test.ts
│       └── search-state.test.ts
├── components/
│   ├── SearchDialog.svelte    # Modal search UI (Cmd+K)
│   ├── SearchResultItem.svelte
│   └── SearchHighlight.svelte # TipTap extension for highlighting
```

**Index Strategy:**
1. Build index on app load from IndexedDB documents
2. Update index incrementally on document save
3. Use MiniSearch for fuzzy matching + relevance scoring
4. Store index in memory (rebuild on page refresh - fast for <5000 docs)

**TDD Test Plan:**
```typescript
// search-index.test.ts
describe('SearchIndex', () => {
  describe('indexing', () => {
    it('should index document title and content');
    it('should update index when document is saved');
    it('should remove document from index when deleted');
    it('should handle empty documents');
    it('should handle special characters in content');
  });

  describe('searching', () => {
    it('should return matching documents ranked by relevance');
    it('should perform case-insensitive search');
    it('should support partial word matching (fuzzy)');
    it('should return empty array for no matches');
    it('should complete search within 200ms for 1000 documents');
  });

  describe('filtering', () => {
    it('should filter results by date range');
    it('should combine filters with search query');
  });
});
```

---

### Feature 2: Export & Import

**Priority:** P0 (Critical)
**Effort:** Medium (1-2 weeks)
**Impact:** High - Breaks vendor lock-in, enables interoperability

#### User Stories

**US-2.1: Export to Markdown**
> As a user, I want to export my document as Markdown, so I can use it in other tools or version control systems.

**Acceptance Criteria:**
- [ ] "Export" menu option in document header
- [ ] Markdown export preserves: headings, bold, italic, links, lists, code blocks, blockquotes
- [ ] Excalidraw drawings exported as embedded PNG/SVG with alt text
- [ ] File downloads with document title as filename (sanitized)
- [ ] Export completes in <2 seconds for 10-page document

**US-2.2: Export to PDF**
> As a user, I want to export my document as a PDF, so I can share a professional, printable version.

**Acceptance Criteria:**
- [ ] PDF export maintains visual styling (fonts, colors, spacing)
- [ ] Excalidraw drawings rendered correctly in PDF
- [ ] Page breaks occur at logical points (not mid-paragraph)
- [ ] PDF includes document title as header/metadata
- [ ] Export shows progress indicator for large documents

**US-2.3: Import from Markdown**
> As a user, I want to import Markdown files, so I can migrate my existing notes to Glow.

**Acceptance Criteria:**
- [ ] "Import" option on home page and in menu
- [ ] Supports .md and .markdown file extensions
- [ ] Drag-and-drop file import
- [ ] Preserves all standard Markdown syntax
- [ ] Creates new document with filename as title
- [ ] Shows import success/error notification

**US-2.4: Batch Export**
> As a user, I want to export all my documents at once, so I can create backups or migrate to another system.

**Acceptance Criteria:**
- [ ] "Export All" option in settings or home page
- [ ] Exports as ZIP file containing individual Markdown files
- [ ] Progress indicator shows export status
- [ ] Option to include/exclude Excalidraw drawings
- [ ] Generates manifest.json with document metadata

#### Technical Design

```
/apps/web/src/lib/
├── export/
│   ├── markdown-exporter.ts   # HTML → Markdown conversion
│   ├── pdf-exporter.ts        # Uses html2pdf.js or Puppeteer
│   ├── zip-exporter.ts        # JSZip for batch export
│   └── __tests__/
│       ├── markdown-exporter.test.ts
│       └── pdf-exporter.test.ts
├── import/
│   ├── markdown-importer.ts   # Markdown → TipTap JSON
│   └── __tests__/
│       └── markdown-importer.test.ts
```

**Dependencies:**
- `turndown` - HTML to Markdown conversion
- `marked` - Markdown to HTML (for import)
- `html2pdf.js` or `@react-pdf/renderer` - PDF generation
- `jszip` - ZIP file creation

**TDD Test Plan:**
```typescript
// markdown-exporter.test.ts
describe('MarkdownExporter', () => {
  it('should convert heading to # syntax');
  it('should convert bold to ** syntax');
  it('should convert italic to * syntax');
  it('should convert links to [text](url) syntax');
  it('should convert unordered lists to - syntax');
  it('should convert ordered lists to 1. syntax');
  it('should convert code blocks to ``` syntax');
  it('should convert blockquotes to > syntax');
  it('should handle nested lists correctly');
  it('should export Excalidraw as embedded image');
});

// markdown-importer.test.ts
describe('MarkdownImporter', () => {
  it('should parse # headings to h1');
  it('should parse **bold** to strong');
  it('should parse *italic* to em');
  it('should parse [links](url) to anchor');
  it('should parse code blocks with language');
  it('should handle complex nested structures');
  it('should sanitize potentially dangerous HTML');
});
```

---

### Feature 3: Share Links

**Priority:** P0 (Critical)
**Effort:** Medium-High (2-3 weeks)
**Impact:** High - Enables collaboration and content distribution

#### User Stories

**US-3.1: Generate Share Link**
> As a user, I want to generate a shareable link for my document, so others can view it without needing an account.

**Acceptance Criteria:**
- [ ] "Share" button in document header
- [ ] Click generates unique, unguessable URL (e.g., `/share/abc123xyz`)
- [ ] Copy link button with "Copied!" feedback
- [ ] Share link modal shows link preview
- [ ] Can set expiration (never, 1 day, 7 days, 30 days)
- [ ] Share links are read-only by default

**US-3.2: View Shared Document**
> As a visitor, I want to view a shared document without logging in, so I can read content shared with me.

**Acceptance Criteria:**
- [ ] Shared document renders in read-only mode
- [ ] All formatting preserved (including Excalidraw)
- [ ] No editing UI shown
- [ ] "View in Glow" CTA for non-users
- [ ] Works on mobile browsers
- [ ] Shows "Document not found" for invalid/expired links

**US-3.3: Revoke Share Link**
> As a user, I want to revoke a share link, so I can stop access to previously shared content.

**Acceptance Criteria:**
- [ ] Share modal shows active share links for document
- [ ] "Revoke" button next to each link
- [ ] Confirmation dialog before revoking
- [ ] Revoked links immediately return 404
- [ ] Can generate new link after revoking

#### Technical Design

```
/apps/web/src/
├── lib/
│   ├── sharing/
│   │   ├── share-service.ts    # Generate/revoke share tokens
│   │   ├── share-state.svelte.ts
│   │   └── __tests__/
│   │       └── share-service.test.ts
│   └── components/
│       ├── ShareDialog.svelte
│       └── ShareLinkItem.svelte
├── routes/
│   └── share/
│       └── [token]/
│           └── +page.svelte    # Public share view

/crates/glow-server/src/
├── routes/
│   └── share.rs                # Share token generation & validation
├── models/
│   └── share.rs                # ShareLink model
```

**Share Token Schema:**
```sql
CREATE TABLE share_links (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,  -- Cryptographically random
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  view_count INTEGER DEFAULT 0
);
```

**Token Generation:**
- Use `crypto.randomUUID()` + base64url encoding
- Minimum 22 characters for security
- Store hashed token in database, return raw to user

**TDD Test Plan:**
```typescript
// share-service.test.ts
describe('ShareService', () => {
  describe('generateShareLink', () => {
    it('should generate unique token for document');
    it('should set expiration when provided');
    it('should return shareable URL');
  });

  describe('validateShareToken', () => {
    it('should return document for valid token');
    it('should return null for invalid token');
    it('should return null for expired token');
    it('should return null for revoked token');
    it('should increment view count on access');
  });

  describe('revokeShareLink', () => {
    it('should mark link as revoked');
    it('should prevent future access');
  });
});
```

---

### Feature 4: Real-Time Collaboration

**Priority:** P1 (High)
**Effort:** High (3-4 weeks)
**Impact:** Very High - Transforms single-user to multi-user product

#### User Stories

**US-4.1: Collaborative Editing**
> As a user, I want to edit a document simultaneously with others, seeing their changes in real-time.

**Acceptance Criteria:**
- [ ] Multiple users can edit same document concurrently
- [ ] Changes appear within 100ms for other users
- [ ] No data loss on conflicting edits (CRDT merge)
- [ ] Works with flaky network (reconnects automatically)
- [ ] Offline edits sync when reconnected

**US-4.2: Presence Awareness**
> As a user, I want to see who else is viewing/editing the document, so I know when I'm collaborating.

**Acceptance Criteria:**
- [ ] Avatar/initials shown for each active user
- [ ] Cursor position visible for each user (different colors)
- [ ] User list in header shows active editors
- [ ] "X is typing..." indicator
- [ ] Graceful handling when user disconnects

**US-4.3: Collaborative Drawing**
> As a user, I want to draw on Excalidraw diagrams collaboratively, seeing others' strokes in real-time.

**Acceptance Criteria:**
- [ ] Excalidraw elements sync in real-time
- [ ] Can see other users' cursors in drawing mode
- [ ] Element selection conflicts resolved gracefully
- [ ] Drawing state persists with document

#### Technical Design

```
/apps/web/src/lib/
├── collaboration/
│   ├── websocket-client.ts     # WebSocket connection management
│   ├── yjs-provider.ts         # Yjs document sync provider
│   ├── awareness.ts            # User presence tracking
│   ├── cursor-plugin.ts        # TipTap cursor extension
│   └── __tests__/
│       ├── websocket-client.test.ts
│       └── yjs-provider.test.ts

/crates/glow-server/src/
├── collaboration/
│   ├── mod.rs
│   ├── room.rs                 # Document room management
│   ├── sync.rs                 # CRDT sync logic
│   └── awareness.rs            # Presence broadcasting
```

**WebSocket Protocol:**
```
Client → Server:
  { type: "join", documentId: "xxx", userId: "yyy" }
  { type: "update", update: <Yjs update bytes> }
  { type: "awareness", state: { cursor: {x, y}, user: {...} } }

Server → Client:
  { type: "sync", state: <full Yjs state> }
  { type: "update", update: <Yjs update bytes> }
  { type: "awareness", clients: [...] }
  { type: "user_joined", user: {...} }
  { type: "user_left", userId: "xxx" }
```

**CRDT Integration:**
1. TipTap content stored in Yjs Y.XmlFragment
2. Excalidraw state stored in Yjs Y.Map
3. Updates broadcast via WebSocket
4. Server persists merged state to database

**TDD Test Plan:**
```typescript
// websocket-client.test.ts
describe('WebSocketClient', () => {
  it('should connect to document room');
  it('should reconnect on disconnection');
  it('should queue updates while disconnected');
  it('should flush queue on reconnection');
  it('should handle server errors gracefully');
});

// yjs-provider.test.ts
describe('YjsProvider', () => {
  it('should sync initial document state');
  it('should apply remote updates');
  it('should send local updates');
  it('should merge concurrent edits without conflict');
  it('should preserve user attribution');
});
```

---

## Tier 2: Competitive Necessity

---

### Feature 5: Version History

**Priority:** P1 (High)
**Effort:** Medium (1-2 weeks)
**Impact:** High - Prevents data loss, enables recovery

#### User Stories

**US-5.1: View Document History**
> As a user, I want to see previous versions of my document, so I can review changes over time.

**Acceptance Criteria:**
- [ ] "History" button in document menu
- [ ] Timeline view showing snapshots with timestamps
- [ ] Preview of each version without leaving current document
- [ ] Shows diff highlights between versions
- [ ] History retained for at least 30 days

**US-5.2: Restore Previous Version**
> As a user, I want to restore a previous version of my document, so I can recover from unwanted changes.

**Acceptance Criteria:**
- [ ] "Restore" button on each version
- [ ] Confirmation dialog with preview
- [ ] Restoration creates new version (non-destructive)
- [ ] Works offline with locally stored versions

#### Technical Design

```
/apps/web/src/lib/
├── history/
│   ├── version-manager.ts      # Create/store/retrieve versions
│   ├── diff-engine.ts          # Compute text differences
│   └── __tests__/
│       ├── version-manager.test.ts
│       └── diff-engine.test.ts
├── components/
│   ├── HistoryPanel.svelte
│   └── VersionDiff.svelte
```

**Version Storage:**
- Store version snapshots in IndexedDB `document_versions` store
- Create snapshot on: manual save, auto-save after 5 min of edits, before restore
- Limit to 100 versions per document, prune oldest
- Store compressed content using LZ-String

---

### Feature 6: Tags & Organization

**Priority:** P1 (High)
**Effort:** Low-Medium (1 week)
**Impact:** Medium - Essential for power users

#### User Stories

**US-6.1: Add Tags to Document**
> As a user, I want to add tags to my documents, so I can categorize and organize them.

**Acceptance Criteria:**
- [ ] Tag input field in document header/sidebar
- [ ] Autocomplete from existing tags
- [ ] Tags displayed as colored chips
- [ ] Maximum 10 tags per document
- [ ] Tags saved with document

**US-6.2: Filter by Tags**
> As a user, I want to filter my document list by tags, so I can find related documents quickly.

**Acceptance Criteria:**
- [ ] Tag filter in sidebar/home page
- [ ] Click tag to filter documents
- [ ] Multiple tag selection (AND logic)
- [ ] Clear filters button
- [ ] Show document count per tag

#### Technical Design

```
/apps/web/src/lib/
├── tags/
│   ├── tag-service.ts          # Tag CRUD operations
│   ├── tag-state.svelte.ts     # Tag filtering state
│   └── __tests__/
│       └── tag-service.test.ts
├── components/
│   ├── TagInput.svelte
│   ├── TagChip.svelte
│   └── TagFilter.svelte
```

**Schema Update:**
```typescript
interface Document {
  // ... existing fields
  tags: string[];  // Array of tag names
}
```

---

### Feature 7: Templates

**Priority:** P2 (Medium)
**Effort:** Low (3-5 days)
**Impact:** Medium - Faster document creation

#### User Stories

**US-7.1: Create Document from Template**
> As a user, I want to create a new document from a template, so I don't have to start from scratch for common document types.

**Acceptance Criteria:**
- [ ] Template gallery on home page
- [ ] Built-in templates: Meeting Notes, Project Plan, Weekly Review, Recipe, Travel Plan
- [ ] Template preview on hover
- [ ] Click to create document with template content
- [ ] Template title becomes document title prefix

**US-7.2: Save Custom Template**
> As a user, I want to save my document as a template, so I can reuse my own structures.

**Acceptance Criteria:**
- [ ] "Save as Template" in document menu
- [ ] Custom templates appear in template gallery
- [ ] Can edit/delete custom templates
- [ ] Templates stored locally in IndexedDB

#### Technical Design

```
/apps/web/src/lib/
├── templates/
│   ├── template-service.ts
│   ├── built-in-templates.ts   # Pre-defined template content
│   └── __tests__/
│       └── template-service.test.ts
├── components/
│   ├── TemplateGallery.svelte
│   └── TemplateCard.svelte
```

---

## Tier 3: Polish & Engagement

---

### Feature 8: Comments & Annotations

**Priority:** P2 (Medium)
**Effort:** Medium (1-2 weeks)

#### User Stories

**US-8.1: Add Comment to Text**
> As a user, I want to add a comment to a specific text selection, so I can provide feedback or notes.

**Acceptance Criteria:**
- [ ] Select text → "Comment" button in toolbar
- [ ] Comment appears in sidebar panel
- [ ] Click comment to highlight associated text
- [ ] Can resolve/unresolve comments
- [ ] Comments sync in real-time (when collab enabled)

---

### Feature 9: Dark/Light Theme Toggle

**Priority:** P2 (Medium)
**Effort:** Low (2-3 days)

#### User Stories

**US-9.1: Switch Theme**
> As a user, I want to switch between dark and light themes, so I can use my preferred visual style.

**Acceptance Criteria:**
- [ ] Theme toggle in header/settings
- [ ] Smooth transition between themes
- [ ] Theme preference persisted
- [ ] Respects system preference by default
- [ ] Excalidraw theme syncs with app theme

---

### Feature 10: Mobile Responsive Design

**Priority:** P1 (High)
**Effort:** Medium-High (2-3 weeks)

#### User Stories

**US-10.1: Use on Mobile**
> As a user, I want to use Glow on my phone, so I can take notes on the go.

**Acceptance Criteria:**
- [ ] Responsive layout for screens < 768px
- [ ] Touch-friendly toolbar
- [ ] Swipe gestures for navigation
- [ ] Proper keyboard handling on mobile
- [ ] PWA installable on home screen

---

## Implementation Order

### Phase 1: Foundation (Weeks 1-3)
1. **Full-Text Search** - Enables scale
2. **Export to Markdown** - Quick win, breaks lock-in

### Phase 2: Sharing (Weeks 4-6)
3. **Share Links** - Read-only sharing
4. **PDF Export** - Professional output

### Phase 3: Collaboration (Weeks 7-10)
5. **Real-Time Collaboration** - Multi-user editing
6. **Version History** - Safety net

### Phase 4: Organization (Weeks 11-13)
7. **Tags & Filtering** - Document discovery
8. **Templates** - Faster creation

### Phase 5: Polish (Weeks 14-16)
9. **Comments** - Feedback workflow
10. **Mobile Support** - Platform expansion
11. **Theme Toggle** - User preference

---

## Success Metrics

| Feature | Key Metric | Target |
|---------|-----------|--------|
| Search | Search → Document conversion | > 70% |
| Export | Documents exported / active users | > 0.5/month |
| Share | Share links created / documents | > 10% |
| Collaboration | Concurrent editors / shared doc | > 2 avg |
| Version History | Restores / month | < 5% (good = low) |
| Tags | Documents with tags | > 50% |
| Templates | New docs from templates | > 30% |
| Mobile | Mobile sessions / total | > 20% |

---

## Technical Principles

1. **TDD First**: Write failing tests before implementation
2. **Offline First**: All features must work offline, sync when online
3. **Progressive Enhancement**: Core editing works without JS-heavy features
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Sub-100ms interactions, lazy load heavy features
6. **Security**: Sanitize all user input, secure share tokens

---

## Next Steps

1. Review and prioritize with stakeholders
2. Create GitHub issues for Phase 1 features
3. Set up test infrastructure for TDD
4. Begin Search implementation with failing tests
