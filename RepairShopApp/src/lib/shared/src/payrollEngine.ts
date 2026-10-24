/**
 * Payroll Calculation Engine — Single Source of Truth
 * Used by Supabase Edge Functions, Web Admin Panel, and Mobile App.
 * Follows Digital Solution business rules and Gravitas precision standard.
 */

export interface PayrollCalculationInputs {
  monthly_salary: number;
  working_days: number;
  present_days: number;
  halfday_count: number;
  leave_count: number;
  allowed_leave_days?: number;
  absent_day_deduction?: number;
  halfday_deduction_rate?: number;
  ot_hours?: number;
  ot_rate_per_hour?: number;
  total_late_deduction?: number;
  total_early_deduction?: number;
  incentive_pay?: number;
  bonus_amount?: number;
  advance_deducted?: number;
  advance_balance_carried?: number; // SAL-007: persistent advance balance from prior periods
  early_in_bonus_total?: number;
  late_out_bonus_total?: number;
  customer_review_bonus_total?: number;
  job_completion_bonus?: number;
  customer_review_deduction?: number;
  base_pay?: number; // legacy alias for monthly_salary
  hire_date?: string | null;
  termination_date?: string | null;
  period_start?: string;
  period_end?: string;
}

export interface PayrollCalculationResult {
  monthly_salary: number;
  working_days: number;
  accounted_days: number;
  present_days: number;
  halfday_count: number;
  leave_count: number;
  chargeable_leave_days: number;
  absent_count: number;
  absent_day_deduction: number;
  absence_deduction: number;
  leave_deduction: number;
  halfday_deduction_total: number;
  ot_hours: number;
  ot_rate_per_hour: number;
  ot_pay: number;
  incentive_pay: number;
  bonus_amount: number;
  early_in_bonus_total: number;
  late_out_bonus_total: number;
  customer_review_bonus_total: number;
  job_completion_bonus: number;
  total_additions: number;
  total_late_deduction: number;
  total_early_deduction: number;
  customer_review_deduction: number;
  total_deductions: number;
  gross_salary: number;
  advance_deducted: number;
  advance_applied: number;
  advance_balance_remaining: number;
  net_salary: number;
  is_prorated: boolean;
}

/** Round half-up to 2 decimal places (cents/paise precision) */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates working days in a month, excluding Sundays and registered holidays.
 */
