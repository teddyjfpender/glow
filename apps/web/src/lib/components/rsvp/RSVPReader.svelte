<script lang="ts">
  interface Props {
    words: string[];
    currentIndex: number;
    isPlaying: boolean;
    wordsPerMinute: number;
    onClose: () => void;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSkipToStart: () => void;
    onSkipToEnd: () => void;
    onSpeedChange: (wpm: number) => void;
    onSeek: (index: number) => void;
  }

  const {
    words,
    currentIndex,
    isPlaying,
    wordsPerMinute,
    onClose,
    onPlayPause,
    onNext,
    onPrev,
    onSkipToStart,
    onSkipToEnd,
    onSpeedChange,
    onSeek: _onSeek,
  }: Props = $props();

  // Get current word
  const currentWord = $derived(words[currentIndex] ?? '');

  // Calculate ORP (Optimal Recognition Point) position - approximately 1/3 of word length
  const orpPosition = $derived(() => {
    const len = currentWord.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 2);
    return Math.floor(len / 3);
  });

  // Split word into three parts: before ORP, ORP letter, after ORP
  const wordParts = $derived(() => {
    const pos = orpPosition();
    return {
      before: currentWord.slice(0, pos),
      orp: currentWord[pos] ?? '',
      after: currentWord.slice(pos + 1),
    };
  });

  // Calculate progress percentage
  const progressPercent = $derived(() => {
    if (words.length === 0) return 0;
    return ((currentIndex + 1) / words.length) * 100;
  });

  // Calculate time remaining
  const timeRemaining = $derived(() => {
    const wordsRemaining = words.length - currentIndex - 1;
    if (wordsRemaining <= 0 || wordsPerMinute <= 0) return '0:00';
    const minutesRemaining = wordsRemaining / wordsPerMinute;
    const totalSeconds = Math.ceil(minutesRemaining * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes)}:${seconds.toString().padStart(2, '0')}`;
  });

  function handleSpeedInput(event: Event) {
    const target = event.target as HTMLInputElement;
    onSpeedChange(parseInt(target.value, 10));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    } else if (event.key === ' ' || event.key === 'Space') {
      event.preventDefault();
      onPlayPause();
    } else if (event.key === 'ArrowRight') {
      onNext();
    } else if (event.key === 'ArrowLeft') {
      onPrev();
    } else if (event.key === 'Home') {
      onSkipToStart();
    } else if (event.key === 'End') {
      onSkipToEnd();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="rsvp-overlay" role="dialog" aria-modal="true" aria-label="RSVP Speed Reader">
  <!-- Exit button -->
  <button class="exit-button" onclick={onClose} aria-label="Exit RSVP reader">
    <span class="exit-icon">×</span>
    Exit
  </button>

  <!-- Center crosshair and word display -->
  <div class="center-container">
    <!-- Vertical crosshair lines -->
    <div class="crosshair-top"></div>
    <div class="crosshair-bottom"></div>

    <!-- Word display -->
    <div class="word-display">
      <span class="word-before">{wordParts().before}</span>
      <span class="word-orp">{wordParts().orp}</span>
      <span class="word-after">{wordParts().after}</span>
    </div>
  </div>

  <!-- Bottom section -->
  <div class="bottom-section">
    <!-- Progress info -->
    <div class="progress-info">
      <span class="word-count">{currentIndex + 1} / {words.length} words</span>
      <span class="time-remaining">{timeRemaining()} remaining</span>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {progressPercent()}%"></div>
    </div>

    <!-- Playback controls -->
    <div class="playback-controls">
      <div class="main-controls">
        <button
          class="control-button skip-button"
          onclick={onSkipToStart}
          aria-label="Skip to start"
          title="Skip to start (Home)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect x="3" y="4" width="2" height="12" />
            <path d="M16 4L8 10L16 16V4Z" />
          </svg>
        </button>

        <button
          class="play-pause-button"
          onclick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {#if isPlaying}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          {:else}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5V19L19 12L8 5Z" />
            </svg>
          {/if}
        </button>

        <button
          class="control-button skip-button"
          onclick={onSkipToEnd}
          aria-label="Skip to end"
          title="Skip to end (End)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4L12 10L4 16V4Z" />
            <rect x="15" y="4" width="2" height="12" />
          </svg>
        </button>
      </div>

      <!-- Word navigation -->
      <div class="word-navigation">
        <button
          class="nav-button"
          onclick={onPrev}
          disabled={currentIndex === 0}
          aria-label="Previous word"
          title="Previous word (Left arrow)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <span class="position-indicator">•</span>

        <button
          class="nav-button"
          onclick={onNext}
          disabled={currentIndex >= words.length - 1}
          aria-label="Next word"
          title="Next word (Right arrow)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <!-- Speed control -->
      <div class="speed-control">
        <input
          type="range"
          min="100"
          max="1000"
          step="50"
          value={wordsPerMinute}
          oninput={handleSpeedInput}
          class="speed-slider"
          aria-label="Reading speed"
        />
        <span class="speed-label">{wordsPerMinute} wpm</span>
      </div>
    </div>
  </div>
</div>

<style>
  .rsvp-overlay {
    position: fixed;
    inset: 0;
    background-color: #0a0a0a;
    display: flex;
    flex-direction: column;
    z-index: 9999;
    color: white;
  }

  /* Exit button */
  .exit-button {
    position: absolute;
    top: 24px;
    left: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background-color 0.15s ease;
  }

  .exit-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .exit-icon {
    font-size: 24px;
    line-height: 1;
  }

  /* Center container */
  .center-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  /* Crosshair lines */
  .crosshair-top,
  .crosshair-bottom {
    position: absolute;
    left: 50%;
    width: 1px;
    background-color: rgba(255, 255, 255, 0.2);
    transform: translateX(-50%);
  }

  .crosshair-top {
    top: 0;
    height: calc(50% - 60px);
  }

  .crosshair-bottom {
    bottom: 200px;
    height: calc(50% - 260px);
  }

  /* Word display */
  .word-display {
    display: flex;
    align-items: baseline;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 80px;
    line-height: 1;
    user-select: none;
  }

  .word-before {
    text-align: right;
    color: white;
  }

  .word-orp {
    color: #ef4444;
    font-weight: 500;
  }

  .word-after {
    text-align: left;
    color: white;
  }

  /* Bottom section */
  .bottom-section {
    padding: 24px 48px 48px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Progress info */
  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }

  /* Progress bar */
  .progress-bar-container {
    width: 100%;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background-color: #ef4444;
    border-radius: 2px;
    transition: width 0.1s ease;
  }

  /* Playback controls */
  .playback-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
  }

  .main-controls {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .control-button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .control-button:hover {
    color: white;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .play-pause-button {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: #ef4444;
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, transform 0.1s ease;
  }

  .play-pause-button:hover {
    background-color: #dc2626;
  }

  .play-pause-button:active {
    transform: scale(0.95);
  }

  /* Word navigation */
  .word-navigation {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .nav-button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .nav-button:hover:not(:disabled) {
    color: white;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .nav-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .position-indicator {
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
  }

  /* Speed control */
  .speed-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .speed-slider {
    width: 200px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .speed-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .speed-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: none;
  }

  .speed-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .word-display {
      font-size: 48px;
    }

    .bottom-section {
      padding: 16px 24px 32px;
    }

    .exit-button {
      top: 16px;
      left: 16px;
    }
  }
</style>
