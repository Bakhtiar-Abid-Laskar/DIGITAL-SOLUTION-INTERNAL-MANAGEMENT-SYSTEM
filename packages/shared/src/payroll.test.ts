/**
 * Payroll Engine Unit Tests
 * Verifies business logic corresponding to `supabase/functions/calculate-monthly-salary`
 */

function calculateWorkingDays(year: number, month: number, holidayDates: Set<string>): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    // Monday–Saturday are working days; Sunday (0) and registered holidays are excluded
    if (dow !== 0 && !holidayDates.has(dStr)) {
      count++;
    }
  }
  return count;
}

function calculateTieredPenalty(minutes: number, tier1Mins: number, tier1Amt: number, tier2Amt: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= tier1Mins) return tier1Amt;
  return tier2Amt;
}

interface PayrollInput {
  baseDailyRate: number;
  monthlySalaryBase?: number;
  presentDays: number;
  halfdayCount: number;
  otHours: number;
  otRatePerHour: number;
  lateMinutesTotal: number;
  earlyMinutesTotal: number;
  bonusAmount: number;
  incentiveAmount: number;
  advanceDeducted: number;
}

function computeSalary(input: PayrollInput) {
  const presentPay = input.presentDays * input.baseDailyRate;
  const halfdayPay = input.halfdayCount * (input.baseDailyRate / 2);
  const otPay = input.otHours * input.otRatePerHour;
  
  // Late & Early deductions
  const lateDeduction = calculateTieredPenalty(input.lateMinutesTotal, 60, 50, 100);
  const earlyDeduction = calculateTieredPenalty(input.earlyMinutesTotal, 60, 50, 100);
  
  const grossSalary = presentPay + halfdayPay + otPay + input.bonusAmount + input.incentiveAmount - (lateDeduction + earlyDeduction);
  const netSalary = Math.max(0, grossSalary - input.advanceDeducted);

  return {
    presentPay,
    halfdayPay,
    otPay,
    lateDeduction,
    earlyDeduction,
    grossSalary,
    netSalary,
  };
}

describe('Payroll & Salary Calculation Engine (calculate-monthly-salary)', () => {
  describe('Working Days Calculation', () => {
    it('calculates working days for August 2026 (31 days, 5 Sundays)', () => {
      const holidays = new Set(['2026-08-15']); // Indian Independence Day
      // August 2026: 31 days total, 5 Sundays (Aug 2, 9, 16, 23, 30), 1 Holiday (Aug 15) -> 31 - 5 - 1 = 25 working days
      const workingDays = calculateWorkingDays(2026, 8, holidays);
      expect(workingDays).toBe(25);
    });

    it('handles February in non-leap and leap years', () => {
      // Feb 2024 (Leap year, 29 days)
      const leapDays = calculateWorkingDays(2024, 2, new Set());
      // Feb 2024 has 4 Sundays -> 29 - 4 = 25 working days
      expect(leapDays).toBe(25);

      // Feb 2025 (Non-leap year, 28 days, 4 Sundays -> 24 working days)
      const nonLeapDays = calculateWorkingDays(2025, 2, new Set());
      expect(nonLeapDays).toBe(24);
    });
  });

  describe('Tiered Late & Early Arrival Penalty', () => {
    it('returns 0 deduction for on-time staff (0 minutes late)', () => {
      expect(calculateTieredPenalty(0, 60, 50, 100)).toBe(0);
    });

    it('charges Tier 1 penalty for lateness within tier 1 threshold (<= 60 mins)', () => {
      expect(calculateTieredPenalty(25, 60, 50, 100)).toBe(50);
      expect(calculateTieredPenalty(60, 60, 50, 100)).toBe(50);
    });

    it('charges Tier 2 penalty for lateness exceeding tier 1 threshold (> 60 mins)', () => {
      expect(calculateTieredPenalty(75, 60, 50, 100)).toBe(100);
      expect(calculateTieredPenalty(120, 60, 50, 100)).toBe(100);
    });
  });

  describe('Gross & Net Salary Synthesis', () => {
    it('calculates standard full-attendance technician salary with overtime and advance deduction', () => {
      const result = computeSalary({
        baseDailyRate: 800,
        presentDays: 24,
        halfdayCount: 1,
        otHours: 5,
        otRatePerHour: 100,
        lateMinutesTotal: 30, // Tier 1 -> -50
        earlyMinutesTotal: 0,
        bonusAmount: 500,
        incentiveAmount: 1200,
        advanceDeducted: 2000,
      });

      // presentPay: 24 * 800 = 19,200
      // halfdayPay: 1 * 400 = 400
      // otPay: 5 * 100 = 500
      // gross: 19,200 + 400 + 500 + 500 (bonus) + 1200 (incentive) - 50 (late) = 21,750
      // net: 21,750 - 2000 (advance) = 19,750
      expect(result.presentPay).toBe(19200);
      expect(result.halfdayPay).toBe(400);
      expect(result.otPay).toBe(500);
      expect(result.lateDeduction).toBe(50);
      expect(result.grossSalary).toBe(21750);
      expect(result.netSalary).toBe(19750);
    });

    it('floors net salary to 0 if advance salary exceeds total earned pay', () => {
      const result = computeSalary({
        baseDailyRate: 500,
        presentDays: 2,
        halfdayCount: 0,
        otHours: 0,
        otRatePerHour: 50,
        lateMinutesTotal: 0,
        earlyMinutesTotal: 0,
        bonusAmount: 0,
        incentiveAmount: 0,
        advanceDeducted: 5000, // Taken 5000 advance, only earned 1000
      });

      expect(result.grossSalary).toBe(1000);
      expect(result.netSalary).toBe(0);
    });
  });
});
