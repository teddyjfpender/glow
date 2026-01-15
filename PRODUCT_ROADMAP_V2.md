# Glow Product Roadmap v2.0

> Strategic roadmap for features that create a **step-function improvement** over competitors (Notion, Obsidian, Apple Notes, Craft).

## Competitive Analysis Summary

| Feature | Notion | Obsidian | Apple Notes | Craft | **Glow** |
|---------|--------|----------|-------------|-------|----------|
| Rich Text Editor | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inline Drawing | ❌ | Plugin | Markup | ✅ | **✅ Excalidraw** |
| AI Assistant | ✅ | Plugin | ❌ | ✅ | 🔴 **Gap** |
| Backlinks | ✅ | ✅ | ❌ | ✅ | 🔴 **Gap** |
| Daily Notes | ❌ | ✅ | ❌ | ❌ | 🔴 **Gap** |
| Offline-First | ❌ | ✅ | ✅ | ✅ | ✅ |
| Real-time Collab | ✅ | ❌ | ✅ | ✅ | 🔴 **Gap** |
| Web Clipper | ✅ | Plugin | ❌ | ✅ | 🔴 **Gap** |
| Slash Commands | ✅ | ❌ | ❌ | ✅ | 🔴 **Gap** |
| Templates | ✅ | ✅ | ❌ | ✅ | 🔴 **Gap** |

**Glow's Unique Advantage:** Deep Excalidraw integration for seamless drawing within notes.

---

## Priority Tiers

### 🔴 Tier 0: Critical Differentiators
Features that will make users **choose Glow over alternatives**.

### 🟡 Tier 1: Core Functionality
Features users **expect** from any modern note-taking app.

### 🟢 Tier 2: Engagement & Polish
Features that improve **retention and delight**.

---

# 🔴 Tier 0: Critical Differentiators

---

## Feature 1: AI Assistant

**Priority:** P0 (Critical)
**Effort:** High (3-4 weeks)
**Impact:** Very High - Users now expect AI in productivity tools

### Why This Matters
- Notion, Craft, and Coda all have AI features
- 67% of knowledge workers use AI tools weekly (2024 surveys)
- AI + Drawing = unique creative workflow

### User Stories

#### US-1.1: AI Writing Assistant
> As a user, I want to ask AI to help me write, edit, or brainstorm within my document, so I can create better content faster.

**Acceptance Criteria:**
- [ ] `Cmd/Ctrl+J` opens AI command palette
- [ ] Text selection + AI command operates on selection
- [ ] Available commands: "Improve writing", "Fix grammar", "Make shorter", "Make longer", "Simplify", "Translate to..."
- [ ] AI response streams inline with typing animation
- [ ] "Accept" / "Reject" buttons for AI suggestions
- [ ] Works offline with cached model (optional advanced feature)
- [ ] Usage tracking for rate limiting

#### US-1.2: AI Generate from Prompt
> As a user, I want to type a prompt and have AI generate content, so I can quickly create drafts.

**Acceptance Criteria:**
- [ ] Type `/ai` followed by prompt
- [ ] Examples: `/ai write a meeting agenda for product review`
- [ ] Content inserted at cursor position
- [ ] Can regenerate with same prompt
- [ ] Prompt history for reuse

#### US-1.3: AI Summarize Document
> As a user, I want AI to summarize my long document, so I can quickly share key points.

**Acceptance Criteria:**
- [ ] "Summarize" option in document menu
- [ ] Generates bullet-point summary
- [ ] Option to insert summary at top of document
- [ ] Summary length options: brief (3 points), medium (5-7), detailed (10+)

#### US-1.4: AI Explain Drawing
> As a user, I want AI to describe my Excalidraw diagram, so I can generate alt text or documentation.

**Acceptance Criteria:**
- [ ] Right-click Excalidraw → "Describe with AI"
- [ ] Generates natural language description
- [ ] Can set as alt text for accessibility
- [ ] Works with flowcharts, diagrams, sketches

