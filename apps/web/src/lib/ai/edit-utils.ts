/**
 * Edit Application Utilities
 * Helpers for applying AI-suggested edits to the TipTap editor
 */

import type { Editor } from '@tiptap/core';
import type { SuggestedEdit } from './types';
import { aiFeedbackState } from './feedback-state.svelte';

/**
 * Apply a suggested edit to the editor.
 * Replaces the original text at the specified range with the suggested text.
 */
export function applyEdit(editor: Editor, commentId: string, edit: SuggestedEdit): boolean {
  if (edit.applied || edit.rejected) {
    return false;
  }

  const { from, to } = edit.range;

  // Verify the text at the range matches what we expect
  const currentText = editor.state.doc.textBetween(from, to, '');
  if (currentText !== edit.originalText) {
    // Text has changed since the edit was suggested, try to find it
    const newRange = findTextInDocument(editor, edit.originalText);
    if (!newRange) {
      console.warn('Could not find original text for edit:', edit.originalText);
      return false;
    }
    // Update range for replacement
    edit.range.from = newRange.from;
    edit.range.to = newRange.to;
  }

  // Apply the edit
  editor
    .chain()
    .focus()
    .setTextSelection({ from: edit.range.from, to: edit.range.to })
    .insertContent(edit.suggestedText)
    .run();

  // Mark the edit as applied in state
  aiFeedbackState.markEditApplied(commentId, edit.id);

  return true;
}

/**
 * Reject a suggested edit (mark it as rejected without applying).
 */
export function rejectEdit(commentId: string, edit: SuggestedEdit): void {
  if (edit.applied || edit.rejected) {
    return;
  }

  aiFeedbackState.markEditRejected(commentId, edit.id);
}

/**
 * Find a text string in the document and return its position range.
 * Used as a fallback when the original range no longer matches.
 */
function findTextInDocument(
  editor: Editor,
  searchText: string
): { from: number; to: number } | null {
  const { doc } = editor.state;
  let result: { from: number; to: number } | null = null;

  doc.descendants((node, pos) => {
    if (result) return false; // Already found

    if (node.isText && node.text) {
      const index = node.text.indexOf(searchText);
      if (index !== -1) {
        result = {
          from: pos + index,
          to: pos + index + searchText.length,
        };
        return false;
      }
    }
    return true;
  });

  return result;
}

/**
 * Apply all pending edits for a comment.
 * Returns the number of successfully applied edits.
 */
export function applyAllEdits(editor: Editor, commentId: string): number {
  const feedback = aiFeedbackState.getFeedback(commentId);
  if (!feedback) return 0;

  let appliedCount = 0;
  const pendingEdits = feedback.suggestedEdits.filter(e => !e.applied && !e.rejected);

  // Sort by position descending to apply from end to start
  // This prevents position shifts from affecting subsequent edits
  const sortedEdits = [...pendingEdits].sort((a, b) => b.range.from - a.range.from);

  for (const edit of sortedEdits) {
    if (applyEdit(editor, commentId, edit)) {
      appliedCount++;
    }
  }

  return appliedCount;
}

/**
 * Reject all pending edits for a comment.
 */
export function rejectAllEdits(commentId: string): void {
  const feedback = aiFeedbackState.getFeedback(commentId);
  if (!feedback) return;

  const pendingEdits = feedback.suggestedEdits.filter(e => !e.applied && !e.rejected);
  for (const edit of pendingEdits) {
    rejectEdit(commentId, edit);
  }
}
