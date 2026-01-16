/**
 * Bionic Reading State Management
 * Bionic Reading bolds the first portion of each word to create visual fixation points
 * that help the brain read faster by guiding the eye through text.
 */

interface BionicState {
  isActive: boolean;
  intensity: 'low' | 'medium' | 'high';
}

/**
 * Calculate how many characters to bold based on word length and intensity
 */
function getBoldLength(wordLength: number, intensity: 'low' | 'medium' | 'high'): number {
  if (wordLength <= 1) return 1;
  if (wordLength <= 3) return 1;

  const ratios = {
    low: 0.3,
    medium: 0.5,
    high: 0.6,
  };

  const ratio = ratios[intensity];
  return Math.max(1, Math.ceil(wordLength * ratio));
}

/**
 * Transform a single word to bionic format
 * Returns HTML with the first portion bolded
 */
function transformWord(word: string, intensity: 'low' | 'medium' | 'high'): string {
  if (!word || word.length === 0) return word;

  // Check if word is just punctuation or numbers
  if (/^[^a-zA-Z]+$/.test(word)) return word;

  // Find the actual letters in the word (handling leading punctuation)
  const leadingMatch = word.match(/^([^a-zA-Z]*)/);
  const leading = leadingMatch ? leadingMatch[1] : '';
  const rest = word.slice(leading.length);

  if (rest.length === 0) return word;

  const boldLen = getBoldLength(rest.length, intensity);
  const boldPart = rest.slice(0, boldLen);
  const normalPart = rest.slice(boldLen);

  return `${leading}<strong class="bionic-bold">${boldPart}</strong>${normalPart}`;
}

/**
 * Transform text content to bionic reading format
 * Preserves HTML structure while transforming text nodes
 */
export function transformToBionic(
  html: string,
  intensity: 'low' | 'medium' | 'high' = 'medium',
): string {
  // Create a temporary element to parse HTML
  if (typeof document === 'undefined') return html;

  const temp = document.createElement('div');
  temp.innerHTML = html;

  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text.trim().length === 0) return;

      // Split by word boundaries while preserving whitespace
      const transformed = text.replace(/([a-zA-Z]+)/g, (match) => {
        return transformWord(match, intensity);
      });

      // Replace text node with transformed HTML
      const span = document.createElement('span');
      span.innerHTML = transformed;

      // Replace the text node with the span's children
      const parent = node.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, node);
        }
        parent.removeChild(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // Skip certain elements
      const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'STRONG', 'B'];
      if (skipTags.includes(element.tagName)) return;

      // Process child nodes (create array first as we'll be modifying the DOM)
      const children = Array.from(node.childNodes);
      children.forEach(processNode);
    }
  }

  processNode(temp);
  return temp.innerHTML;
}

/**
 * Create bionic reading state manager
 */
function createBionicState(): {
  readonly isActive: boolean;
  readonly intensity: 'low' | 'medium' | 'high';
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
  setIntensity: (intensity: 'low' | 'medium' | 'high') => void;
} {
  let state = $state<BionicState>({
    isActive: false,
    intensity: 'medium',
  });

  function toggle(): void {
    state.isActive = !state.isActive;
  }

  function activate(): void {
    state.isActive = true;
  }

  function deactivate(): void {
    state.isActive = false;
  }

  function setIntensity(intensity: 'low' | 'medium' | 'high'): void {
    state.intensity = intensity;
  }

  return {
    get isActive(): boolean {
      return state.isActive;
    },
    get intensity(): 'low' | 'medium' | 'high' {
      return state.intensity;
    },
    toggle,
    activate,
    deactivate,
    setIntensity,
  };
}

export const bionicState = createBionicState();