### Technical Design

```
/apps/web/src/lib/
├── ai/
│   ├── ai-service.ts           # API client for AI provider
│   ├── ai-state.svelte.ts      # Loading, streaming, history state
│   ├── prompts/
│   │   ├── writing.ts          # Writing improvement prompts
│   │   ├── summarize.ts        # Summarization prompts
│   │   └── diagram.ts          # Diagram description prompts
│   ├── streaming.ts            # SSE/streaming response handler
│   └── __tests__/
│       ├── ai-service.test.ts
│       └── prompts.test.ts
├── components/
│   ├── AICommandPalette.svelte
│   ├── AIInlineResponse.svelte
│   └── AILoadingIndicator.svelte
```

**AI Provider Options:**
1. **OpenAI API** - GPT-4o for quality
2. **Anthropic API** - Claude for safety
3. **Local Ollama** - Privacy-focused option
4. **Configurable** - User brings own API key

**API Schema:**
```typescript
interface AIRequest {
  prompt: string;
  context?: string;      // Selected text or document content
  systemPrompt: string;  // Task-specific instructions
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  finishReason: 'stop' | 'length' | 'error';
}
```

---

## Feature 2: Backlinks & Knowledge Graph

**Priority:** P0 (Critical)
**Effort:** High (3-4 weeks)
**Impact:** Very High - Creates "second brain" network effect

### Why This Matters
- Obsidian and Roam's core value proposition
- Creates switching cost (users invest in their graph)
- Enables serendipitous discovery

### User Stories

#### US-2.1: Create Backlink
> As a user, I want to link to another document using `[[document name]]` syntax, so I can connect related ideas.

**Acceptance Criteria:**
- [ ] Typing `[[` opens document search popup
- [ ] Autocomplete from existing document titles
- [ ] Creating link to non-existent document offers to create it
- [ ] Links rendered as clickable chips
- [ ] `Cmd/Ctrl+Click` opens linked document
- [ ] Links work with partial title matches

#### US-2.2: View Backlinks
> As a user, I want to see all documents that link to the current document, so I can discover connections.

**Acceptance Criteria:**
- [ ] "Backlinks" panel in sidebar (collapsible)
- [ ] Shows document title + context snippet
- [ ] Click to navigate to linking document
- [ ] Badge showing backlink count in document list
- [ ] Updates in real-time as links are added/removed

#### US-2.3: Knowledge Graph View
> As a user, I want to visualize my documents as a network graph, so I can see relationships and clusters.

**Acceptance Criteria:**
- [ ] "Graph View" button in sidebar
- [ ] Interactive force-directed graph
- [ ] Nodes = documents, Edges = links
- [ ] Click node to open document
- [ ] Zoom, pan, search within graph
- [ ] Highlight connected nodes on hover
- [ ] Filter by tag or date range

#### US-2.4: Unlinked Mentions
> As a user, I want to see mentions of the current document's title in other documents, even without explicit links.

**Acceptance Criteria:**
- [ ] "Unlinked Mentions" section in backlinks panel
- [ ] Shows documents containing the title as text
- [ ] One-click to convert mention to link
- [ ] Case-insensitive matching

### Technical Design

```
/apps/web/src/lib/
├── backlinks/
│   ├── link-parser.ts          # Extract [[links]] from content
│   ├── link-index.ts           # Build/query link graph
│   ├── backlinks-state.svelte.ts
│   └── __tests__/
│       ├── link-parser.test.ts
│       └── link-index.test.ts
├── graph/
│   ├── graph-builder.ts        # Convert links to graph data
│   ├── graph-layout.ts         # Force-directed layout
│   └── __tests__/
│       └── graph-builder.test.ts
├── components/
│   ├── BacklinksPanel.svelte
│   ├── LinkAutocomplete.svelte
│   ├── GraphView.svelte
│   └── GraphNode.svelte
├── editor/extensions/
│   └── backlink.ts             # TipTap extension for [[links]]
```

