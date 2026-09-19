'use client';

import { useState } from 'react';
import { SalaryBreakdown } from '@/types/salary';
import { formatCurrency } from '@repairshop/shared';
import { formatMonthLabel } from '@/utils/formatDate';
import { generateSalarySlipHtml } from '@/utils/salarySlipHtml';
import { BarChart2, Printer, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from '@/styles/salary.module.css';

interface Props {
  breakdown: SalaryBreakdown;
  onRefresh?: () => void;
}

export default function SalaryBreakdownCard({ breakdown, onRefresh }: Props) {
  const [markingPaid, setMarkingPaid] = useState(false);

  const handlePrint = () => {
    try {
      const html = generateSalarySlipHtml(breakdown);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Salary_Slip_${breakdown.employee_name.replace(/\s+/g, '_')}_${breakdown.month}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate salary slip:', err);
      alert('Failed to generate salary slip download.');
    }
  };

  const handleMarkPaid = async () => {
    if (!breakdown.salary_id || markingPaid) return;
    setMarkingPaid(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'mark_paid', salary_id: breakdown.salary_id, user_id: breakdown.user_id }),
    });
    setMarkingPaid(false);
    if (onRefresh) onRefresh();
  };

  const baseSalary = breakdown.monthly_salary || breakdown.base_pay || 0;
  const approvedLeaves = breakdown.approved_leaves ?? breakdown.approved_leave_count ?? 0;
  const excessLeaves = breakdown.chargeable_leave_days ?? Math.max(0, approvedLeaves - (breakdown.allowed_leave_days || 0));
  const unexcusedAbsences = breakdown.unexcused_absent_days ?? breakdown.chargeable_days ?? breakdown.absent_count ?? 0;

  return (
    <div className={styles.card}>
      <div className={styles.breakdownHeader}>
        <div>
          <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={20} style={{ flexShrink: 0 }} />
            Monthly Salary Breakdown
          </h2>
          <p className={styles.hint}>{breakdown.employee_name} — {formatMonthLabel(breakdown.month)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Status badge */}
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: breakdown.status === 'paid' ? 'var(--color-admin-success-bg, #dcfce7)' : 'var(--color-admin-warning-bg, #fef9c3)',
            color: breakdown.status === 'paid' ? 'var(--color-admin-success, #16a34a)' : 'var(--color-admin-warning, #ca8a04)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {breakdown.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
            {breakdown.status === 'paid' ? 'Paid' : 'Draft'}
          </span>
          <button className={styles.btnPrint} onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Printer size={16} />
            Download Salary Slip
          </button>
          {breakdown.status !== 'paid' && breakdown.salary_id && (
            <button className={styles.btnPrimary} onClick={handleMarkPaid} disabled={markingPaid}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} />
              {markingPaid ? 'Marking...' : 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>

      {/* Missing Check-out Warning */}
      {Number(breakdown.missing_checkout_count || 0) > 0 && (
        <div style={{
          margin: '12px 0 16px 0',
          padding: '12px 16px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#92400e',
          fontSize: 13,
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, color: '#d97706' }} />
          <div>
            <strong>Missing Check-Out Warning:</strong> {breakdown.missing_checkout_count} day(s) have check-in without check-out recorded
            {breakdown.missing_checkout_dates && breakdown.missing_checkout_dates.length > 0 && (
              <span> ({breakdown.missing_checkout_dates.join(', ')})</span>
            )}. Please review shift records before finalizing.
          </div>
        </div>
      )}

      {/* Employee & Base Salary Info */}
      <div className={styles.infoGrid}>
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>Employee</span>
          <span className={styles.infoValue}>{breakdown.employee_name}</span>
        </div>
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>Role</span>
          <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{breakdown.employee_role}</span>
        </div>
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>Month</span>
          <span className={styles.infoValue}>{formatMonthLabel(breakdown.month)}</span>
        </div>
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>Fixed Monthly Salary</span>
          <span className={styles.infoValue}>{formatCurrency(baseSalary)}</span>
        </div>
      </div>

      {/* Attendance & Holiday Summary */}
      <h3 className={styles.subTitle}>Attendance & Leave Summary</h3>
      <div className={styles.attendanceGrid}>
        {[
          { label: 'Working Days', value: breakdown.working_days },
          { label: 'Company Holidays', value: breakdown.holidays_count || 0 },
          { label: 'Present Days', value: breakdown.present_days },
          { label: 'Half-Days', value: breakdown.halfday_count || breakdown.half_absent_days || 0 },
          { label: 'Approved Leaves', value: `${approvedLeaves} d` },
          { label: 'Allowed Free Leave', value: `${breakdown.allowed_leave_days || 0} d` },
          { label: 'Excess Leaves Deducted', value: `${excessLeaves} d` },
          { label: 'Unexcused Absences', value: `${unexcusedAbsences} d` },
          { label: 'OT Hours', value: `${(breakdown.ot_hours || 0).toFixed(1)} hrs` },
        ].map(({ label, value }) => (
          <div key={label} className={styles.attBox}>
            <span className={styles.attLabel}>{label}</span>
            <span className={styles.attValue}>{value}</span>
          </div>
        ))}
      </div>

      {/* Additions & Deductions Breakdown */}
      <div className={styles.edGrid}>
        {/* Additions */}
        <div>
          <h3 className={styles.subTitle}>Additions</h3>
          <div className={styles.lineItem}>
            <span>Fixed Monthly Base Salary</span>
            <span className="font-bold">{formatCurrency(baseSalary)}</span>
          </div>
          {Number(breakdown.ot_pay || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Overtime Pay ({(breakdown.ot_hours || 0).toFixed(1)} hrs × {formatCurrency(breakdown.ot_rate_per_hour || 0)})</span>
              <span className="text-admin-success font-semibold">+{formatCurrency(breakdown.ot_pay || 0)}</span>
            </div>
          )}
          {Number(breakdown.bonus_amount || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Bonus Payments</span>
              <span className="text-admin-success font-semibold">+{formatCurrency(breakdown.bonus_amount)}</span>
            </div>
          )}
          {Number(breakdown.incentive_pay || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Per-Job Technician Incentives</span>
              <span className="text-admin-success font-semibold">+{formatCurrency(breakdown.incentive_pay || 0)}</span>
            </div>
          )}
        </div>

        {/* Deductions */}
        <div>
          <h3 className={styles.subTitle}>Deductions</h3>
          {(Number(breakdown.late_deduction || 0) > 0 || Number(breakdown.early_deduction || 0) > 0) && (
            <div className={styles.lineItem}>
              <span>Attendance Penalty (Late / Early)</span>
              <span className={styles.deductionAmt}>−{formatCurrency(Number(breakdown.late_deduction || 0) + Number(breakdown.early_deduction || 0))}</span>
            </div>
          )}
          {Number(breakdown.leave_deduction || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Excess Leave Deduction ({excessLeaves} excess leaves)</span>
              <span className={styles.deductionAmt}>−{formatCurrency(breakdown.leave_deduction)}</span>
            </div>
          )}
          {Number(breakdown.halfday_deduction_total || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Half-Day Deduction ({breakdown.halfday_count || 0} half-days)</span>
              <span className={styles.deductionAmt}>−{formatCurrency(breakdown.halfday_deduction_total)}</span>
            </div>
          )}
          {Number(breakdown.absence_deduction || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Unexcused Absence ({unexcusedAbsences} d × {formatCurrency(breakdown.absent_day_deduction || 0)})</span>
              <span className={styles.deductionAmt}>−{formatCurrency(breakdown.absence_deduction)}</span>
            </div>
          )}
          {Number(breakdown.advance_deducted || 0) > 0 && (
            <div className={styles.lineItem}>
              <span>Advance Salary Deducted</span>
              <span className={styles.deductionAmt}>−{formatCurrency(breakdown.advance_deducted || 0)}</span>
            </div>
          )}
          {Number(breakdown.late_deduction || 0) === 0 &&
           Number(breakdown.early_deduction || 0) === 0 &&
           Number(breakdown.leave_deduction || 0) === 0 &&
           Number(breakdown.halfday_deduction_total || 0) === 0 &&
           Number(breakdown.absence_deduction || 0) === 0 &&
           Number(breakdown.advance_deducted || 0) === 0 && (
            <div className={styles.lineItem}>
              <span className="text-admin-text-muted italic">No deductions accrued for this month</span>
            </div>
          )}
        </div>
      </div>

      {/* Gross & Net Salary */}
      <div className="border-t border-admin-border pt-4 mt-4 space-y-2">
        <div className="flex items-center justify-between text-base font-bold text-admin-text-primary">
          <span>Gross Salary</span>
          <span>{formatCurrency(breakdown.gross_salary)}</span>
        </div>
        <div className={styles.netSalaryBox}>
          <span className={styles.netSalaryLabel}>Net Salary Payable</span>
          <span className={styles.netSalaryValue}>{formatCurrency(breakdown.net_salary)}</span>
        </div>
      </div>
    </div>
  );
}
