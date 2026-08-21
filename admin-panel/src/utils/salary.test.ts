import { calculateNetSalary } from './salary';

describe('Fixed Monthly Salary Engine (admin-panel/src/utils/salary.ts)', () => {
  it('calculates net salary correctly with fixed monthly salary, additions, and deductions', () => {
    const inputs = {
      monthly_salary: 25000,
      
      // Additions
      early_in_instances: 2,
      early_in_bonus_rate: 50, // +100
      late_out_instances: 3,
      late_out_bonus_rate: 100, // +300
      ot_hours: 10,
      ot_rate_per_hour: 150, // +1500
      avg_review_score: 4.8,
      customer_review_bonus_rate: 1000, // +1000 (score >= 4.5)
      completed_jobs_count: 35,
      job_completion_bonus_threshold: 30,
      job_completion_bonus_amount: 2000, // +2000 (35 > 30)
      incentive_pay: 1500, // +1500
      
      // Deductions
      halfday_count: 1,
      halfday_deduction_rate: 400, // -400
      full_absent_days: 4,
      leave_count: 0,
      allowed_leave_days: 2, // 4 - 2 = 2 chargeable absent days
      absent_day_deduction: 800, // -1600
      late_in_instances: 2,
      late_in_deduction_rate: 100, // -200
      early_hours: 2,
      early_deduction_rate: 150, // -300
      advance_deducted: 5000, // -5000
    };

    const result = calculateNetSalary(inputs);

    expect(result.monthly_salary).toBe(25000);
    expect(result.early_in_bonus_total).toBe(100);
    expect(result.late_out_bonus_total).toBe(300);
    expect(result.ot_pay).toBe(1500);
    expect(result.customer_review_bonus_total).toBe(1000);
    expect(result.job_completion_bonus).toBe(2000);
    expect(result.incentive_pay).toBe(1500);
    expect(result.total_additions).toBe(6400);

    expect(result.halfday_deduction_total).toBe(400);
    expect(result.chargeable_days).toBe(2);
    expect(result.absence_deduction).toBe(1600);
    expect(result.late_in_deduction_total).toBe(200);
    expect(result.early_out_deduction_total).toBe(300);
    expect(result.total_deductions).toBe(2500);

    expect(result.gross_salary).toBe(28900);
    expect(result.advance_deducted).toBe(5000);
    expect(result.net_salary).toBe(23900);
  });

  it('applies review penalty when customer review score is low (< 3.0)', () => {
    const inputs = {
      monthly_salary: 20000,
      avg_review_score: 2.2,
      customer_review_penalty_rate: 1500,
    };

    const result = calculateNetSalary(inputs);
    expect(result.customer_review_deduction).toBe(1500);
    expect(result.gross_salary).toBe(18500);
  });

  it('handles legacy base_pay fallback when monthly_salary is omitted', () => {
    const inputs = {
      monthly_salary: undefined as any,
      base_pay: 18000,
    };

    const result = calculateNetSalary(inputs);
    expect(result.monthly_salary).toBe(18000);
    expect(result.base_pay).toBe(18000);
  });

  it('handles default job completion threshold and no bonus when under threshold', () => {
    const inputs = {
      monthly_salary: 20000,
      completed_jobs_count: 25, // default threshold is 30, so 25 <= 30
      job_completion_bonus_amount: 1000,
    };

    const result = calculateNetSalary(inputs);
    expect(result.job_completion_bonus).toBe(0);
  });

  it('handles neutral review scores (3.0 to 4.4) with zero bonus and zero penalty', () => {
    const inputs = {
      monthly_salary: 20000,
      avg_review_score: 3.8,
      customer_review_bonus_rate: 1000,
      customer_review_penalty_rate: 1000,
    };

    const result = calculateNetSalary(inputs);
    expect(result.customer_review_bonus_total).toBe(0);
    expect(result.customer_review_deduction).toBe(0);
  });

  it('handles zero review score (no reviews) with zero penalty', () => {
    const inputs = {
      monthly_salary: 20000,
      avg_review_score: 0,
      customer_review_penalty_rate: 1000,
    };

    const result = calculateNetSalary(inputs);
    expect(result.customer_review_deduction).toBe(0);
  });

  it('handles full absent days when allowed leave days are already exhausted', () => {
    const inputs = {
      monthly_salary: 20000,
      full_absent_days: 3,
      leave_count: 5, // already used 5 leaves
      allowed_leave_days: 2, // only 2 were allowed -> 0 remaining allowed
      absent_day_deduction: 700, // 3 * 700 = 2100
    };

    const result = calculateNetSalary(inputs);
    expect(result.chargeable_days).toBe(3);
    expect(result.absence_deduction).toBe(2100);
  });

  it('floors net salary to zero when advance salary exceeds gross pay', () => {
    const inputs = {
      monthly_salary: 5000,
      advance_deducted: 8000,
    };

    const result = calculateNetSalary(inputs);
    expect(result.gross_salary).toBe(5000);
    expect(result.net_salary).toBe(0);
  });
});
