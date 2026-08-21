import { formatDate, formatDateShort, formatMonthLabel, getCurrentMonth, getTodayDateString, formatTime, getAttendanceDateIST, getDateIST } from './date';

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
});
