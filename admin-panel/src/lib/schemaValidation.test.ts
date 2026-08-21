/**
 * Database Schema Invariant & Model Validation Tests
 */

export const JOB_CODE_REGEX = /^RS-\d{4}-\d{4}$/;
export const SALE_CODE_REGEX = /^SALE-\d{4}-\d{4}$/;
export const PURCHASE_CODE_REGEX = /^PO-\d{4}-\d{4}$/;

export const VALID_ROLES = ['admin', 'receptionist', 'technician'] as const;
export const VALID_JOB_STATUSES = ['Received', 'In Progress', 'Waiting for Materials', 'Completed'] as const;
export const VALID_PRIORITIES = ['Normal', 'High', 'Urgent'] as const;
export const VALID_DEVICE_TYPES = ['Laptop', 'PC', 'Other'] as const;
export const VALID_ATTENDANCE_STATUSES = ['Present', 'Halfday', 'Leave', 'Absent'] as const;
export const VALID_PAYMENT_TYPES = ['advance_salary', 'materials_purchase', 'daily_expenditure', 'office_development'] as const;

describe('Database Schema Invariant & Model Validation', () => {
  describe('Identifier Code Formats', () => {
    it('validates correct RS-YYYY-XXXX format for job codes', () => {
      expect(JOB_CODE_REGEX.test('RS-2026-0001')).toBe(true);
      expect(JOB_CODE_REGEX.test('RS-2026-9999')).toBe(true);
      expect(JOB_CODE_REGEX.test('RS-2027-0142')).toBe(true);
    });

    it('rejects malformed job codes', () => {
      expect(JOB_CODE_REGEX.test('JOB-2026-0001')).toBe(false);
      expect(JOB_CODE_REGEX.test('RS-26-0001')).toBe(false);
      expect(JOB_CODE_REGEX.test('RS-2026-1')).toBe(false);
      expect(JOB_CODE_REGEX.test('client-side-generated-id')).toBe(false);
    });

    it('validates correct SALE-YYYY-XXXX format for sale invoice codes', () => {
      expect(SALE_CODE_REGEX.test('SALE-2026-0001')).toBe(true);
      expect(SALE_CODE_REGEX.test('SALE-2026-0099')).toBe(true);
    });

    it('rejects malformed sale codes', () => {
      expect(SALE_CODE_REGEX.test('INV-2026-0001')).toBe(false);
      expect(SALE_CODE_REGEX.test('SALE-26-1')).toBe(false);
    });

    it('validates correct PO-YYYY-XXXX format for purchase intake order codes', () => {
      expect(PURCHASE_CODE_REGEX.test('PO-2026-0001')).toBe(true);
      expect(PURCHASE_CODE_REGEX.test('PO-2026-0050')).toBe(true);
    });

    it('rejects malformed purchase codes', () => {
      expect(PURCHASE_CODE_REGEX.test('PUR-2026-0001')).toBe(false);
      expect(PURCHASE_CODE_REGEX.test('PO-26-1')).toBe(false);
    });
  });

  describe('Enum Constraints', () => {
    it('validates allowed user roles', () => {
      expect(VALID_ROLES).toContain('admin');
      expect(VALID_ROLES).toContain('receptionist');
      expect(VALID_ROLES).toContain('technician');
      expect(VALID_ROLES).not.toContain('superadmin');
      expect(VALID_ROLES).not.toContain('guest');
    });

    it('validates repair job status progression enums', () => {
      expect(VALID_JOB_STATUSES).toEqual(['Received', 'In Progress', 'Waiting for Materials', 'Completed']);
    });

    it('validates attendance status enums', () => {
      expect(VALID_ATTENDANCE_STATUSES).toEqual(['Present', 'Halfday', 'Leave', 'Absent']);
    });

    it('validates cash outflow payment category types', () => {
      expect(VALID_PAYMENT_TYPES).toContain('advance_salary');
      expect(VALID_PAYMENT_TYPES).toContain('materials_purchase');
      expect(VALID_PAYMENT_TYPES).toContain('daily_expenditure');
      expect(VALID_PAYMENT_TYPES).toContain('office_development');
    });
  });
});
