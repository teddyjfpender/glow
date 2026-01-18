# Glow Product Issues & Feature Requests

A comprehensive list of well-defined tasks to boost the production feature set.

---

## Critical: File Operations

### Issue 1: Export to PDF
**Priority**: Critical | **Effort**: Medium | **Category**: File Operations

**Description**: Implement PDF export functionality to allow users to save documents as PDF files.

**Acceptance Criteria**:
- [ ] Add "Download as PDF" option in File menu
- [ ] Preserve formatting (fonts, colors, headings, links)
- [ ] Support page breaks and headers/footers
- [ ] Handle embedded drawings (Excalidraw)
- [ ] Show progress indicator for large documents
- [ ] Use client-side PDF generation (e.g., `jspdf` or `@react-pdf/renderer`)

**Technical Notes**:
- Test infrastructure exists at `apps/web/src/lib/export/__tests__/`
- Consider using `html2canvas` + `jspdf` or `puppeteer` for accurate rendering

---

### Issue 2: Export to Markdown
**Priority**: High | **Effort**: Low | **Category**: File Operations

**Description**: Implement Markdown export for interoperability with other tools.

**Acceptance Criteria**:
- [ ] Add "Download as Markdown" option in File menu
- [ ] Convert headings, bold, italic, links, code blocks
- [ ] Handle images as markdown image references
- [ ] Support wiki-links syntax preservation
- [ ] Include frontmatter with document metadata (title, date)

**Technical Notes**:
- TipTap has built-in `getMarkdown()` or use `prosemirror-markdown`
- Test infrastructure exists at `apps/web/src/lib/export/__tests__/`

---

### Issue 3: Export to DOCX
**Priority**: Medium | **Effort**: High | **Category**: File Operations

**Description**: Implement Microsoft Word export for enterprise compatibility.

**Acceptance Criteria**:
- [ ] Add "Download as Word Document" option in File menu
- [ ] Preserve text formatting (bold, italic, underline, colors)
- [ ] Convert headings to Word heading styles
- [ ] Handle page breaks
- [ ] Use `docx` npm package for generation

---

### Issue 4: Import from Markdown
**Priority**: High | **Effort**: Low | **Category**: File Operations

**Description**: Allow users to import existing Markdown files.

**Acceptance Criteria**:
- [ ] Add "Import" > "Markdown file" option in File menu
- [ ] Parse frontmatter for title/metadata
- [ ] Convert markdown to TipTap document structure
- [ ] Handle images (as URLs or base64)
- [ ] Support wiki-links import

---

### Issue 5: Import from DOCX
**Priority**: Medium | **Effort**: High | **Category**: File Operations

**Description**: Allow users to import Word documents.

**Acceptance Criteria**:
- [ ] Add "Import" > "Word Document" option in File menu
- [ ] Extract text content with formatting
- [ ] Convert Word styles to Glow formatting
- [ ] Handle embedded images
- [ ] Use `mammoth.js` for parsing

---

## Critical: Text Formatting

### Issue 6: Bullet and Numbered Lists
**Priority**: Critical | **Effort**: Medium | **Category**: Text Formatting

**Description**: Implement list support (bullet points, numbered lists, checklists).

**Acceptance Criteria**:
- [ ] Add bullet list button to toolbar
- [ ] Add numbered list button to toolbar
- [ ] Add checklist/task list button
- [ ] Support nested lists (Tab to indent, Shift+Tab to outdent)
- [ ] Keyboard shortcuts: `Cmd+Shift+8` (bullet), `Cmd+Shift+7` (numbered)
- [ ] Style lists consistently with document theme

**Technical Notes**:
- TipTap extensions: `@tiptap/extension-bullet-list`, `@tiptap/extension-ordered-list`, `@tiptap/extension-task-list`

---

### Issue 7: Block Quotes
**Priority**: High | **Effort**: Low | **Category**: Text Formatting

**Description**: Add block quote formatting for citations and callouts.

**Acceptance Criteria**:
- [ ] Add blockquote button to toolbar
- [ ] Keyboard shortcut: `Cmd+Shift+B`
- [ ] Style with left border and indentation
- [ ] Support nested blockquotes

**Technical Notes**:
- TipTap extension: `@tiptap/extension-blockquote`

