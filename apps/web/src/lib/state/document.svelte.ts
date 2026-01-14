/**
 * Document state management using Svelte 5 runes.
 */

interface DocumentState {
  id: string | null;
  title: string;
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  wordCount: number;
}

function createDocumentState(): {
  readonly id: string | null;
  readonly title: string;
  readonly content: string;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly lastSaved: Date | null;
  readonly wordCount: number;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  save: () => Promise<void>;
  reset: () => void;
} {
  let state = $state<DocumentState>({
    id: null,
    title: 'Untitled',
    content: '',
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    wordCount: 0,
  });

  // Auto-save timer
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function calculateWordCount(text: string): number {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return 0;
    }
    return trimmed.split(/\s+/).length;
  }

  function setTitle(title: string): void {
    state.title = title;
    state.isDirty = true;
    scheduleSave();
  }

  function setContent(content: string): void {
    state.content = content;
    state.wordCount = calculateWordCount(content);
    state.isDirty = true;
    scheduleSave();
  }

  function scheduleSave(): void {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      void save();
    }, 2000);
  }

  async function save(): Promise<void> {
    if (!state.isDirty || state.isSaving) {
      return;
    }

    state.isSaving = true;

    try {
      // TODO: Implement actual save logic (localStorage/API)
      await new Promise((resolve) => setTimeout(resolve, 100));

      state.isDirty = false;
      state.lastSaved = new Date();
    } finally {
      state.isSaving = false;
    }
  }

  function reset(): void {
    state.id = null;
    state.title = 'Untitled';
    state.content = '';
    state.isDirty = false;
    state.isSaving = false;
    state.lastSaved = null;
    state.wordCount = 0;
  }

  return {
    get id(): string | null {
      return state.id;
    },
    get title(): string {
      return state.title;
    },
    get content(): string {
      return state.content;
    },
    get isDirty(): boolean {
      return state.isDirty;
    },
    get isSaving(): boolean {
      return state.isSaving;
    },
    get lastSaved(): Date | null {
      return state.lastSaved;
    },
    get wordCount(): number {
      return state.wordCount;
    },
    setTitle,
    setContent,
    save,
    reset,
  };
}

export const documentState = createDocumentState();
