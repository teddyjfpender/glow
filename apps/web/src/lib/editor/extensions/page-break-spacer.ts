/**
 * Page Break Spacer Extension
 *
 * TipTap extension that wraps the page break spacer ProseMirror plugin.
 * Automatically inserts visual spacers at page boundaries so content
 * flows correctly across pages.
 */

import { Extension } from '@tiptap/core';
import { createPageBreakSpacerPlugin } from '../plugins/page-break-spacer';

export interface PageBreakSpacerOptions {
  /**
   * Whether the spacer plugin is enabled
   * @default true
   */
  enabled: boolean;
}

export const PageBreakSpacerExtension = Extension.create<PageBreakSpacerOptions>({
  name: 'pageBreakSpacer',

  addOptions() {
    return {
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.enabled) {
      return [];
    }

    return [createPageBreakSpacerPlugin()];
  },
});

export default PageBreakSpacerExtension;