**Link Index Schema:**
```typescript
interface LinkIndex {
  // Forward links: docId → Set of linked docIds
  outgoing: Map<string, Set<string>>;
  // Backlinks: docId → Set of linking docIds
  incoming: Map<string, Set<string>>;
  // Link text → docId mapping for resolution
  titleToId: Map<string, string>;
}
```

**Graph Data Structure:**
```typescript
interface GraphData {
  nodes: Array<{
    id: string;
    title: string;
    linkCount: number;
    tags: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
}
```

---

## Feature 3: Slash Commands

**Priority:** P0 (Critical)
**Effort:** Medium (1-2 weeks)
**Impact:** High - Power user workflow, discoverability

### Why This Matters
- Notion's signature UX pattern
- Makes features discoverable
- Reduces toolbar clicking

### User Stories

#### US-3.1: Insert Block via Slash Command
> As a user, I want to type `/` to see available blocks and insert them, so I can create content without leaving the keyboard.

**Acceptance Criteria:**
- [ ] Typing `/` at start of line or after space opens command menu
- [ ] Commands grouped by category (Basic, Media, Advanced, AI)
- [ ] Keyboard navigation (↑↓) and selection (Enter)
- [ ] Fuzzy search filtering as user types
- [ ] Most-used commands shown first
- [ ] Command shortcuts shown (e.g., `/h1` for heading)

**Available Commands:**
```
Basic Blocks:
  /text, /h1, /h2, /h3, /bullet, /numbered, /todo, /quote, /divider, /code

Media:
  /image, /drawing (Excalidraw), /embed, /file

Advanced:
  /table, /callout, /toggle, /columns

AI:
  /ai [prompt], /summarize, /translate
```

#### US-3.2: Quick Formatting
> As a user, I want to type formatting shortcuts like `/bold`, so I can format without toolbar.

**Acceptance Criteria:**
- [ ] `/bold` wraps selection in bold
- [ ] `/italic`, `/underline`, `/strike` work similarly
- [ ] `/link` opens link dialog
- [ ] `/color [name]` applies text color

### Technical Design

```
/apps/web/src/lib/
├── commands/
│   ├── command-registry.ts     # Register all slash commands
│   ├── command-executor.ts     # Execute selected command
│   ├── command-state.svelte.ts
│   └── __tests__/
│       ├── command-registry.test.ts
│       └── command-executor.test.ts
├── components/
│   ├── SlashCommandMenu.svelte
│   ├── CommandItem.svelte
│   └── CommandGroup.svelte
├── editor/extensions/
│   └── slash-commands.ts       # TipTap extension
```

**Command Interface:**
```typescript
interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];           // For fuzzy search
  category: 'basic' | 'media' | 'advanced' | 'ai';
  shortcut?: string;            // e.g., "h1" for /h1
  execute: (editor: Editor, args?: string) => void;
}
```

---

## Feature 4: Daily Notes / Journal

**Priority:** P0 (Critical)
**Effort:** Medium (1-2 weeks)
**Impact:** High - Creates daily habit, increases engagement

### Why This Matters
- Obsidian's most-used feature
- Creates daily engagement habit
- Natural entry point for new notes

### User Stories

#### US-4.1: Open Today's Note
> As a user, I want to quickly open or create today's note, so I can capture thoughts throughout the day.

**Acceptance Criteria:**
- [ ] "Daily Note" button in sidebar (always visible)
- [ ] `Cmd/Ctrl+D` keyboard shortcut
- [ ] Automatically creates note with today's date if doesn't exist
- [ ] Title format: "2024-01-15" (ISO date, configurable)
- [ ] Opens existing note if already created today
- [ ] Daily note template applied to new notes

#### US-4.2: Navigate Daily Notes
> As a user, I want to navigate between daily notes chronologically, so I can review past entries.

