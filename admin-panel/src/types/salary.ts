// Salary & Incentive Management Types

export type PaymentType = 'advance_salary' | 'materials_purchase' | 'daily_expenditure' | 'office_development';

export interface StaffRate {
  user_id: string;
  monthly_salary: number;
  allowed_leave_days: number;
  absent_day_deduction: number;
  halfday_deduction?: number;
  penalty_tier1_amount?: number;
  penalty_tier2_amount?: number;
  ot_rate_per_hour: number;
  base_pay?: number; // Fallback compatibility
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  created_at?: string;
}

export interface CustomerReview {
  id: string;
  user_id: string;
  job_id?: string | null;
  score: number;
  comments?: string | null;
  created_at: string;
}

export interface JobTypeItem {
  id: string;
  title: string;
  customer_charge_amount: number;
  technician_incentive: number;
  is_active: boolean;
  created_at: string;
}

export interface StaffIncentive {
  id: string;
  user_id: string;
  job_id?: string | null;
  sale_id?: string | null;
  amount: number;
  role_type: 'receptionist' | 'technician';
  description?: string | null;
  created_at: string;
}

export interface EmployeeBonus {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  month: number;
  year: number;
  created_by?: string | null;
  created_at: string;
  user?: { name: string; role: string } | null;
  created_by_user?: { name: string } | null;
}

export interface EmployeeLeave {
  id: string;
  user_id: string;
  leave_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  user?: { name: string; role: string } | null;
}

export interface PayrollAuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
  performed_by?: string | null;
  created_at: string;
  user?: { name: string } | null;
  performed_by_user?: { name: string } | null;
}

export interface SalaryRecord {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-01
  base_pay: number;
  monthly_salary_base?: number;
  incentive_pay: number;
  working_days: number;
  present_days: number;
  halfday_count: number;
  leave_count: number;
  ot_hours: number;
  ot_rate_per_hour: number;
  early_hours: number;
  absent_day_deduction: number;
  allowed_leave_days: number;
  absence_deduction: number;
  advance_deducted: number;
  gross_salary: number;
  net_salary: number;
  bonus_amount?: number;
  leave_deduction?: number;
  late_deduction?: number;
  early_deduction?: number;
  status?: 'draft' | 'paid';
}

export interface SalaryBreakdown {
  // Employee info
  user_id: string;
  employee_name: string;
  employee_role: string;
  month: string;
  salary_id?: string | null;
  status?: 'draft' | 'paid';

  // Base Pay
  base_pay: number;
  monthly_salary: number;

  // Working days
  working_days: number;
  holidays_count: number;

  // Attendance
  present_days: number;
  halfday_count: number;
  leave_count: number;
  absent_count: number;
  full_absent_days: number;
  half_absent_days: number;
  allowed_leave_days: number;
  chargeable_days: number;
  approved_leave_count?: number;

  // Additions
  ot_hours: number;
  ot_rate_per_hour: number;
  ot_pay: number;
  incentive_pay: number;
  bonus_amount: number;
  total_additions: number;

  // Deductions
  halfday_deduction_rate: number;
  halfday_deduction_total: number;
  absent_day_deduction: number;
  absence_deduction: number;
  leave_deduction: number;
  late_deduction: number;
  early_deduction: number;
  total_deductions: number;
  advance_deducted: number;

  // Totals
  gross_salary: number;
  net_salary: number;
}

export interface Payment {
  id: string;
  type: PaymentType;
  amount: number;
  description?: string | null;
  user_id?: string | null;
  created_by?: string | null;
  created_at: string;
  user?: { name: string; role: string } | null;
  created_by_user?: { name: string } | null;
}
