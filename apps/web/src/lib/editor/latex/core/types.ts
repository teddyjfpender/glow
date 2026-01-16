import type { KatexOptions } from 'katex';

export interface LatexNodeAttrs {
  latex: string;
  displayMode: boolean;
}

export interface LatexExtensionOptions {
  HTMLAttributes: Record<string, unknown>;
  katexOptions: Partial<KatexOptions>;
}

export interface LatexRenderResult {
  html: string;
  error: boolean;
  errorMessage?: string;
}
