import { 
  formatDate, 
  formatDateShort, 
  formatMonthLabel, 
  getCurrentMonth, 
  getTodayDateString, 
  formatTime, 
  getAttendanceDateIST, 
  getStartOfTodayIST,
  getDateIST,
  formatRelativeTime,
  formatFullDateTime
} from './date';

describe('Date & Time Formatting Utilities (@repairshop/shared/date.ts)', () => {
  describe('formatDate', () => {
    it('formats ISO date strings to Indian locale format (DD MMM YYYY)', () => {
      const formatted = formatDate('2026-08-14T10:30:00Z');
      expect(formatted).toMatch(/14\s+Aug\s+2026/);
    });

    it('returns an em dash (—) for null, undefined, or empty date strings', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
    });
  });

  describe('formatDateShort', () => {
    it('formats ISO date strings to short format (MMM D)', () => {
      const formatted = formatDateShort('2026-08-14T10:30:00Z');
      expect(formatted).toMatch(/Aug/);
    });

    it('returns an em dash (—) for null, undefined, or empty date strings', () => {
      expect(formatDateShort(null)).toBe('—');
      expect(formatDateShort(undefined)).toBe('—');
      expect(formatDateShort('')).toBe('—');
    });
  });

  describe('formatMonthLabel', () => {
    it('formats YYYY-MM strings to full Month Year format', () => {
      const formatted = formatMonthLabel('2026-08');
      expect(formatted).toMatch(/August\s+2026/);
    });

    it('formats YYYY-MM-DD strings accurately', () => {
      const formatted = formatMonthLabel('2026-01-15');
      expect(formatted).toMatch(/January\s+2026/);
    });
  });

  describe('getCurrentMonth & getTodayDateString', () => {
    it('returns current month in YYYY-MM format', () => {
      const currentMonth = getCurrentMonth();
      expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    it('returns today date in YYYY-MM-DD format', () => {
      const today = getTodayDateString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getAttendanceDateIST & getDateIST', () => {
    it('returns today date formatted for Asia/Kolkata timezone (YYYY-MM-DD)', () => {
      const istDate = getAttendanceDateIST();
      expect(istDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formats an arbitrary Date object into Asia/Kolkata IST date string', () => {
      const specificDate = new Date('2026-08-14T18:30:00Z');
      const istDate = getDateIST(specificDate);
      expect(istDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns ISO string for start of today in Asia/Kolkata timezone', () => {
      const startOfToday = getStartOfTodayIST();
      expect(startOfToday).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      // IST is UTC+05:30, so IST midnight 00:00 corresponds to 18:30:00.000Z of the prior UTC day
      expect(startOfToday).toContain('T18:30:00.000Z');
    });
  });

  describe('formatTime', () => {
    it('formats time to 2-digit hour:minute format', () => {
      const formatted = formatTime('2026-08-14T14:45:00Z');
      expect(formatted).not.toBe('--:--');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('returns fallback --:-- for null or empty time', () => {
      expect(formatTime(null)).toBe('--:--');
      expect(formatTime('')).toBe('--:--');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Just now" for timestamps within the last 15 seconds', () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe('Just now');
    });

    it('returns relative minutes for events within an hour (e.g. 5m ago)', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinsAgo.toISOString())).toBe('5m ago');
    });

    it('returns relative hours for events earlier today (e.g. 2h ago)', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const res = formatRelativeTime(twoHoursAgo.toISOString());
      expect(res).toMatch(/2h ago|Yesterday/);
    });

    it('returns em dash (—) for null or invalid dates', () => {
      expect(formatRelativeTime(null)).toBe('—');
      expect(formatRelativeTime(undefined)).toBe('—');
      expect(formatRelativeTime('invalid-date')).toBe('—');
    });
  });

  describe('formatFullDateTime', () => {
    it('formats full timestamp with date, month, year, and time', () => {
      const formatted = formatFullDateTime('2026-08-22T10:30:00Z');
      expect(formatted).toMatch(/2026/);
      expect(formatted).toMatch(/Aug/);
    });

    it('returns em dash (—) for invalid dates', () => {
      expect(formatFullDateTime(null)).toBe('—');
      expect(formatFullDateTime('invalid-date')).toBe('—');
    });
  });
});