**Acceptance Criteria:**
- [ ] Previous/Next day buttons in daily note header
- [ ] Calendar picker for date selection
- [ ] "Daily Notes" section in sidebar showing recent entries
- [ ] Jump to any date via date picker

#### US-4.3: Daily Note Template
> As a user, I want to set a template for daily notes, so each day starts with my preferred structure.

**Acceptance Criteria:**
- [ ] Default template: Date heading + empty sections
- [ ] Customizable template in settings
- [ ] Template variables: `{{date}}`, `{{day}}`, `{{time}}`
- [ ] Option to include yesterday's incomplete todos

#### US-4.4: Weekly/Monthly Reviews
> As a user, I want to generate weekly/monthly review documents, so I can reflect on progress.

**Acceptance Criteria:**
- [ ] "Generate Weekly Review" command
- [ ] Aggregates content from daily notes
- [ ] Shows todos completed vs created
- [ ] Links to each daily note

### Technical Design

```
/apps/web/src/lib/
├── daily-notes/
│   ├── daily-note-service.ts   # Create/find daily notes
│   ├── date-utils.ts           # Date formatting, navigation
│   ├── template-vars.ts        # Template variable substitution
│   └── __tests__/
│       ├── daily-note-service.test.ts
│       └── date-utils.test.ts
├── components/
│   ├── DailyNoteButton.svelte
│   ├── DailyNoteHeader.svelte
│   ├── CalendarPicker.svelte
│   └── WeeklyReview.svelte
```

**Daily Note Title Convention:**
```typescript
const DAILY_NOTE_FORMAT = 'YYYY-MM-DD';  // 2024-01-15
const DAILY_NOTE_PREFIX = 'daily/';       // daily/2024-01-15
```

---

## Feature 5: Smart Templates with Variables

**Priority:** P0 (Critical)
**Effort:** Medium (1-2 weeks)
**Impact:** High - Accelerates document creation

### Why This Matters
- Static templates are table stakes
- Dynamic templates create real time savings
- Differentiates from Apple Notes

### User Stories

#### US-5.1: Create Document from Template
> As a user, I want to create a document from a template with auto-filled variables.

**Acceptance Criteria:**
- [ ] Template gallery on home page
- [ ] Built-in templates: Meeting Notes, Project Plan, Weekly Review, 1:1 Meeting, Decision Log
- [ ] Variable prompts on template selection
- [ ] Variables: `{{title}}`, `{{date}}`, `{{author}}`, `{{project}}`
- [ ] Custom variables defined in template

#### US-5.2: Save Document as Template
> As a user, I want to save any document as a reusable template.

**Acceptance Criteria:**
- [ ] "Save as Template" in document menu
- [ ] Define variable placeholders in content
- [ ] Set template name and description
- [ ] Template icon selection
- [ ] Templates appear in gallery

#### US-5.3: Template Variables
> As a user, I want templates to prompt me for variables when creating a document.

**Acceptance Criteria:**
- [ ] Modal prompts for each variable
- [ ] Variable types: text, date, select (dropdown), person
- [ ] Default values supported
- [ ] Skip optional variables
- [ ] Variables replaced throughout document

### Technical Design

```
/apps/web/src/lib/
├── templates/
│   ├── template-service.ts
│   ├── template-parser.ts      # Parse {{variables}}
│   ├── built-in/
│   │   ├── meeting-notes.ts
│   │   ├── project-plan.ts
│   │   ├── weekly-review.ts
│   │   └── decision-log.ts
│   └── __tests__/
│       ├── template-service.test.ts
│       └── template-parser.test.ts
├── components/
│   ├── TemplateGallery.svelte
│   ├── TemplateCard.svelte
│   ├── TemplateVariableModal.svelte
│   └── TemplateEditor.svelte
```

