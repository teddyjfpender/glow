/**
 * Excalidraw editor state management using Svelte 5 runes
 */

export type ExcalidrawEditMode = 'none' | 'inline' | 'modal';

interface ExcalidrawEditorState {
  activeId: string | null;
  mode: ExcalidrawEditMode;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

function createExcalidrawState(): {
  readonly activeId: string | null;
  readonly mode: ExcalidrawEditMode;
  readonly hasUnsavedChanges: boolean;
  readonly isLoading: boolean;
  readonly isEditing: boolean;
  openEditor: (id: string, mode: ExcalidrawEditMode) => void;
  closeEditor: () => void;
  setUnsavedChanges: (value: boolean) => void;
  setLoading: (value: boolean) => void;
} {
  let state = $state<ExcalidrawEditorState>({
    activeId: null,
    mode: 'none',
    hasUnsavedChanges: false,
    isLoading: false,
  });

  function openEditor(id: string, mode: ExcalidrawEditMode): void {
    state.activeId = id;
    state.mode = mode;
    state.hasUnsavedChanges = false;
    state.isLoading = true;
  }

  function closeEditor(): void {
    state.activeId = null;
    state.mode = 'none';
    state.hasUnsavedChanges = false;
    state.isLoading = false;
  }

  function setUnsavedChanges(value: boolean): void {
    state.hasUnsavedChanges = value;
  }

  function setLoading(value: boolean): void {
    state.isLoading = value;
  }

  return {
    get activeId(): string | null {
      return state.activeId;
    },
    get mode(): ExcalidrawEditMode {
      return state.mode;
    },
    get hasUnsavedChanges(): boolean {
      return state.hasUnsavedChanges;
    },
    get isLoading(): boolean {
      return state.isLoading;
    },
    get isEditing(): boolean {
      return state.mode !== 'none' && state.activeId !== null;
    },
    openEditor,
    closeEditor,
    setUnsavedChanges,
    setLoading,
  };
}

export const excalidrawState = createExcalidrawState();