---

### Issue 8: Horizontal Rule / Divider
**Priority**: Medium | **Effort**: Low | **Category**: Text Formatting

**Description**: Implement horizontal divider line insertion.

**Acceptance Criteria**:
- [ ] Add "Insert" > "Horizontal line" menu item
- [ ] Support typing `---` or `***` to auto-convert
- [ ] Style consistently with document theme

**Technical Notes**:
- TipTap extension: `@tiptap/extension-horizontal-rule`

---

### Issue 9: Superscript and Subscript
**Priority**: Low | **Effort**: Low | **Category**: Text Formatting

**Description**: Add superscript and subscript text formatting.

**Acceptance Criteria**:
- [ ] Add Format > Superscript and Subscript options
- [ ] Keyboard shortcuts: `Cmd+.` (super), `Cmd+,` (sub)
- [ ] Support in toolbar dropdown

**Technical Notes**:
- TipTap extensions: `@tiptap/extension-superscript`, `@tiptap/extension-subscript`

---

## Critical: Tables

### Issue 10: Basic Table Support
**Priority**: Critical | **Effort**: High | **Category**: Tables

**Description**: Implement table creation and editing.

**Acceptance Criteria**:
- [ ] Add "Insert" > "Table" with size picker (rows × columns)
- [ ] Support adding/removing rows and columns
- [ ] Support merging cells
- [ ] Tab navigation between cells
- [ ] Resize columns by dragging
- [ ] Basic cell formatting (alignment, background color)

**Technical Notes**:
- TipTap extension: `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`
- Will require custom UI for table controls

---

## Critical: Images

### Issue 11: Image Upload and Embedding
**Priority**: Critical | **Effort**: High | **Category**: Media

**Description**: Allow users to insert images into documents.

**Acceptance Criteria**:
- [ ] Add "Insert" > "Image" menu item
- [ ] Support drag-and-drop image insertion
- [ ] Support paste from clipboard
- [ ] Upload to local storage (IndexedDB as blob)
- [ ] Show image resize handles
- [ ] Support image alignment (left, center, right)
- [ ] Add alt text/caption support

**Technical Notes**:
- TipTap extension: `@tiptap/extension-image`
- Store images as base64 or blob URLs in IndexedDB
- Consider future cloud storage integration

---

## High: Find and Replace

### Issue 12: Find and Replace Dialog
**Priority**: High | **Effort**: Medium | **Category**: Editing

**Description**: Implement find and replace functionality.

**Acceptance Criteria**:
- [ ] Add "Edit" > "Find and replace" menu item
- [ ] Keyboard shortcut: `Cmd+F` (find), `Cmd+H` (replace)
- [ ] Highlight all matches in document
- [ ] Navigate between matches (next/previous)
- [ ] Replace single or replace all
- [ ] Case-sensitive option
- [ ] Regex option (advanced)
- [ ] Show match count

**Technical Notes**:
- TipTap extension: `@tiptap/extension-search-and-replace` or custom implementation

---

## High: Word Count & Document Stats

### Issue 13: Word Count Feature
**Priority**: High | **Effort**: Low | **Category**: Tools

**Description**: Show document statistics (word count, character count, etc.).

**Acceptance Criteria**:
- [ ] Add "Tools" > "Word count" menu item
- [ ] Show modal with: words, characters (with/without spaces), paragraphs, pages
- [ ] Show reading time estimate
- [ ] Optional: Show in status bar

**Technical Notes**:
- Can be calculated from editor content: `editor.state.doc.textContent`

---

## High: Spelling & Grammar

### Issue 14: Spell Check Integration
**Priority**: High | **Effort**: Medium | **Category**: Tools

**Description**: Integrate browser spell check or external API.

**Acceptance Criteria**:
- [ ] Enable browser's built-in spellcheck on editor
- [ ] Add "Tools" > "Spelling and grammar" toggle
- [ ] Red underline for misspelled words
- [ ] Right-click context menu with suggestions
- [ ] Option to add to personal dictionary

**Technical Notes**:
- Browser spellcheck: `spellcheck="true"` attribute
- For advanced: LanguageTool API or similar

---

## High: Undo/Redo Improvements