**Template Schema:**
```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'work' | 'personal' | 'planning' | 'custom';
  content: string;              // HTML with {{variables}}
  variables: TemplateVariable[];
  isBuiltIn: boolean;
  createdAt: Date;
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'select' | 'person';
  label: string;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];           // For select type
  required: boolean;
}
```

---

## Feature 6: Web Clipper

**Priority:** P1 (High)
**Effort:** Medium-High (2-3 weeks)
**Impact:** High - Captures content from anywhere

### Why This Matters
- Notion's web clipper is highly used
- Enables "capture everywhere" workflow
- Brings external content into Glow ecosystem

### User Stories

#### US-6.1: Clip Web Page
> As a user, I want to save web pages to Glow from my browser.

**Acceptance Criteria:**
- [ ] Browser extension for Chrome/Firefox/Safari
- [ ] Click extension icon → select destination document or create new
- [ ] Options: Full page, Selection only, Simplified (reader mode)
- [ ] Preserves: headings, text, images, links
- [ ] Strips: ads, navigation, scripts
- [ ] Adds source URL as metadata

#### US-6.2: Clip Selection
> As a user, I want to clip just a selection from a web page.

**Acceptance Criteria:**
- [ ] Select text → right-click → "Save to Glow"
- [ ] Selection preserved with formatting
- [ ] Source URL appended
- [ ] Quick-add to today's daily note option

#### US-6.3: Clip to Existing Document
> As a user, I want to append clipped content to an existing document.

**Acceptance Criteria:**
- [ ] Search/select destination document
- [ ] Append at end or at cursor position
- [ ] Preview before saving
- [ ] "Recently used" documents shown first

### Technical Design

```
/apps/web/src/lib/
├── clipper/
│   ├── clip-processor.ts       # Clean/convert HTML
│   ├── readability.ts          # Extract article content
│   └── __tests__/
│       └── clip-processor.test.ts

/browser-extension/
├── manifest.json
├── background.ts
├── content-script.ts
├── popup/
│   ├── Popup.svelte
│   └── DocumentPicker.svelte
├── utils/
│   └── api-client.ts           # Communicate with Glow app
```

---

# 🟡 Tier 1: Core Functionality

---

## Feature 7: Full-Text Search
*(Already defined in v1 roadmap - see existing tests)*

## Feature 8: Export/Import
*(Already defined in v1 roadmap - see existing tests)*

## Feature 9: Share Links
*(Already defined in v1 roadmap - see existing tests)*

## Feature 10: Real-Time Collaboration
*(Already defined in v1 roadmap - see existing tests)*

## Feature 11: Version History
*(Already defined in v1 roadmap - see existing tests)*

---

# 🟢 Tier 2: Engagement & Polish

---

## Feature 12: Focus Mode

**Priority:** P2 (Medium)
**Effort:** Low (3-5 days)
**Impact:** Medium - Improves writing experience

### User Stories

#### US-12.1: Enter Focus Mode
> As a user, I want a distraction-free writing mode that hides all UI except the document.

**Acceptance Criteria:**
- [ ] `Cmd/Ctrl+Shift+F` toggles focus mode
- [ ] Hides: sidebar, toolbar, header, status bar
- [ ] Shows: only document content, centered
- [ ] Escape exits focus mode
- [ ] Typewriter scrolling (current line stays centered)
- [ ] Optional: ambient sounds/music

### Technical Design

```
/apps/web/src/lib/
├── focus/
│   ├── focus-state.svelte.ts
│   └── __tests__/
│       └── focus-state.test.ts
├── components/
│   └── FocusMode.svelte
```

---

## Feature 13: Keyboard Shortcuts Reference

**Priority:** P2 (Medium)
**Effort:** Low (2-3 days)

### User Stories

#### US-13.1: View All Shortcuts
> As a user, I want to see all available keyboard shortcuts.

**Acceptance Criteria:**
- [ ] `Cmd/Ctrl+/` opens shortcuts reference
- [ ] Grouped by category (Navigation, Editing, Formatting)
- [ ] Searchable
- [ ] Shows current vs default shortcuts
- [ ] Link to customize shortcuts (future)

