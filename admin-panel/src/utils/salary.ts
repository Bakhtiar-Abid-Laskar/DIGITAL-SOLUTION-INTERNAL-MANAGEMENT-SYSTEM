export interface SalaryInputs {
  monthly_salary: number;
  
  // Additions
  early_in_instances?: number;
  early_in_bonus_rate?: number;
  late_out_instances?: number;
  late_out_bonus_rate?: number;
  ot_hours?: number;
  ot_rate_per_hour?: number;
  avg_review_score?: number;
  customer_review_bonus_rate?: number;
  completed_jobs_count?: number;
  job_completion_bonus_threshold?: number;
  job_completion_bonus_amount?: number;
  incentive_pay?: number;

  // Deductions
  halfday_count?: number;
  halfday_deduction_rate?: number;
  full_absent_days?: number;
  leave_count?: number;
  allowed_leave_days?: number;
  absent_day_deduction?: number;
  late_in_instances?: number;
  late_in_deduction_rate?: number;
  early_hours?: number;
  early_deduction_rate?: number;
  customer_review_penalty_rate?: number;
  advance_deducted?: number;

  // Legacy fallback
  base_pay?: number;
}

export function calculateNetSalary(inputs: SalaryInputs) {
  const monthly_salary = Math.max(0, inputs.monthly_salary ?? inputs.base_pay ?? 0);

  // --- Additions ---
  const early_in_instances = Math.max(0, inputs.early_in_instances || 0);
  const early_in_bonus_total = early_in_instances * Math.max(0, inputs.early_in_bonus_rate || 0);

  const late_out_instances = Math.max(0, inputs.late_out_instances || 0);
  const late_out_bonus_total = late_out_instances * Math.max(0, inputs.late_out_bonus_rate || 0);

  const ot_hours = Math.max(0, inputs.ot_hours || 0);
  const ot_pay = ot_hours * Math.max(0, inputs.ot_rate_per_hour || 0);

  const avg_review_score = inputs.avg_review_score ?? 0;
  const customer_review_bonus_total = (avg_review_score >= 4.5) ? Math.max(0, inputs.customer_review_bonus_rate || 0) : 0;

  const completed_jobs_count = Math.max(0, inputs.completed_jobs_count || 0);
  const threshold = inputs.job_completion_bonus_threshold ?? 30;
  const job_completion_bonus = (completed_jobs_count > threshold) ? Math.max(0, inputs.job_completion_bonus_amount || 0) : 0;

  const incentive_pay = Math.max(0, inputs.incentive_pay || 0);

  const total_additions = early_in_bonus_total + late_out_bonus_total + ot_pay + customer_review_bonus_total + job_completion_bonus + incentive_pay;

  // --- Deductions ---
  const halfday_count = Math.max(0, inputs.halfday_count || 0);
  const halfday_deduction_total = halfday_count * Math.max(0, inputs.halfday_deduction_rate || 0);

  const full_absent_days = Math.max(0, inputs.full_absent_days || 0);
  const leave_count = Math.max(0, inputs.leave_count || 0);
  const allowed_leave_days = Math.max(0, inputs.allowed_leave_days || 0);
  const chargeable_absent = Math.max(0, full_absent_days - Math.max(0, allowed_leave_days - leave_count));
  const absence_deduction = chargeable_absent * Math.max(0, inputs.absent_day_deduction || 0);

  const late_in_instances = Math.max(0, inputs.late_in_instances || 0);
  const late_in_deduction_total = late_in_instances * Math.max(0, inputs.late_in_deduction_rate || 0);

  const early_hours = Math.max(0, inputs.early_hours || 0);
  const early_out_deduction_total = early_hours * Math.max(0, inputs.early_deduction_rate || 0);

  const customer_review_deduction = (avg_review_score > 0 && avg_review_score < 3.0) ? Math.max(0, inputs.customer_review_penalty_rate || 0) : 0;

  const total_deductions = halfday_deduction_total + absence_deduction + late_in_deduction_total + early_out_deduction_total + customer_review_deduction;

  const advance_deducted = Math.max(0, inputs.advance_deducted || 0);

  const gross_salary = Math.max(0, monthly_salary + total_additions - total_deductions);
  const net_salary = Math.max(0, gross_salary - advance_deducted);

  return {
    monthly_salary,
    base_pay: monthly_salary,
    total_additions,
    total_deductions,
    early_in_bonus_total,
    late_out_bonus_total,
    ot_pay,
    customer_review_bonus_total,
    job_completion_bonus,
    incentive_pay,
    halfday_deduction_total,
    absence_deduction,
    late_in_deduction_total,
    early_out_deduction_total,
    customer_review_deduction,
    chargeable_days: chargeable_absent,
    advance_deducted,
    gross_salary,
    net_salary,
  };
}
