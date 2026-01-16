/**
 * RSVP (Rapid Serial Visual Presentation) State Management
 * Reactive state using Svelte 5 runes for a speed reader
 */

/** Internal state interface */
interface RSVPStateData {
  isActive: boolean;
  isPlaying: boolean;
  words: string[];
  currentIndex: number;
  wordsPerMinute: number;
}

/**
 * Calculate the ORP (Optimal Recognition Point)
 * The letter position that the eye should focus on, typically around 1/3 into the word
 */
function calculateORP(word: string): number {
  // ORP is typically 1/3 into the word, minimum position 1
  const optimalPos = Math.max(1, Math.floor(word.length / 3));
  return optimalPos;
}

/**
 * Parse text into an array of words
 * Handles various whitespace and removes empty entries
 */
function parseTextToWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

function createRSVPState(): {
  // Base state getters
  readonly isActive: boolean;
  readonly isPlaying: boolean;
  readonly words: string[];
  readonly currentIndex: number;
  readonly wordsPerMinute: number;
  // Derived state getters
  readonly currentWord: string;
  readonly totalWords: number;
  readonly progress: number;
  readonly timeRemaining: number;
  readonly wordsRemaining: number;
  readonly focusPosition: number;
  // Actions
  start: (text: string) => void;
  close: () => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  nextWord: () => void;
  prevWord: () => void;
  skipForward: (count: number) => void;
  skipBackward: (count: number) => void;
  setSpeed: (wpm: number) => void;
  seekTo: (index: number) => void;
  reset: () => void;
} {
  let state = $state<RSVPStateData>({
    isActive: false,
    isPlaying: false,
    words: [],
    currentIndex: 0,
    wordsPerMinute: 300,
  });

  // Derived values
  let currentWord = $derived(state.words[state.currentIndex] ?? '');
  let totalWords = $derived(state.words.length);
  let progress = $derived(totalWords > 0 ? (state.currentIndex / totalWords) * 100 : 0);
  let wordsRemaining = $derived(Math.max(0, totalWords - state.currentIndex));
  let timeRemaining = $derived(
    state.wordsPerMinute > 0 ? (wordsRemaining / state.wordsPerMinute) * 60 : 0,
  );
  let focusPosition = $derived(calculateORP(currentWord));

  // Actions
  function start(text: string): void {
    const parsedWords = parseTextToWords(text);
    state.words = parsedWords;
    state.currentIndex = 0;
    state.isActive = true;
    state.isPlaying = false;
  }

  function close(): void {
    state.isActive = false;
    state.isPlaying = false;
    state.words = [];
    state.currentIndex = 0;
  }

  function play(): void {
    if (state.isActive && state.currentIndex < state.words.length) {
      state.isPlaying = true;
    }
  }

  function pause(): void {
    state.isPlaying = false;
  }

  function togglePlayPause(): void {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function nextWord(): void {
    if (state.currentIndex < state.words.length - 1) {
      state.currentIndex += 1;
    } else {
      // Reached the end, pause playback
      state.isPlaying = false;
    }
  }

  function prevWord(): void {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
    }
  }

  function skipForward(count: number): void {
    const newIndex = Math.min(state.currentIndex + count, state.words.length - 1);
    state.currentIndex = Math.max(0, newIndex);
  }

  function skipBackward(count: number): void {
    const newIndex = Math.max(state.currentIndex - count, 0);
    state.currentIndex = newIndex;
  }

  function setSpeed(wpm: number): void {
    if (wpm > 0) {
      state.wordsPerMinute = wpm;
    }
  }

  function seekTo(index: number): void {
    if (index >= 0 && index < state.words.length) {
      state.currentIndex = index;
    }
  }

  function reset(): void {
    state.currentIndex = 0;
    state.isPlaying = false;
  }

  return {
    // Base state getters
    get isActive(): boolean {
      return state.isActive;
    },
    get isPlaying(): boolean {
      return state.isPlaying;
    },
    get words(): string[] {
      return state.words;
    },
    get currentIndex(): number {
      return state.currentIndex;
    },
    get wordsPerMinute(): number {
      return state.wordsPerMinute;
    },
    // Derived state getters
    get currentWord(): string {
      return currentWord;
    },
    get totalWords(): number {
      return totalWords;
    },
    get progress(): number {
      return progress;
    },
    get timeRemaining(): number {
      return timeRemaining;
    },
    get wordsRemaining(): number {
      return wordsRemaining;
    },
    get focusPosition(): number {
      return focusPosition;
    },
    // Actions
    start,
    close,
    play,
    pause,
    togglePlayPause,
    nextWord,
    prevWord,
    skipForward,
    skipBackward,
    setSpeed,
    seekTo,
    reset,
  };
}

export const rsvpState = createRSVPState();
