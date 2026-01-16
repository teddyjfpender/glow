import katex, { type KatexOptions } from 'katex';
import type { LatexRenderResult } from './types';

const defaultOptions: KatexOptions = {
  throwOnError: false,
  strict: false,
  trust: true,
  output: 'html',
  macros: {
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\Q": "\\mathbb{Q}",
    "\\C": "\\mathbb{C}",
  },
};

export function renderLatex(
  latex: string,
  options: Partial<KatexOptions> = {}
): LatexRenderResult {
  if (!latex || latex.trim() === '') {
    return { html: '', error: false };
  }
  
  try {
    const html = katex.renderToString(latex, {
      ...defaultOptions,
      ...options,
    });
    return { html, error: false };
  } catch (error) {
    const errorHtml = katex.renderToString(latex, {
      ...defaultOptions,
      ...options,
      throwOnError: false,
    });
    return {
      html: errorHtml,
      error: true,
      errorMessage: error instanceof Error ? error.message : 'Invalid LaTeX',
    };
  }
}

export function isValidLatex(latex: string): boolean {
  try {
    katex.renderToString(latex, { ...defaultOptions, throwOnError: true });
    return true;
  } catch {
    return false;
  }
}
