import { SalaryBreakdown } from '@/types/salary';
import { formatCurrency, roundMoney } from '@repairshop/shared';
import { formatMonthLabel } from './formatDate';

/**
 * Generates printable HTML for a salary slip under the Fixed Monthly Salary model.
 * Used with window.print() in the browser admin panel.
 */
export function generateSalarySlipHtml(breakdown: SalaryBreakdown): string {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const baseSalary = breakdown.monthly_salary || breakdown.base_pay || 0;

  const additionRows = [
    `<tr><td>Fixed Monthly Base Salary</td><td class="amount">${formatCurrency(baseSalary)}</td></tr>`,
    breakdown.ot_pay ? `<tr><td>Overtime Pay (${(breakdown.ot_hours || 0).toFixed(1)} hrs × ${formatCurrency(breakdown.ot_rate_per_hour || 0)})</td><td class="amount">${formatCurrency(breakdown.ot_pay)}</td></tr>` : '',
    breakdown.bonus_amount ? `<tr><td>Bonus Payments</td><td class="amount">${formatCurrency(breakdown.bonus_amount)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const deductionRows = [
    (breakdown.late_deduction || breakdown.early_deduction) ? `<tr><td>Attendance Penalty (Late / Early)</td><td class="amount">${formatCurrency((breakdown.late_deduction || 0) + (breakdown.early_deduction || 0))}</td></tr>` : '',
    breakdown.leave_deduction ? `<tr><td>Leave Deduction (${Math.max(0, (breakdown.leave_count || 0) - (breakdown.allowed_leave_days || 0))} excess)</td><td class="amount">${formatCurrency(breakdown.leave_deduction)}</td></tr>` : '',
    breakdown.halfday_deduction_total ? `<tr><td>Half-Day Deduction (${breakdown.halfday_count || 0} half-days)</td><td class="amount">${formatCurrency(breakdown.halfday_deduction_total)}</td></tr>` : '',
    breakdown.absence_deduction ? `<tr><td>Unexcused Absence (${breakdown.chargeable_days || 0} d × ${formatCurrency(breakdown.absent_day_deduction || 0)})</td><td class="amount">${formatCurrency(breakdown.absence_deduction)}</td></tr>` : '',
    breakdown.advance_deducted ? `<tr><td>Advance Salary Deducted</td><td class="amount">${formatCurrency(breakdown.advance_deducted)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const totalDeductions = roundMoney(
    (breakdown.total_deductions || 0) + (breakdown.advance_deducted || 0)
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Salary Slip - ${breakdown.employee_name} - ${formatMonthLabel(breakdown.month)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 30px; }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 18px; }
    .header h1 { font-size: 24px; font-weight: bold; }
    .header h2 { font-size: 14px; color: #555; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
    .info-box { padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .info-label { color: #555; }
    .info-value { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f5f5f5; text-align: left; padding: 8px 10px; font-size: 12px; border: 1px solid #ddd; }
    td { padding: 8px 10px; border: 1px solid #ddd; }
    .amount { text-align: right; }
    .total-row { background: #f9f9f9; font-weight: bold; }
    .net-salary-box { border: 2px solid #222; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px; }
    .net-salary-label { font-size: 13px; color: #555; margin-bottom: 4px; }
    .net-salary-value { font-size: 28px; font-weight: bold; color: #1a1a1a; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .sig-box { border-top: 1px solid #222; padding-top: 8px; text-align: center; font-size: 12px; color: #444; }
    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RepairShop</h1>
    <h2>Salary Slip</h2>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Employee Details</h3>
      <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${breakdown.employee_name}</span></div>
      <div class="info-row"><span class="info-label">Role:</span><span class="info-value" style="text-transform:capitalize">${breakdown.employee_role}</span></div>
    </div>
    <div class="info-box">
      <h3>Pay Period</h3>
      <div class="info-row"><span class="info-label">Month:</span><span class="info-value">${formatMonthLabel(breakdown.month)}</span></div>
      <div class="info-row"><span class="info-label">Generated:</span><span class="info-value">${today}</span></div>
    </div>
  </div>

  <div class="info-box" style="margin-bottom:16px">
    <h3>Attendance & Leave Summary</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">
      <div class="info-row"><span class="info-label">Working Days:</span><span class="info-value">${breakdown.working_days}</span></div>
      <div class="info-row"><span class="info-label">Holidays:</span><span class="info-value">${breakdown.holidays_count || 0}</span></div>
      <div class="info-row"><span class="info-label">Present Days:</span><span class="info-value">${breakdown.present_days}</span></div>
      <div class="info-row"><span class="info-label">Half-Days:</span><span class="info-value">${breakdown.halfday_count || breakdown.half_absent_days || 0}</span></div>
      <div class="info-row"><span class="info-label">Absent Days:</span><span class="info-value">${breakdown.absent_count || breakdown.full_absent_days || 0}</span></div>
      <div class="info-row"><span class="info-label">Allowed Leave:</span><span class="info-value">${breakdown.allowed_leave_days || 0} days</span></div>
      <div class="info-row"><span class="info-label">Chargeable Absences:</span><span class="info-value">${breakdown.chargeable_days || 0} days</span></div>
      <div class="info-row"><span class="info-label">OT Hours:</span><span class="info-value">${(breakdown.ot_hours || 0).toFixed(1)}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <table>
        <thead>
          <tr><th>Additions</th><th class="amount">Amount</th></tr>
        </thead>
        <tbody>
          ${additionRows}
          <tr class="total-row"><td>Gross Salary</td><td class="amount">${formatCurrency(breakdown.gross_salary)}</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <table>
        <thead>
          <tr><th>Deductions</th><th class="amount">Amount</th></tr>
        </thead>
        <tbody>
          ${deductionRows || '<tr><td>None</td><td class="amount">₹0.00</td></tr>'}
          <tr class="total-row"><td>Total Deductions</td><td class="amount">${formatCurrency(totalDeductions)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="net-salary-box">
    <div class="net-salary-label">Net Salary Payable</div>
    <div class="net-salary-value">${formatCurrency(breakdown.net_salary)}</div>
  </div>

  <div class="signatures">
    <div class="sig-box">Employee Signature</div>
    <div class="sig-box">Manager / Admin Signature</div>
  </div>

  <div class="footer">RepairShop — This is a computer generated salary slip.</div>
</body>
</html>`;
}
