/**
 * TDD Tests for Daily Note Service
 *
 * Daily notes / journal functionality for creating habitual note-taking.
 * Following TDD methodology: write tests first, then implement.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Types
interface DailyNote {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
  wordCount: number;
  isFromTemplate: boolean;
}

interface DailyNoteTemplate {
  content: string;
  variables: Record<string, string>;
}

interface WeeklyReview {
  startDate: string;
  endDate: string;
  dailyNotes: DailyNote[];
  totalWordCount: number;
  notesCreated: number;
  summary: string;
}

// Placeholder class - tests will fail until implemented
class DailyNoteService {
  private dateFormat = 'YYYY-MM-DD';
  private titleFormat = 'MMMM D, YYYY';

  getTodaysNote(): Promise<DailyNote | null> {
    return Promise.reject(new Error('Not implemented'));
  }

  getOrCreateTodaysNote(): Promise<DailyNote> {
    return Promise.reject(new Error('Not implemented'));
  }

  getNoteForDate(_date: Date): Promise<DailyNote | null> {
    return Promise.reject(new Error('Not implemented'));
  }

  getOrCreateNoteForDate(_date: Date): Promise<DailyNote> {
    return Promise.reject(new Error('Not implemented'));
  }

  getRecentDailyNotes(_limit?: number): Promise<DailyNote[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  getDailyNotesInRange(_startDate: Date, _endDate: Date): Promise<DailyNote[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  createDailyNote(_date: Date, _useTemplate?: boolean): Promise<DailyNote> {
    return Promise.reject(new Error('Not implemented'));
  }

  setTemplate(_template: DailyNoteTemplate): Promise<void> {
    return Promise.reject(new Error('Not implemented'));
  }

  getTemplate(): Promise<DailyNoteTemplate | null> {
    return Promise.reject(new Error('Not implemented'));
  }

  generateWeeklyReview(_weekStartDate: Date): Promise<WeeklyReview> {
    return Promise.reject(new Error('Not implemented'));
  }

  generateMonthlyReview(_year: number, _month: number): Promise<WeeklyReview> {
    return Promise.reject(new Error('Not implemented'));
  }

  formatDateForTitle(_date: Date): string {
    throw new Error('Not implemented');
  }

  formatDateForId(_date: Date): string {
    throw new Error('Not implemented');
  }

  parseDateFromId(_dateString: string): Date | null {
    throw new Error('Not implemented');
  }

  getNextDay(_date: Date): Date {
    throw new Error('Not implemented');
  }

  getPreviousDay(_date: Date): Date {
    throw new Error('Not implemented');
  }

  getStreak(): Promise<number> {
    return Promise.reject(new Error('Not implemented'));
  }

  isDailyNote(_documentId: string): boolean {
    throw new Error('Not implemented');
  }

  setDateFormat(_format: string): void {
    throw new Error('Not implemented');
  }

  setTitleFormat(_format: string): void {
    throw new Error('Not implemented');
  }
}

describe('DailyNoteService', () => {
  let service: DailyNoteService;

  beforeEach(() => {
    service = new DailyNoteService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Today's Note Tests
  // ============================================================================

  describe("today's note", () => {
    it('should return null if no note exists for today', async () => {
      const note = await service.getTodaysNote();

      expect(note).toBeNull();
    });

    it('should create note if none exists for today', async () => {
      const note = await service.getOrCreateTodaysNote();

      expect(note).toBeDefined();
      expect(note.date).toBe('2024-01-15');
    });

    it('should return existing note if already created today', async () => {
      const first = await service.getOrCreateTodaysNote();
      const second = await service.getOrCreateTodaysNote();

      expect(first.id).toBe(second.id);
    });

    it('should use today date for note', async () => {
      const note = await service.getOrCreateTodaysNote();

      expect(note.date).toBe('2024-01-15');
      expect(note.title).toContain('January 15, 2024');
    });

    it('should create note with template if configured', async () => {
      await service.setTemplate({
        content: '<h1>{{date}}</h1><h2>Tasks</h2><ul><li></li></ul>',
        variables: {},
      });

      const note = await service.getOrCreateTodaysNote();

      expect(note.content).toContain('Tasks');
      expect(note.isFromTemplate).toBe(true);
    });
  });

  // ============================================================================
  // Specific Date Notes Tests
  // ============================================================================

  describe('notes for specific dates', () => {
    it('should get note for specific date', async () => {
      await service.createDailyNote(new Date('2024-01-10'));

      const note = await service.getNoteForDate(new Date('2024-01-10'));

      expect(note).not.toBeNull();
      expect(note?.date).toBe('2024-01-10');
    });

    it('should return null for date without note', async () => {
      const note = await service.getNoteForDate(new Date('2024-01-10'));

      expect(note).toBeNull();
    });

    it('should create note for specific date', async () => {
      const note = await service.getOrCreateNoteForDate(new Date('2024-01-20'));

      expect(note.date).toBe('2024-01-20');
      expect(note.title).toContain('January 20, 2024');
    });

    it('should not duplicate notes for same date', async () => {
      const first = await service.getOrCreateNoteForDate(new Date('2024-01-20'));
      const second = await service.getOrCreateNoteForDate(new Date('2024-01-20'));

      expect(first.id).toBe(second.id);
    });
  });

  // ============================================================================
  // Recent Notes Tests
  // ============================================================================

  describe('recent daily notes', () => {
    beforeEach(async () => {
      // Create notes for last 5 days
      for (let i = 0; i < 5; i++) {
        const date = new Date('2024-01-15');
        date.setDate(date.getDate() - i);
        await service.createDailyNote(date);
      }
    });

    it('should return recent notes in reverse chronological order', async () => {
      const notes = await service.getRecentDailyNotes(5);

      expect(notes).toHaveLength(5);
      expect(notes[0].date).toBe('2024-01-15');
      expect(notes[1].date).toBe('2024-01-14');
    });

    it('should limit results', async () => {
      const notes = await service.getRecentDailyNotes(3);

      expect(notes).toHaveLength(3);
    });

    it('should default to 7 days if no limit specified', async () => {
      const notes = await service.getRecentDailyNotes();

      expect(notes.length).toBeLessThanOrEqual(7);
    });
  });

  // ============================================================================
  // Date Range Tests
  // ============================================================================

  describe('notes in date range', () => {
    beforeEach(async () => {
      // Create notes for January 10-20
      for (let i = 10; i <= 20; i++) {
        await service.createDailyNote(new Date(`2024-01-${String(i)}`));
      }
    });

    it('should return notes within range', async () => {
      const notes = await service.getDailyNotesInRange(
        new Date('2024-01-12'),
        new Date('2024-01-15')
      );

      expect(notes).toHaveLength(4); // 12, 13, 14, 15
    });

    it('should include start and end dates', async () => {
      const notes = await service.getDailyNotesInRange(
        new Date('2024-01-10'),
        new Date('2024-01-11')
      );

      expect(notes.map((n) => n.date)).toContain('2024-01-10');
      expect(notes.map((n) => n.date)).toContain('2024-01-11');
    });

    it('should return empty array if no notes in range', async () => {
      const notes = await service.getDailyNotesInRange(
        new Date('2024-02-01'),
        new Date('2024-02-05')
      );

      expect(notes).toHaveLength(0);
    });
  });

  // ============================================================================
  // Template Tests
  // ============================================================================

  describe('daily note template', () => {
    it('should save template', async () => {
      await service.setTemplate({
        content: '<h1>{{date}}</h1>',
        variables: {},
      });

      const template = await service.getTemplate();

      expect(template).not.toBeNull();
      expect(template?.content).toContain('{{date}}');
    });

    it('should apply template variables', async () => {
      await service.setTemplate({
        content: '<h1>Daily Note: {{date}}</h1><p>Day: {{day}}</p>',
        variables: {},
      });

      const note = await service.getOrCreateTodaysNote();

      expect(note.content).toContain('2024-01-15');
      expect(note.content).toMatch(/Monday/);
    });

    it('should create note without template if not configured', async () => {
      const note = await service.getOrCreateTodaysNote();

      expect(note.content).toBeDefined();
      expect(note.isFromTemplate).toBe(false);
    });

    it('should support custom variables', async () => {
      await service.setTemplate({
        content: '<p>Goal: {{goal}}</p>',
        variables: { goal: 'Be productive' },
      });

      const note = await service.getOrCreateTodaysNote();

      expect(note.content).toContain('Be productive');
    });
  });

  // ============================================================================
  // Weekly Review Tests
  // ============================================================================

  describe('weekly review', () => {
    beforeEach(async () => {
      // Create notes for week of Jan 8-14
      for (let i = 8; i <= 14; i++) {
        const note = await service.createDailyNote(new Date(`2024-01-${String(i).padStart(2, '0')}`));
        // Simulate content
        note.wordCount = 100 + i * 10;
      }
    });

    it('should generate weekly review for given week', async () => {
      const review = await service.generateWeeklyReview(new Date('2024-01-08'));

      expect(review.startDate).toBe('2024-01-08');
      expect(review.endDate).toBe('2024-01-14');
      expect(review.dailyNotes.length).toBeGreaterThan(0);
    });

    it('should calculate total word count', async () => {
      const review = await service.generateWeeklyReview(new Date('2024-01-08'));

      expect(review.totalWordCount).toBeGreaterThan(0);
    });

    it('should count notes created', async () => {
      const review = await service.generateWeeklyReview(new Date('2024-01-08'));

      expect(review.notesCreated).toBe(7);
    });

    it('should handle partial weeks', async () => {
      // Only 2 notes exist for this week
      await service.createDailyNote(new Date('2024-01-22'));
      await service.createDailyNote(new Date('2024-01-23'));

      const review = await service.generateWeeklyReview(new Date('2024-01-22'));

      expect(review.notesCreated).toBe(2);
    });
  });

  // ============================================================================
  // Monthly Review Tests
  // ============================================================================

  describe('monthly review', () => {
    beforeEach(async () => {
      // Create notes for first 15 days of January
      for (let i = 1; i <= 15; i++) {
        const day = i.toString().padStart(2, '0');
        await service.createDailyNote(new Date(`2024-01-${day}`));
      }
    });

    it('should generate monthly review', async () => {
      const review = await service.generateMonthlyReview(2024, 1);

      expect(review.startDate).toBe('2024-01-01');
      expect(review.endDate).toBe('2024-01-31');
    });

    it('should include all notes from month', async () => {
      const review = await service.generateMonthlyReview(2024, 1);

      expect(review.notesCreated).toBe(15);
    });
  });

  // ============================================================================
  // Date Formatting Tests
  // ============================================================================

  describe('date formatting', () => {
    it('should format date for title', () => {
      const title = service.formatDateForTitle(new Date('2024-01-15'));

      expect(title).toContain('January');
      expect(title).toContain('15');
      expect(title).toContain('2024');
    });

    it('should format date for ID (YYYY-MM-DD)', () => {
      const id = service.formatDateForId(new Date('2024-01-15'));

      expect(id).toBe('2024-01-15');
    });

    it('should parse date from ID string', () => {
      const date = service.parseDateFromId('2024-01-15');

      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0); // January
      expect(date?.getDate()).toBe(15);
    });

    it('should return null for invalid date string', () => {
      const date = service.parseDateFromId('invalid');

      expect(date).toBeNull();
    });

    it('should allow custom date format', () => {
      service.setDateFormat('DD/MM/YYYY');

      const id = service.formatDateForId(new Date('2024-01-15'));

      expect(id).toBe('15/01/2024');
    });

    it('should allow custom title format', () => {
      service.setTitleFormat('YYYY年MM月DD日');

      const title = service.formatDateForTitle(new Date('2024-01-15'));

      expect(title).toBe('2024年01月15日');
    });
  });

  // ============================================================================
  // Navigation Tests
  // ============================================================================

  describe('date navigation', () => {
    it('should get next day', () => {
      const next = service.getNextDay(new Date('2024-01-15'));

      expect(next.getDate()).toBe(16);
    });

    it('should handle month boundaries', () => {
      const next = service.getNextDay(new Date('2024-01-31'));

      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(1);
    });

    it('should get previous day', () => {
      const prev = service.getPreviousDay(new Date('2024-01-15'));

      expect(prev.getDate()).toBe(14);
    });

    it('should handle year boundaries', () => {
      const prev = service.getPreviousDay(new Date('2024-01-01'));

      expect(prev.getFullYear()).toBe(2023);
      expect(prev.getMonth()).toBe(11); // December
      expect(prev.getDate()).toBe(31);
    });
  });

  // ============================================================================
  // Streak Tests
  // ============================================================================

  describe('streak tracking', () => {
    it('should calculate current streak', async () => {
      // Create consecutive daily notes
      for (let i = 0; i < 5; i++) {
        const date = new Date('2024-01-15');
        date.setDate(date.getDate() - i);
        await service.createDailyNote(date);
      }

      const streak = await service.getStreak();

      expect(streak).toBe(5);
    });

    it('should break streak on missed day', async () => {
      // Create notes with gap
      await service.createDailyNote(new Date('2024-01-15')); // Today
      await service.createDailyNote(new Date('2024-01-14')); // Yesterday
      // Skip Jan 13
      await service.createDailyNote(new Date('2024-01-12')); // 3 days ago

      const streak = await service.getStreak();

      expect(streak).toBe(2); // Only today and yesterday count
    });

    it('should return 0 if no note today', async () => {
      await service.createDailyNote(new Date('2024-01-14'));

      const streak = await service.getStreak();

      expect(streak).toBe(0);
    });
  });

  // ============================================================================
  // Daily Note Detection Tests
  // ============================================================================

  describe('daily note detection', () => {
    it('should identify daily note by ID pattern', () => {
      expect(service.isDailyNote('daily-2024-01-15')).toBe(true);
      expect(service.isDailyNote('daily/2024-01-15')).toBe(true);
    });

    it('should not identify regular documents', () => {
      expect(service.isDailyNote('doc-abc123')).toBe(false);
      expect(service.isDailyNote('random-id')).toBe(false);
    });
  });
});

// ============================================================================
// Daily Note UI Tests
// ============================================================================

describe('DailyNoteButton', () => {
  it.todo('should show in sidebar');
  it.todo('should open today note on click');
  it.todo('should show Cmd+D shortcut hint');
  it.todo('should show streak badge');
});

describe('DailyNoteHeader', () => {
  it.todo('should show date prominently');
  it.todo('should have previous/next day arrows');
  it.todo('should open calendar picker on date click');
});

describe('CalendarPicker', () => {
  it.todo('should highlight days with notes');
  it.todo('should navigate months');
  it.todo('should select date and open note');
});