### Issue 15: Robust Undo/Redo with History
**Priority**: High | **Effort**: Medium | **Category**: Editing

**Description**: Ensure undo/redo works reliably with visual feedback.

**Acceptance Criteria**:
- [ ] Undo/redo buttons in toolbar show enabled/disabled state
- [ ] Keyboard shortcuts work reliably: `Cmd+Z`, `Cmd+Shift+Z`
- [ ] Group related changes (typing, formatting) into single undo steps
- [ ] Show "Undo [action]" tooltip with description
- [ ] History survives page refresh (session storage)

**Technical Notes**:
- TipTap has built-in history extension
- May need configuration for optimal grouping

---

## Medium: Document Organization

### Issue 16: Folders/Collections for Documents
**Priority**: Medium | **Effort**: Medium | **Category**: Organization

**Description**: Allow users to organize documents into folders.

**Acceptance Criteria**:
- [ ] Add folder creation in document list
- [ ] Drag-and-drop documents into folders
- [ ] Nested folders support
- [ ] Folder icons and colors
- [ ] "All Documents" view that ignores folders

**Technical Notes**:
- Extend IndexedDB schema with folder relationships
- Update document list UI

---

### Issue 17: Document Starring/Favorites
**Priority**: Low | **Effort**: Low | **Category**: Organization

**Description**: Allow users to star/favorite documents for quick access.

**Acceptance Criteria**:
- [ ] Star button in document header (already exists, needs wiring)
- [ ] "Starred" filter in document list
- [ ] Star indicator in document cards

---

### Issue 18: Trash/Recycle Bin
**Priority**: Medium | **Effort**: Low | **Category**: Organization

**Description**: Soft-delete documents with recovery option.

**Acceptance Criteria**:
- [ ] Delete moves to trash instead of permanent delete
- [ ] "Trash" section in document list
- [ ] Restore from trash
- [ ] Empty trash (permanent delete)
- [ ] Auto-delete after 30 days (optional)

---

## Medium: Version History

### Issue 19: Document Version History
**Priority**: Medium | **Effort**: High | **Category**: Versioning

**Description**: Track and restore previous versions of documents.

**Acceptance Criteria**:
- [ ] Auto-save versions at regular intervals
- [ ] Manual "Save version" with optional name
- [ ] View version history sidebar
- [ ] Preview previous versions
- [ ] Restore to previous version
- [ ] Compare versions (diff view)

**Technical Notes**:
- Test infrastructure exists at `apps/web/src/lib/versioning/__tests__/`
- Store versions as Y.js snapshots or full document copies

---

## Medium: Print Improvements

### Issue 20: Print Functionality
**Priority**: Medium | **Effort**: Medium | **Category**: Output

**Description**: Improve print support with proper formatting.

**Acceptance Criteria**:
- [ ] "File" > "Print" opens browser print dialog
- [ ] Print styles preserve document formatting
- [ ] Headers/footers appear on printed pages
- [ ] Page numbers in footer
- [ ] Print preview matches actual output

---

## Low: UI Polish

### Issue 21: Keyboard Shortcuts Help Dialog
**Priority**: Low | **Effort**: Low | **Category**: UX

**Description**: Show available keyboard shortcuts.

**Acceptance Criteria**:
- [ ] "Help" > "Keyboard shortcuts" menu item
- [ ] Modal showing all shortcuts organized by category
- [ ] Searchable
- [ ] Platform-aware (Cmd vs Ctrl)

---

### Issue 22: Dark/Light Theme Toggle
**Priority**: Low | **Effort**: Medium | **Category**: UX

**Description**: Allow users to switch between dark and light themes.

**Acceptance Criteria**:
- [ ] Theme toggle in settings or header
- [ ] Remember preference in localStorage
- [ ] Support system preference detection
- [ ] Smooth transition animation

---

### Issue 23: Full Screen / Focus Mode
**Priority**: Low | **Effort**: Low | **Category**: UX

**Description**: Distraction-free writing mode.

**Acceptance Criteria**:
- [ ] "View" > "Full screen" menu item
- [ ] Hide toolbar and sidebars
- [ ] Escape key to exit
- [ ] Optional: typewriter scrolling (keep cursor centered)

---

