/**
 * TDD Tests for Template Service
 *
 * Smart templates with variables for faster document creation.
 * Following TDD methodology: write tests first, then implement.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Types
interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'select' | 'person' | 'number';
  label: string;
  placeholder?: string;
  defaultValue?: string;
  options?: string[]; // For select type
  required: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'work' | 'personal' | 'planning' | 'custom';
  content: string; // HTML with {{variables}}
  variables: TemplateVariable[];
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

interface TemplateParseResult {
  variables: string[];
  cleanContent: string;
}

type TemplateRenderOptions = Record<string, string | Date | number>;

// Placeholder class - tests will fail until implemented
class TemplateService {
  getTemplates(): Promise<Template[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  getTemplate(_id: string): Promise<Template | null> {
    return Promise.reject(new Error('Not implemented'));
  }

  getBuiltInTemplates(): Promise<Template[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  getCustomTemplates(): Promise<Template[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  getTemplatesByCategory(_category: Template['category']): Promise<Template[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  createTemplate(
    _template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Promise<Template> {
    return Promise.reject(new Error('Not implemented'));
  }

  updateTemplate(_id: string, _updates: Partial<Template>): Promise<Template> {
    return Promise.reject(new Error('Not implemented'));
  }

  deleteTemplate(_id: string): Promise<boolean> {
    return Promise.reject(new Error('Not implemented'));
  }

  renderTemplate(
    _templateId: string,
    _values: TemplateRenderOptions
  ): Promise<string> {
    return Promise.reject(new Error('Not implemented'));
  }

  parseVariables(_content: string): TemplateParseResult {
    throw new Error('Not implemented');
  }

  validateVariables(
    _template: Template,
    _values: TemplateRenderOptions
  ): { valid: boolean; errors: string[] } {
    throw new Error('Not implemented');
  }

  incrementUsageCount(_templateId: string): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  getMostUsedTemplates(_limit?: number): Promise<Template[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  searchTemplates(_query: string): Promise<Template[]> {
    return Promise.reject(new Error('Not implemented'));
  }
}

class TemplateParser {
  parse(_content: string): TemplateParseResult {
    throw new Error('Not implemented');
  }

  render(_content: string, _values: TemplateRenderOptions): string {
    throw new Error('Not implemented');
  }

  extractVariables(_content: string): string[] {
    throw new Error('Not implemented');
  }

  formatDate(_date: Date, _format?: string): string {
    throw new Error('Not implemented');
  }

  getBuiltInVariables(): Record<string, () => string> {
    throw new Error('Not implemented');
  }
}

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Template Retrieval Tests
  // ============================================================================

  describe('template retrieval', () => {
    it('should return all templates', async () => {
      const templates = await service.getTemplates();

      expect(Array.isArray(templates)).toBe(true);
    });

    it('should include built-in templates', async () => {
      const templates = await service.getBuiltInTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.isBuiltIn)).toBe(true);
    });

    it('should return template by ID', async () => {
      const templates = await service.getBuiltInTemplates();
      const first = templates[0];

      const template = await service.getTemplate(first.id);

      expect(template).not.toBeNull();
      expect(template?.id).toBe(first.id);
    });

    it('should return null for non-existent ID', async () => {
      const template = await service.getTemplate('nonexistent');

      expect(template).toBeNull();
    });

    it('should filter templates by category', async () => {
      const workTemplates = await service.getTemplatesByCategory('work');

      expect(workTemplates.every((t) => t.category === 'work')).toBe(true);
    });

    it('should return custom templates separately', async () => {
      await service.createTemplate({
        name: 'My Template',
        description: 'Custom template',
        icon: '📝',
        category: 'custom',
        content: '<p>Hello</p>',
        variables: [],
        isBuiltIn: false,
      });

      const custom = await service.getCustomTemplates();

      expect(custom.length).toBeGreaterThan(0);
      expect(custom.every((t) => !t.isBuiltIn)).toBe(true);
    });
  });

  // ============================================================================
  // Built-in Templates Tests
  // ============================================================================

  describe('built-in templates', () => {
    it('should include Meeting Notes template', async () => {
      const templates = await service.getBuiltInTemplates();
      const meetingNotes = templates.find((t) => t.name === 'Meeting Notes');

      expect(meetingNotes).toBeDefined();
      expect(meetingNotes?.content).toContain('{{date}}');
    });

    it('should include Project Plan template', async () => {
      const templates = await service.getBuiltInTemplates();
      const projectPlan = templates.find((t) => t.name === 'Project Plan');

      expect(projectPlan).toBeDefined();
    });

    it('should include Weekly Review template', async () => {
      const templates = await service.getBuiltInTemplates();
      const weeklyReview = templates.find((t) => t.name === 'Weekly Review');

      expect(weeklyReview).toBeDefined();
    });

    it('should include Decision Log template', async () => {
      const templates = await service.getBuiltInTemplates();
      const decisionLog = templates.find((t) => t.name === 'Decision Log');

      expect(decisionLog).toBeDefined();
    });

    it('should include 1:1 Meeting template', async () => {
      const templates = await service.getBuiltInTemplates();
      const oneOnOne = templates.find((t) => t.name.includes('1:1'));

      expect(oneOnOne).toBeDefined();
    });

    it('should not allow deleting built-in templates', async () => {
      const templates = await service.getBuiltInTemplates();
      const first = templates[0];

      await expect(service.deleteTemplate(first.id)).rejects.toThrow(
        /built-in|cannot delete/i
      );
    });
  });

  // ============================================================================
  // Template Creation Tests
  // ============================================================================

  describe('template creation', () => {
    it('should create custom template', async () => {
      const template = await service.createTemplate({
        name: 'My Custom Template',
        description: 'A custom template',
        icon: '🔥',
        category: 'custom',
        content: '<h1>{{title}}</h1><p>Created on {{date}}</p>',
        variables: [
          { name: 'title', type: 'text', label: 'Title', required: true },
        ],
        isBuiltIn: false,
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('My Custom Template');
      expect(template.createdAt).toBeDefined();
      expect(template.usageCount).toBe(0);
    });

    it('should auto-generate ID', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      expect(template.id).toMatch(/^[a-z0-9-]+$/);
    });

    it('should set timestamps on creation', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      expect(template.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(template.updatedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should extract variables from content automatically', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<p>Hello {{name}}, today is {{date}}</p>',
        variables: [], // Auto-extract
        isBuiltIn: false,
      });

      expect(template.variables.length).toBe(2);
    });
  });

  // ============================================================================
  // Template Update Tests
  // ============================================================================

  describe('template update', () => {
    it('should update template properties', async () => {
      const template = await service.createTemplate({
        name: 'Original',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      const updated = await service.updateTemplate(template.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update timestamp on modification', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      vi.advanceTimersByTime(60000);

      const updated = await service.updateTemplate(template.id, {
        description: 'New description',
      });

      expect(updated.updatedAt).not.toEqual(template.updatedAt);
    });

    it('should not update built-in templates', async () => {
      const templates = await service.getBuiltInTemplates();
      const first = templates[0];

      await expect(
        service.updateTemplate(first.id, { name: 'Changed' })
      ).rejects.toThrow(/built-in|cannot modify/i);
    });
  });

  // ============================================================================
  // Template Deletion Tests
  // ============================================================================

  describe('template deletion', () => {
    it('should delete custom template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      const result = await service.deleteTemplate(template.id);

      expect(result).toBe(true);

      const deleted = await service.getTemplate(template.id);
      expect(deleted).toBeNull();
    });

    it('should return false for non-existent template', async () => {
      const result = await service.deleteTemplate('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Template Rendering Tests
  // ============================================================================

  describe('template rendering', () => {
    it('should render template with variable values', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<h1>{{title}}</h1><p>By {{author}}</p>',
        variables: [
          { name: 'title', type: 'text', label: 'Title', required: true },
          { name: 'author', type: 'text', label: 'Author', required: true },
        ],
        isBuiltIn: false,
      });

      const rendered = await service.renderTemplate(template.id, {
        title: 'My Document',
        author: 'John Doe',
      });

      expect(rendered).toContain('My Document');
      expect(rendered).toContain('John Doe');
      expect(rendered).not.toContain('{{');
    });

    it('should render date variables', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<p>Created: {{date}}</p>',
        variables: [
          { name: 'date', type: 'date', label: 'Date', required: true },
        ],
        isBuiltIn: false,
      });

      const rendered = await service.renderTemplate(template.id, {
        date: new Date('2024-01-15'),
      });

      expect(rendered).toMatch(/2024|January|15/);
    });

    it('should use default values when not provided', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<p>Hello {{name}}</p>',
        variables: [
          {
            name: 'name',
            type: 'text',
            label: 'Name',
            defaultValue: 'World',
            required: false,
          },
        ],
        isBuiltIn: false,
      });

      const rendered = await service.renderTemplate(template.id, {});

      expect(rendered).toContain('World');
    });

    it('should throw error for missing required variables', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<p>{{required_field}}</p>',
        variables: [
          {
            name: 'required_field',
            type: 'text',
            label: 'Required',
            required: true,
          },
        ],
        isBuiltIn: false,
      });

      await expect(service.renderTemplate(template.id, {})).rejects.toThrow(
        /required|missing/i
      );
    });

    it('should render built-in variables automatically', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<p>Today: {{today}}, Now: {{now}}</p>',
        variables: [],
        isBuiltIn: false,
      });

      const rendered = await service.renderTemplate(template.id, {});

      expect(rendered).toMatch(/2024/);
      expect(rendered).not.toContain('{{today}}');
    });
  });

  // ============================================================================
  // Variable Validation Tests
  // ============================================================================

  describe('variable validation', () => {
    it('should validate all required fields present', () => {
      const template: Template = {
        id: 't1',
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [
          { name: 'a', type: 'text', label: 'A', required: true },
          { name: 'b', type: 'text', label: 'B', required: true },
        ],
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const result = service.validateVariables(template, { a: 'value' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field 'b'");
    });

    it('should pass validation when all required fields present', () => {
      const template: Template = {
        id: 't1',
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [
          { name: 'a', type: 'text', label: 'A', required: true },
        ],
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const result = service.validateVariables(template, { a: 'value' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate select type against options', () => {
      const template: Template = {
        id: 't1',
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [
          {
            name: 'priority',
            type: 'select',
            label: 'Priority',
            options: ['low', 'medium', 'high'],
            required: true,
          },
        ],
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const invalid = service.validateVariables(template, {
        priority: 'invalid',
      });
      expect(invalid.valid).toBe(false);

      const valid = service.validateVariables(template, { priority: 'high' });
      expect(valid.valid).toBe(true);
    });
  });

  // ============================================================================
  // Usage Tracking Tests
  // ============================================================================

  describe('usage tracking', () => {
    it('should increment usage count on render', async () => {
      const template = await service.createTemplate({
        name: 'Test',
        description: '',
        icon: '',
        category: 'custom',
        content: '<p>Hello</p>',
        variables: [],
        isBuiltIn: false,
      });

      expect(template.usageCount).toBe(0);

      await service.renderTemplate(template.id, {});
      await service.incrementUsageCount(template.id);

      const updated = await service.getTemplate(template.id);
      expect(updated?.usageCount).toBe(1);
    });

    it('should return most used templates', async () => {
      // Create templates with different usage counts
      const t1 = await service.createTemplate({
        name: 'Rarely Used',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      const t2 = await service.createTemplate({
        name: 'Frequently Used',
        description: '',
        icon: '',
        category: 'custom',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      // Simulate usage
      for (let i = 0; i < 10; i++) {
        await service.incrementUsageCount(t2.id);
      }
      await service.incrementUsageCount(t1.id);

      const mostUsed = await service.getMostUsedTemplates(2);

      expect(mostUsed[0].id).toBe(t2.id);
    });
  });

  // ============================================================================
  // Search Tests
  // ============================================================================

  describe('search', () => {
    beforeEach(async () => {
      await service.createTemplate({
        name: 'Meeting Agenda',
        description: 'Plan your meetings',
        icon: '',
        category: 'work',
        content: '',
        variables: [],
        isBuiltIn: false,
      });

      await service.createTemplate({
        name: 'Project Kickoff',
        description: 'Start new projects',
        icon: '',
        category: 'work',
        content: '',
        variables: [],
        isBuiltIn: false,
      });
    });

    it('should search by name', async () => {
      const results = await service.searchTemplates('meeting');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('meeting');
    });

    it('should search by description', async () => {
      const results = await service.searchTemplates('projects');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const results = await service.searchTemplates('xyznonexistent');

      expect(results).toHaveLength(0);
    });
  });
});

// ============================================================================
// Template Parser Tests
// ============================================================================

describe('TemplateParser', () => {
  let parser: TemplateParser;

  beforeEach(() => {
    parser = new TemplateParser();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('variable extraction', () => {
    it('should extract {{variable}} patterns', () => {
      const variables = parser.extractVariables(
        'Hello {{name}}, today is {{date}}'
      );

      expect(variables).toContain('name');
      expect(variables).toContain('date');
    });

    it('should handle duplicate variables', () => {
      const variables = parser.extractVariables('{{name}} and {{name}} again');

      expect(variables.filter((v) => v === 'name')).toHaveLength(1);
    });

    it('should ignore malformed variables', () => {
      const variables = parser.extractVariables('{{valid}} and {invalid}');

      expect(variables).toContain('valid');
      expect(variables).not.toContain('invalid');
    });

    it('should handle nested braces', () => {
      const variables = parser.extractVariables('{{outer{{inner}}}}');

      // Should handle gracefully (implementation-dependent)
      expect(Array.isArray(variables)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('should replace variables with values', () => {
      const result = parser.render('Hello {{name}}!', { name: 'World' });

      expect(result).toBe('Hello World!');
    });

    it('should handle missing values', () => {
      const result = parser.render('Hello {{name}}!', {});

      // Should either keep placeholder or use empty string
      expect(result).toMatch(/Hello .*!/);
    });

    it('should render multiple occurrences', () => {
      const result = parser.render('{{x}} + {{x}} = {{y}}', { x: '1', y: '2' });

      expect(result).toBe('1 + 1 = 2');
    });
  });

  describe('built-in variables', () => {
    it('should provide today variable', () => {
      const builtIns = parser.getBuiltInVariables();

      expect(builtIns.today).toBeDefined();
      expect(builtIns.today()).toMatch(/2024-01-15/);
    });

    it('should provide now variable', () => {
      const builtIns = parser.getBuiltInVariables();

      expect(builtIns.now).toBeDefined();
      expect(builtIns.now()).toBeDefined();
    });

    it('should provide day variable', () => {
      const builtIns = parser.getBuiltInVariables();

      expect(builtIns.day).toBeDefined();
      expect(builtIns.day()).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });

    it('should provide time variable', () => {
      const builtIns = parser.getBuiltInVariables();

      expect(builtIns.time).toBeDefined();
    });
  });

  describe('date formatting', () => {
    it('should format date with default format', () => {
      const formatted = parser.formatDate(new Date('2024-01-15'));

      expect(formatted).toMatch(/2024|January|Jan|15/);
    });

    it('should format date with custom format', () => {
      const formatted = parser.formatDate(new Date('2024-01-15'), 'YYYY-MM-DD');

      expect(formatted).toBe('2024-01-15');
    });
  });
});

// ============================================================================
// Template Gallery UI Tests
// ============================================================================

describe('TemplateGallery', () => {
  it.todo('should display template cards in grid');
  it.todo('should show template preview on hover');
  it.todo('should filter by category');
  it.todo('should search templates');
  it.todo('should show "Create from template" button');
  it.todo('should open variable prompt modal');
  it.todo('should handle template selection');
});
