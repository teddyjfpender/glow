/**
 * LinkParser - Parser for wiki-style [[links]]
 *
 * Extracts, validates, and renders wiki-style backlinks from text content.
 */

export interface ParsedLink {
  title: string;
  start: number;
  end: number;
}

export interface LinkParseResult {
  links: ParsedLink[];
  cleanContent: string;
}

export class LinkParser {
  /**
   * Parse content and extract all wiki-style [[links]]
   * @param content - The text content to parse
   * @returns Object containing array of parsed links and content with links removed
   */
  parse(content: string): LinkParseResult {
    const links: ParsedLink[] = [];
    let cleanContent = content;
    let offset = 0;

    // Match [[...]] patterns, handling nested brackets
    const regex = /\[\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const fullMatch = match[0];
      const innerContent = match[1];

      // Skip empty brackets
      if (!innerContent || innerContent.trim() === '') {
        continue;
      }

      // Extract title (handle display text syntax: [[title|display]])
      const pipeIndex = innerContent.indexOf('|');
      const title = pipeIndex !== -1 ? innerContent.slice(0, pipeIndex) : innerContent;

      links.push({
        title: title.trim(),
        start: match.index,
        end: match.index + fullMatch.length,
      });

      // Remove link from clean content (adjust for previous removals)
      const displayText = pipeIndex !== -1 ? innerContent.slice(pipeIndex + 1) : title;
      const startInClean = match.index - offset;
      cleanContent =
        cleanContent.slice(0, startInClean) +
        displayText +
        cleanContent.slice(startInClean + fullMatch.length);
      offset += fullMatch.length - displayText.length;
    }

    return { links, cleanContent };
  }

  /**
   * Extract just the links array from content
   * @param content - The text content to parse
   * @returns Array of parsed links
   */
  extractLinks(content: string): ParsedLink[] {
    return this.parse(content).links;
  }

  /**
   * Create a wiki-style link from a title
   * @param title - The title to wrap in link syntax
   * @returns Formatted link string
   */
  createLink(title: string): string {
    return `[[${title}]]`;
  }

  /**
   * Validate if a string is valid wiki-link syntax
   * @param text - The text to validate
   * @returns True if valid link syntax
   */
  isValidLinkSyntax(text: string): boolean {
    // Must start with [[ and end with ]]
    if (!text.startsWith('[[') || !text.endsWith(']]')) {
      return false;
    }

    // Extract inner content
    const inner = text.slice(2, -2);

    // Must have non-empty content
    if (!inner || inner.trim() === '') {
      return false;
    }

    return true;
  }

  /**
   * Render a link as HTML
   * @param title - The link title
   * @param resolved - Whether the link target exists
   * @returns HTML string for the link
   */
  renderLink(title: string, resolved: boolean): string {
    if (resolved) {
      const slug = this.titleToSlug(title);
      return `<a href="/documents/${slug}" class="backlink">${title}</a>`;
    } else {
      return `<span class="backlink unresolved">${title}</span>`;
    }
  }

  /**
   * Convert a title to a URL-friendly slug
   * @param title - The title to convert
   * @returns URL-friendly slug
   */
  private titleToSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