## Technical Debt

### Issue 24: Implement Stubbed Menu Actions
**Priority**: High | **Effort**: Medium | **Category**: Tech Debt

**Description**: Many MenuBar items call `onAction` but have no implementation.

**Acceptance Criteria**:
- [ ] Audit all menu items in `MenuBar.svelte`
- [ ] Implement or remove non-functional items
- [ ] Add "Coming soon" tooltip for planned features
- [ ] Wire up all Edit menu items (Cut/Copy/Paste)

**Files**:
- `apps/web/src/lib/components/MenuBar.svelte`
- `apps/web/src/lib/components/DocumentPage.svelte`

---

### Issue 25: Complete TDD Test Implementations
**Priority**: Medium | **Effort**: High | **Category**: Tech Debt

**Description**: Many test files have "Not implemented" stubs.

**Acceptance Criteria**:
- [ ] Implement share-links service
- [ ] Implement version-history service
- [ ] Implement daily-notes service
- [ ] Implement templates service
- [ ] Implement commands service
- [ ] Implement search-state functionality

**Files**:
- `apps/web/src/lib/sharing/__tests__/`
- `apps/web/src/lib/versioning/__tests__/`
- `apps/web/src/lib/templates/__tests__/`

---

### Issue 26: Add Rust Backend Tests
**Priority**: Medium | **Effort**: Medium | **Category**: Tech Debt

**Description**: Rust crates have no tests despite test infrastructure.

**Acceptance Criteria**:
- [ ] Add unit tests for glow-core CRDT operations
- [ ] Add integration tests for glow-server API endpoints
- [ ] Add tests for glow-bridge feedback API
- [ ] Add tests for glow-executors log processing

---

### Issue 27: Fix TODO Comments
**Priority**: Low | **Effort**: Low | **Category**: Tech Debt

**Description**: Address TODO comments in codebase.

**Known TODOs**:
- `DocumentPage.svelte:353`: "TODO: Show link preview popup"
- `glow-bridge/api/feedback.rs`: "TODO: Actually interrupt the executor process"
- `glow-server/routes/sync.rs`: "TODO: Broadcast awareness to other connected clients"

---

## Infrastructure

### Issue 28: Connect Backend Database
**Priority**: High | **Effort**: Medium | **Category**: Infrastructure

**Description**: Wire up SQLx database for server-side persistence.

**Acceptance Criteria**:
- [ ] Configure SQLite or PostgreSQL connection
- [ ] Create migrations for documents table
- [ ] Implement document CRUD with database
- [ ] Remove in-memory storage from server

**Technical Notes**:
- SQLx is already a dependency but unused
- Database URL configuration needed

---

### Issue 29: Add Docker Configuration
**Priority**: Medium | **Effort**: Low | **Category**: Infrastructure

**Description**: Containerize the application for easy deployment.

**Acceptance Criteria**:
- [ ] Dockerfile for glow-server
- [ ] Dockerfile for glow-bridge
- [ ] docker-compose.yml for full stack
- [ ] Document deployment process

---

### Issue 30: API Documentation (OpenAPI)
**Priority**: Low | **Effort**: Medium | **Category**: Infrastructure

**Description**: Generate API documentation for backend services.

**Acceptance Criteria**:
- [ ] Add OpenAPI/Swagger annotations to routes
- [ ] Generate API spec file
- [ ] Serve Swagger UI at `/api/docs`

---

## Summary by Priority

| Priority | Count | Issues |
|----------|-------|--------|
| Critical | 5 | #1, #6, #10, #11, Export PDF |
| High | 9 | #2, #4, #12-15, #24, #28 |
| Medium | 9 | #3, #5, #8, #16, #18-20, #25, #29 |
| Low | 7 | #9, #17, #21-23, #26, #27, #30 |

---

## Quick Wins (Low Effort, High Impact)

1. **Word Count** (#13) - Simple calculation, high utility
2. **Blockquotes** (#7) - Single TipTap extension
3. **Horizontal Rule** (#8) - Single TipTap extension
4. **Markdown Export** (#2) - TipTap has built-in support
5. **Spell Check** (#14) - Browser native, just enable it
6. **Keyboard Shortcuts Help** (#21) - Static modal
