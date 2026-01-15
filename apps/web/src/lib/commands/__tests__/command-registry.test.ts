/**
 * TDD Tests for Slash Command Registry
 *
 * Slash commands for quick block insertion and actions.
 * Following TDD methodology: write tests first, then implement.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types
type CommandCategory = 'basic' | 'media' | 'advanced' | 'ai' | 'formatting';

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[]; // For fuzzy search
  category: CommandCategory;
  shortcut?: string; // e.g., "h1" for /h1
  execute: (editor: MockEditor, args?: string) => void | Promise<void>;
  isAvailable?: (editor: MockEditor) => boolean;
}

interface CommandSearchResult {
  command: SlashCommand;
  score: number;
  matchedKeyword?: string;
}

// Mock Editor type
interface MockEditor {
  chain: () => MockEditor;
  focus: () => MockEditor;
  setHeading: (opts: { level: number }) => MockEditor;
  setParagraph: () => MockEditor;
  toggleBulletList: () => MockEditor;
  toggleOrderedList: () => MockEditor;
  toggleBlockquote: () => MockEditor;
  toggleCodeBlock: () => MockEditor;
  setHorizontalRule: () => MockEditor;
  insertContent: (content: string) => MockEditor;
  run: () => void;
  state: {
    selection: { from: number; to: number };
  };
}

// Placeholder class - tests will fail until implemented
class CommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  register(_command: SlashCommand): void {
    throw new Error('Not implemented');
  }

  unregister(_commandId: string): boolean {
    throw new Error('Not implemented');
  }

  get(_commandId: string): SlashCommand | undefined {
    throw new Error('Not implemented');
  }

  getAll(): SlashCommand[] {
    throw new Error('Not implemented');
  }

  getByCategory(_category: CommandCategory): SlashCommand[] {
    throw new Error('Not implemented');
  }

  search(_query: string): CommandSearchResult[] {
    throw new Error('Not implemented');
  }

  execute(_commandId: string, _editor: MockEditor, _args?: string): void | Promise<void> {
    throw new Error('Not implemented');
  }

  getCategories(): CommandCategory[] {
    throw new Error('Not implemented');
  }

  hasCommand(_commandId: string): boolean {
    throw new Error('Not implemented');
  }

  getCommandByShortcut(_shortcut: string): SlashCommand | undefined {
    throw new Error('Not implemented');
  }

  get count(): number {
    return this.commands.size;
  }
}

class CommandExecutor {
  constructor(_registry: CommandRegistry) {}

  async execute(
    _command: SlashCommand,
    _editor: MockEditor,
    _args?: string
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  parseArgs(_input: string): { commandId: string; args?: string } {
    throw new Error('Not implemented');
  }
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  let mockEditor: MockEditor;

  beforeEach(() => {
    registry = new CommandRegistry();
    mockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      setHeading: vi.fn().mockReturnThis(),
      setParagraph: vi.fn().mockReturnThis(),
      toggleBulletList: vi.fn().mockReturnThis(),
      toggleOrderedList: vi.fn().mockReturnThis(),
      toggleBlockquote: vi.fn().mockReturnThis(),
      toggleCodeBlock: vi.fn().mockReturnThis(),
      setHorizontalRule: vi.fn().mockReturnThis(),
      insertContent: vi.fn().mockReturnThis(),
      run: vi.fn(),
      state: { selection: { from: 0, to: 0 } },
    };
  });

  // ============================================================================
  // Registration Tests
  // ============================================================================

  describe('command registration', () => {
    it('should register a command', () => {
      const command: SlashCommand = {
        id: 'heading1',
        label: 'Heading 1',
        description: 'Large heading',
        icon: 'H1',
        keywords: ['h1', 'heading', 'title'],
        category: 'basic',
        shortcut: 'h1',
        execute: vi.fn(),
      };

      registry.register(command);

      expect(registry.hasCommand('heading1')).toBe(true);
    });

    it('should retrieve registered command', () => {
      const command: SlashCommand = {
        id: 'test',
        label: 'Test',
        description: 'Test command',
        icon: 'T',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      };

      registry.register(command);

      const retrieved = registry.get('test');
      expect(retrieved?.label).toBe('Test');
    });

    it('should unregister a command', () => {
      const command: SlashCommand = {
        id: 'to-remove',
        label: 'Remove Me',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      };

      registry.register(command);
      expect(registry.hasCommand('to-remove')).toBe(true);

      const result = registry.unregister('to-remove');
      expect(result).toBe(true);
      expect(registry.hasCommand('to-remove')).toBe(false);
    });

    it('should return false when unregistering non-existent command', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });

    it('should overwrite existing command with same ID', () => {
      registry.register({
        id: 'test',
        label: 'Original',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      });

      registry.register({
        id: 'test',
        label: 'Updated',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      });

      expect(registry.get('test')?.label).toBe('Updated');
    });
  });

  // ============================================================================
  // Built-in Commands Tests
  // ============================================================================

  describe('built-in commands', () => {
    beforeEach(() => {
      // Register built-in commands
      const builtIns: SlashCommand[] = [
        {
          id: 'paragraph',
          label: 'Text',
          description: 'Plain paragraph text',
          icon: 'T',
          keywords: ['text', 'paragraph', 'p'],
          category: 'basic',
          shortcut: 'text',
          execute: (editor) => editor.chain().focus().setParagraph().run(),
        },
        {
          id: 'heading1',
          label: 'Heading 1',
          description: 'Large heading',
          icon: 'H1',
          keywords: ['h1', 'heading', 'title', 'header'],
          category: 'basic',
          shortcut: 'h1',
          execute: (editor) =>
            editor.chain().focus().setHeading({ level: 1 }).run(),
        },
        {
          id: 'heading2',
          label: 'Heading 2',
          description: 'Medium heading',
          icon: 'H2',
          keywords: ['h2', 'heading', 'subtitle'],
          category: 'basic',
          shortcut: 'h2',
          execute: (editor) =>
            editor.chain().focus().setHeading({ level: 2 }).run(),
        },
        {
          id: 'heading3',
          label: 'Heading 3',
          description: 'Small heading',
          icon: 'H3',
          keywords: ['h3', 'heading'],
          category: 'basic',
          shortcut: 'h3',
          execute: (editor) =>
            editor.chain().focus().setHeading({ level: 3 }).run(),
        },
        {
          id: 'bullet-list',
          label: 'Bullet List',
          description: 'Unordered list',
          icon: '•',
          keywords: ['bullet', 'list', 'ul', 'unordered'],
          category: 'basic',
          shortcut: 'bullet',
          execute: (editor) => editor.chain().focus().toggleBulletList().run(),
        },
        {
          id: 'numbered-list',
          label: 'Numbered List',
          description: 'Ordered list',
          icon: '1.',
          keywords: ['number', 'ordered', 'list', 'ol'],
          category: 'basic',
          shortcut: 'numbered',
          execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          id: 'quote',
          label: 'Quote',
          description: 'Block quote',
          icon: '"',
          keywords: ['quote', 'blockquote'],
          category: 'basic',
          shortcut: 'quote',
          execute: (editor) => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          id: 'code',
          label: 'Code Block',
          description: 'Code snippet',
          icon: '</>',
          keywords: ['code', 'pre', 'snippet'],
          category: 'basic',
          shortcut: 'code',
          execute: (editor) => editor.chain().focus().toggleCodeBlock().run(),
        },
        {
          id: 'divider',
          label: 'Divider',
          description: 'Horizontal line',
          icon: '—',
          keywords: ['divider', 'hr', 'line', 'separator'],
          category: 'basic',
          shortcut: 'divider',
          execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
        },
        {
          id: 'drawing',
          label: 'Drawing',
          description: 'Excalidraw diagram',
          icon: '✏️',
          keywords: ['drawing', 'excalidraw', 'diagram', 'sketch'],
          category: 'media',
          shortcut: 'draw',
          execute: vi.fn(),
        },
        {
          id: 'ai-generate',
          label: 'AI Generate',
          description: 'Generate content with AI',
          icon: '✨',
          keywords: ['ai', 'generate', 'write', 'create'],
          category: 'ai',
          shortcut: 'ai',
          execute: vi.fn(),
        },
      ];

      builtIns.forEach((cmd) => registry.register(cmd));
    });

    it('should have text/paragraph command', () => {
      expect(registry.hasCommand('paragraph')).toBe(true);
    });

    it('should have heading commands (h1, h2, h3)', () => {
      expect(registry.hasCommand('heading1')).toBe(true);
      expect(registry.hasCommand('heading2')).toBe(true);
      expect(registry.hasCommand('heading3')).toBe(true);
    });

    it('should have list commands', () => {
      expect(registry.hasCommand('bullet-list')).toBe(true);
      expect(registry.hasCommand('numbered-list')).toBe(true);
    });

    it('should have quote command', () => {
      expect(registry.hasCommand('quote')).toBe(true);
    });

    it('should have code block command', () => {
      expect(registry.hasCommand('code')).toBe(true);
    });

    it('should have divider command', () => {
      expect(registry.hasCommand('divider')).toBe(true);
    });

    it('should have drawing command', () => {
      expect(registry.hasCommand('drawing')).toBe(true);
    });

    it('should have AI generate command', () => {
      expect(registry.hasCommand('ai-generate')).toBe(true);
    });
  });

  // ============================================================================
  // Category Filtering Tests
  // ============================================================================

  describe('category filtering', () => {
    beforeEach(() => {
      registry.register({
        id: 'basic1',
        label: 'Basic 1',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      });
      registry.register({
        id: 'basic2',
        label: 'Basic 2',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      });
      registry.register({
        id: 'media1',
        label: 'Media 1',
        description: '',
        icon: '',
        keywords: [],
        category: 'media',
        execute: vi.fn(),
      });
      registry.register({
        id: 'ai1',
        label: 'AI 1',
        description: '',
        icon: '',
        keywords: [],
        category: 'ai',
        execute: vi.fn(),
      });
    });

    it('should filter commands by category', () => {
      const basic = registry.getByCategory('basic');

      expect(basic).toHaveLength(2);
      expect(basic.every((c) => c.category === 'basic')).toBe(true);
    });

    it('should return empty array for category with no commands', () => {
      const advanced = registry.getByCategory('advanced');

      expect(advanced).toHaveLength(0);
    });

    it('should list all categories', () => {
      const categories = registry.getCategories();

      expect(categories).toContain('basic');
      expect(categories).toContain('media');
      expect(categories).toContain('ai');
    });
  });

  // ============================================================================
  // Search Tests
  // ============================================================================

  describe('command search', () => {
    beforeEach(() => {
      registry.register({
        id: 'heading1',
        label: 'Heading 1',
        description: 'Large heading',
        icon: 'H1',
        keywords: ['h1', 'heading', 'title', 'header'],
        category: 'basic',
        shortcut: 'h1',
        execute: vi.fn(),
      });
      registry.register({
        id: 'heading2',
        label: 'Heading 2',
        description: 'Medium heading',
        icon: 'H2',
        keywords: ['h2', 'heading'],
        category: 'basic',
        shortcut: 'h2',
        execute: vi.fn(),
      });
      registry.register({
        id: 'bullet-list',
        label: 'Bullet List',
        description: 'Unordered list',
        icon: '•',
        keywords: ['bullet', 'list'],
        category: 'basic',
        execute: vi.fn(),
      });
    });

    it('should search by label', () => {
      const results = registry.search('heading');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].command.label).toContain('Heading');
    });

    it('should search by keyword', () => {
      const results = registry.search('h1');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].command.id).toBe('heading1');
    });

    it('should search by shortcut', () => {
      const results = registry.search('h2');

      expect(results.some((r) => r.command.id === 'heading2')).toBe(true);
    });

    it('should perform fuzzy matching', () => {
      const results = registry.search('head');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should rank results by relevance', () => {
      const results = registry.search('heading');

      // Exact matches should score higher
      expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score || 0);
    });

    it('should return empty array for no matches', () => {
      const results = registry.search('xyznonexistent');

      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const lower = registry.search('heading');
      const upper = registry.search('HEADING');
      const mixed = registry.search('HeAdInG');

      expect(lower.length).toBe(upper.length);
      expect(upper.length).toBe(mixed.length);
    });
  });

  // ============================================================================
  // Shortcut Lookup Tests
  // ============================================================================

  describe('shortcut lookup', () => {
    beforeEach(() => {
      registry.register({
        id: 'heading1',
        label: 'Heading 1',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        shortcut: 'h1',
        execute: vi.fn(),
      });
      registry.register({
        id: 'no-shortcut',
        label: 'No Shortcut',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      });
    });

    it('should find command by shortcut', () => {
      const command = registry.getCommandByShortcut('h1');

      expect(command?.id).toBe('heading1');
    });

    it('should return undefined for unknown shortcut', () => {
      const command = registry.getCommandByShortcut('xyz');

      expect(command).toBeUndefined();
    });
  });

  // ============================================================================
  // Execution Tests
  // ============================================================================

  describe('command execution', () => {
    it('should execute command by ID', () => {
      const executeFn = vi.fn();
      registry.register({
        id: 'test',
        label: 'Test',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: executeFn,
      });

      registry.execute('test', mockEditor);

      expect(executeFn).toHaveBeenCalledWith(mockEditor, undefined);
    });

    it('should pass arguments to execute function', () => {
      const executeFn = vi.fn();
      registry.register({
        id: 'test',
        label: 'Test',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: executeFn,
      });

      registry.execute('test', mockEditor, 'some args');

      expect(executeFn).toHaveBeenCalledWith(mockEditor, 'some args');
    });

    it('should throw error for non-existent command', () => {
      expect(() => registry.execute('nonexistent', mockEditor)).toThrow();
    });

    it('should check availability before execution', () => {
      const executeFn = vi.fn();
      registry.register({
        id: 'conditional',
        label: 'Conditional',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: executeFn,
        isAvailable: () => false,
      });

      expect(() => registry.execute('conditional', mockEditor)).toThrow(
        /not available/i
      );
    });
  });

  // ============================================================================
  // Get All Tests
  // ============================================================================

  describe('get all commands', () => {
    it('should return all registered commands', () => {
      registry.register({
        id: 'a',
        label: 'A',
        description: '',
        icon: '',
        keywords: [],
        category: 'basic',
        execute: vi.fn(),
      });
      registry.register({
        id: 'b',
        label: 'B',
        description: '',
        icon: '',
        keywords: [],
        category: 'media',
        execute: vi.fn(),
      });

      const all = registry.getAll();

      expect(all).toHaveLength(2);
    });

    it('should return empty array if no commands registered', () => {
      const all = registry.getAll();

      expect(all).toHaveLength(0);
    });
  });
});

// ============================================================================
// Command Executor Tests
// ============================================================================

describe('CommandExecutor', () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    executor = new CommandExecutor(registry);
  });

  describe('argument parsing', () => {
    it('should parse command without args', () => {
      const result = executor.parseArgs('/h1');

      expect(result.commandId).toBe('h1');
      expect(result.args).toBeUndefined();
    });

    it('should parse command with args', () => {
      const result = executor.parseArgs('/ai write a poem about cats');

      expect(result.commandId).toBe('ai');
      expect(result.args).toBe('write a poem about cats');
    });

    it('should handle extra whitespace', () => {
      const result = executor.parseArgs('/h1   ');

      expect(result.commandId).toBe('h1');
    });

    it('should parse shortcut without slash', () => {
      const result = executor.parseArgs('h1');

      expect(result.commandId).toBe('h1');
    });
  });
});

// ============================================================================
// Slash Command Menu UI Tests
// ============================================================================

describe('SlashCommandMenu', () => {
  it.todo('should open on / key at start of line');
  it.todo('should open on / key after space');
  it.todo('should filter commands as user types');
  it.todo('should highlight first result');
  it.todo('should navigate with arrow keys');
  it.todo('should execute on Enter');
  it.todo('should close on Escape');
  it.todo('should close when clicking outside');
  it.todo('should show command description');
  it.todo('should group commands by category');
  it.todo('should show keyboard shortcuts');
});