export function calculateWorkingDays(
  year: number,
  month: number, // 1-12
  holidayDates: Set<string> = new Set(),
  startDateStr?: string | null,
  endDateStr?: string | null
): number {
  const totalDays = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

  const effectiveStart = startDateStr && startDateStr > monthStart ? startDateStr : monthStart;
  const effectiveEnd = endDateStr && endDateStr < monthEnd ? endDateStr : monthEnd;

  let workingDays = 0;
  for (let d = 1; d <= totalDays; d++) {
    const curDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (curDateStr < effectiveStart || curDateStr > effectiveEnd) {
      continue;
    }
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0 && !holidayDates.has(curDateStr)) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Pure calculation function for staff payroll.
 */
export function calculateStaffSalary(inputs: PayrollCalculationInputs): PayrollCalculationResult {
  const rawMonthlySalary = inputs.monthly_salary ?? inputs.base_pay ?? 0;
  const baseMonthly = Math.max(0, rawMonthlySalary);

  let isProrated = false;
  let effectiveWorkingDays = Math.max(0, inputs.working_days || 0);

  const present_days = Math.max(0, inputs.present_days || 0);
  const halfday_count = Math.max(0, inputs.halfday_count || 0);
  const leave_count = Math.max(0, inputs.leave_count || 0);
  const allowed_leave_days = Math.max(0, inputs.allowed_leave_days ?? 2);

  const accounted_days = present_days + halfday_count + leave_count;
  const absent_count = Math.max(0, effectiveWorkingDays - accounted_days);
  const chargeable_leave_days = Math.max(0, leave_count - allowed_leave_days);

  const absent_day_deduction = inputs.absent_day_deduction != null && inputs.absent_day_deduction > 0
    ? roundCurrency(inputs.absent_day_deduction)
    : (effectiveWorkingDays > 0 ? roundCurrency(baseMonthly / effectiveWorkingDays) : 0);

  const absence_deduction = roundCurrency(absent_count * absent_day_deduction);
  const leave_deduction = roundCurrency(chargeable_leave_days * absent_day_deduction);

  const halfday_rate = inputs.halfday_deduction_rate != null
    ? inputs.halfday_deduction_rate
    : roundCurrency(absent_day_deduction / 2);
  const halfday_deduction_total = roundCurrency(halfday_count * halfday_rate);

  const ot_hours = Math.max(0, inputs.ot_hours || 0);
  const ot_rate_per_hour = Math.max(0, inputs.ot_rate_per_hour || 0);
  const ot_pay = roundCurrency(ot_hours * ot_rate_per_hour);

  const incentive_pay = Math.max(0, roundCurrency(inputs.incentive_pay || 0));
  const bonus_amount = Math.max(0, roundCurrency(inputs.bonus_amount || 0));
  const early_in_bonus_total = Math.max(0, roundCurrency(inputs.early_in_bonus_total || 0));
  const late_out_bonus_total = Math.max(0, roundCurrency(inputs.late_out_bonus_total || 0));
  const customer_review_bonus_total = Math.max(0, roundCurrency(inputs.customer_review_bonus_total || 0));
  const job_completion_bonus = Math.max(0, roundCurrency(inputs.job_completion_bonus || 0));

  const total_additions = roundCurrency(
    ot_pay +
    incentive_pay +
    bonus_amount +
    early_in_bonus_total +
    late_out_bonus_total +
    customer_review_bonus_total +
    job_completion_bonus
  );

  const total_late_deduction = Math.max(0, roundCurrency(inputs.total_late_deduction || 0));
  const total_early_deduction = Math.max(0, roundCurrency(inputs.total_early_deduction || 0));
  const customer_review_deduction = Math.max(0, roundCurrency(inputs.customer_review_deduction || 0));

  const total_deductions = roundCurrency(
    absence_deduction +
    leave_deduction +
    halfday_deduction_total +
    total_late_deduction +
    total_early_deduction +
    customer_review_deduction
  );

  const gross_salary = Math.max(0, roundCurrency(baseMonthly + total_additions - total_deductions));

  const currentMonthAdvance = Math.max(0, roundCurrency(inputs.advance_deducted || 0));
  const priorAdvanceCarried = Math.max(0, roundCurrency(inputs.advance_balance_carried || 0));
  const totalAdvanceDue = roundCurrency(currentMonthAdvance + priorAdvanceCarried);

  const advance_applied = Math.min(gross_salary, totalAdvanceDue);
  const advance_balance_remaining = roundCurrency(totalAdvanceDue - advance_applied);
  const net_salary = Math.max(0, roundCurrency(gross_salary - advance_applied));

  return {
    monthly_salary: baseMonthly,
    working_days: effectiveWorkingDays,
    accounted_days,
    present_days,
    halfday_count,
    leave_count,
    chargeable_leave_days,
    absent_count,
    absent_day_deduction,
    absence_deduction,
    leave_deduction,
    halfday_deduction_total,
    ot_hours,
    ot_rate_per_hour,
    ot_pay,
    incentive_pay,
    bonus_amount,
    early_in_bonus_total,
    late_out_bonus_total,
    customer_review_bonus_total,
    job_completion_bonus,
    total_additions,
    total_late_deduction,
    total_early_deduction,
    customer_review_deduction,
    total_deductions,
    gross_salary,
    advance_deducted: currentMonthAdvance,
    advance_applied,
    advance_balance_remaining,
    net_salary,
    is_prorated: isProrated,
  };
}

/**
 * Penny-preserving equal split for multi-technician incentives (SAL-004).
 * Guarantees sum(shares) === totalIncentive exactly with no dropped paise.
 */
export function calculateIncentiveSplitShares(
  totalIncentive: number,
  technicianCount: number
): number[] {
  if (technicianCount <= 0 || totalIncentive <= 0) {
    return [];
  }
  if (technicianCount === 1) {
    return [roundCurrency(totalIncentive)];
  }

  const basePennies = Math.floor((totalIncentive / technicianCount) * 100);
  const totalPennies = Math.round(totalIncentive * 100);
  let remainderPennies = totalPennies - (basePennies * technicianCount);

  const result: number[] = [];
  for (let i = 0; i < technicianCount; i++) {
    const pennies = basePennies + (remainderPennies > 0 ? 1 : 0);
    if (remainderPennies > 0) remainderPennies--;
    result.push(pennies / 100);
  }
  return result;
}
