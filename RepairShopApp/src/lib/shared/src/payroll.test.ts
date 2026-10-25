/**
 * Payroll Engine Unit Tests (TEST-001 & SAL-003)
 * Directly tests the production engine in packages/shared/src/payrollEngine.ts
 */

import {
  calculateStaffSalary,
  calculateWorkingDays,
  calculateIncentiveSplitShares,
  roundCurrency,
} from './payrollEngine';

describe('Production Payroll Engine (packages/shared/src/payrollEngine.ts)', () => {
  describe('Working Days Calculation', () => {
    it('calculates working days for August 2026 (31 days, 5 Sundays, 1 Holiday)', () => {
      const holidays = new Set(['2026-08-15']); // Indian Independence Day
      const workingDays = calculateWorkingDays(2026, 8, holidays);
      expect(workingDays).toBe(25);
    });

    it('calculates working days for October 2026 (31 days, 4 Sundays, 1 Holiday)', () => {
      const holidays = new Set(['2026-10-02']); // Gandhi Jayanti
      const workingDays = calculateWorkingDays(2026, 10, holidays);
      expect(workingDays).toBe(26);
    });

    it('handles leap years vs non-leap years correctly', () => {
      expect(calculateWorkingDays(2024, 2, new Set())).toBe(25); // Leap year 29 days, 4 Sundays
      expect(calculateWorkingDays(2025, 2, new Set())).toBe(24); // 28 days, 4 Sundays
    });
  });

  describe('Scenario 1: Standard Full Month with Overtime and Advance', () => {
    it('matches exact expected numbers for standard full attendance', () => {
      const result = calculateStaffSalary({
        monthly_salary: 24000,
        working_days: 26,
        present_days: 26,
        halfday_count: 0,
        leave_count: 0,
        allowed_leave_days: 2,
        absent_day_deduction: 800,
        ot_hours: 4,
        ot_rate_per_hour: 100,
        incentive_pay: 1200,
        bonus_amount: 0,
        advance_deducted: 2000,
      });

      expect(result.accounted_days).toBe(26);
      expect(result.absent_count).toBe(0);
      expect(result.absence_deduction).toBe(0);
      expect(result.leave_deduction).toBe(0);
      expect(result.ot_pay).toBe(400);
      expect(result.total_additions).toBe(1600); // 400 OT + 1200 incentive
      expect(result.total_deductions).toBe(0);
      expect(result.gross_salary).toBe(25600); // 24000 + 1600
      expect(result.advance_applied).toBe(2000);
      expect(result.net_salary).toBe(23600);
      expect(result.advance_balance_remaining).toBe(0);
    });
  });

  describe('Scenario 2: Absences, Approved Leave, and Late Penalty', () => {
    it('matches exact expected numbers for mixed attendance with penalties', () => {
      const result = calculateStaffSalary({
        monthly_salary: 26000,
        working_days: 26,
        present_days: 20,
        halfday_count: 1,
        leave_count: 3,
        allowed_leave_days: 2,
        absent_day_deduction: 1000,
        halfday_deduction_rate: 200,
        total_late_deduction: 90,
        total_early_deduction: 0,
        bonus_amount: 500,
        incentive_pay: 0,
        advance_deducted: 0,
      });

      expect(result.accounted_days).toBe(24); // 20 + 1 + 3
      expect(result.absent_count).toBe(2); // 26 - 24
      expect(result.chargeable_leave_days).toBe(1); // 3 - 2
      expect(result.leave_deduction).toBe(1000); // 1 * 1000
      expect(result.absence_deduction).toBe(2000); // 2 * 1000
      expect(result.halfday_deduction_total).toBe(200);
      expect(result.total_deductions).toBe(3290); // 2000 + 1000 + 200 + 90
      expect(result.total_additions).toBe(500);
      expect(result.gross_salary).toBe(23210); // 26000 + 500 - 3290
      expect(result.net_salary).toBe(23210);
    });
  });

  describe('Scenario 3: Advance Salary Carry-Forward (SAL-007)', () => {
    it('floors net salary at 0 and carries unrecovered advance to next month', () => {
      const result = calculateStaffSalary({
        monthly_salary: 10000,
        working_days: 26,
        present_days: 26,
        halfday_count: 0,
        leave_count: 0,
        advance_deducted: 15000, // Taken 15,000 advance on 10,000 earnings
      });

      expect(result.gross_salary).toBe(10000);
      expect(result.advance_applied).toBe(10000);
      expect(result.net_salary).toBe(0);
      expect(result.advance_balance_remaining).toBe(5000); // Carried forward!
    });

    it('deducts prior carried-over advance balance in subsequent month', () => {
      const result = calculateStaffSalary({
        monthly_salary: 10000,
        working_days: 26,
        present_days: 26,
        halfday_count: 0,
        leave_count: 0,
        advance_deducted: 1000,
        advance_balance_carried: 5000, // Carried from last month
      });

      expect(result.gross_salary).toBe(10000);
      expect(result.advance_applied).toBe(6000); // 1000 + 5000
      expect(result.net_salary).toBe(4000); // 10000 - 6000
      expect(result.advance_balance_remaining).toBe(0);
    });
  });

  describe('Scenario 4: Multi-Technician Incentive Split Rounding (SAL-004)', () => {
    it('divides ₹100 equally among 3 technicians with zero paise lost', () => {
      const shares = calculateIncentiveSplitShares(100, 3);
      expect(shares).toEqual([33.34, 33.33, 33.33]);
      const sum = roundCurrency(shares.reduce((a, b) => a + b, 0));
      expect(sum).toBe(100.00);
    });

    it('divides ₹50 equally among 7 technicians with zero paise lost', () => {
      const shares = calculateIncentiveSplitShares(50, 7);
      expect(shares.length).toBe(7);
      const sum = roundCurrency(shares.reduce((a, b) => a + b, 0));
      expect(sum).toBe(50.00);
    });

    it('handles 1 technician and 0 technicians cleanly', () => {
      expect(calculateIncentiveSplitShares(500, 1)).toEqual([500]);
      expect(calculateIncentiveSplitShares(500, 0)).toEqual([]);
    });
  });
});