---

## Feature 14: Quick Capture (Global Hotkey)

**Priority:** P2 (Medium)
**Effort:** Medium (1 week)

### User Stories

#### US-14.1: Capture Note from Anywhere
> As a user, I want to capture a quick note without opening Glow.

**Acceptance Criteria:**
- [ ] Global hotkey (configurable, default: `Cmd+Shift+G`)
- [ ] Small floating window appears
- [ ] Type note → Enter to save
- [ ] Saves to Inbox or Daily Note
- [ ] Works when Glow is minimized/closed

---

# Implementation Phases

## Phase 1: AI & Smart Features (Weeks 1-4)
1. **AI Assistant** - Integrate AI writing help
2. **Slash Commands** - Discoverability & power user UX
3. **Smart Templates** - Dynamic document creation

## Phase 2: Knowledge Management (Weeks 5-8)
4. **Backlinks** - `[[wiki-links]]` and backlink panel
5. **Knowledge Graph** - Visual relationship explorer
6. **Daily Notes** - Journal workflow

## Phase 3: Core Features (Weeks 9-12)
7. **Full-Text Search** - Already has tests
8. **Export/Import** - Already has tests
9. **Share Links** - Already has tests

## Phase 4: Collaboration (Weeks 13-16)
10. **Real-Time Collaboration** - Already has tests
11. **Version History** - Already has tests

## Phase 5: Expansion (Weeks 17-20)
12. **Web Clipper** - Browser extension
13. **Focus Mode** - Distraction-free writing
14. **Mobile Support** - Responsive design

---

# Success Metrics

| Feature | Key Metric | Target |
|---------|-----------|--------|
| AI Assistant | AI commands/user/week | > 5 |
| Backlinks | Documents with links | > 40% |
| Daily Notes | Daily note streak (avg) | > 5 days |
| Slash Commands | Commands used/document | > 3 |
| Templates | Docs from templates | > 30% |
| Web Clipper | Clips/user/month | > 10 |
| Search | Search conversion rate | > 70% |
| Collaboration | Multi-user sessions | > 20% |

---

# Technical Principles

1. **TDD First**: Write failing tests before any implementation
2. **Offline First**: All features work offline, sync when online
3. **AI-Ready**: Design for AI integration from the start
4. **Graph-Native**: Data model supports relationships
5. **Keyboard-First**: Every action has a shortcut
6. **Performance**: < 100ms interactions
7. **Privacy**: User data stays local by default, AI opt-in

---

# TDD Test File Checklist

| Feature | Test File | Status |
|---------|-----------|--------|
| Search Index | `search-index.test.ts` | ✅ Created |
| Search State | `search-state.test.ts` | ✅ Created |
| Markdown Export | `markdown-exporter.test.ts` | ✅ Created |
| PDF Export | `pdf-exporter.test.ts` | ✅ Created |
| Share Links | `share-link.test.ts` | ✅ Created |
| Version History | `version-history.test.ts` | ✅ Created |
| AI Service | `ai-service.test.ts` | 🔴 To Create |
| Backlinks | `backlink-index.test.ts` | 🔴 To Create |
| Knowledge Graph | `graph-builder.test.ts` | 🔴 To Create |
| Slash Commands | `command-registry.test.ts` | 🔴 To Create |
| Daily Notes | `daily-note-service.test.ts` | 🔴 To Create |
| Templates | `template-service.test.ts` | 🔴 To Create |
| Web Clipper | `clip-processor.test.ts` | 🔴 To Create |
| Focus Mode | `focus-state.test.ts` | 🔴 To Create |

---

# Next Steps

1. Create TDD test files for Tier 0 features
2. Review and prioritize with stakeholders
3. Set up AI provider integration (API keys)
4. Begin AI Assistant implementation
5. Track progress against success metrics
