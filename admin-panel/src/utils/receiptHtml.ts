import { Payment } from '@/types/salary';
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from './formatDate';

/**
 * Escapes HTML special characters so user-derived strings
 * are rendered as inert text, not executable markup.
 */
function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateAdvanceReceiptHtml(
  payment: Payment,
  staffName: string,
  staffRole: string,
  adminName: string
): string {
  const safeName = escapeHtml(staffName);
  const safeRole = escapeHtml(staffRole);
  const safeAdmin = escapeHtml(adminName);
  const safeDesc = escapeHtml(payment.description);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Advance Salary Receipt - ${safeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 40px; max-width: 600px; margin: auto; }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 26px; font-weight: bold; }
    .header h2 { font-size: 13px; color: #555; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .receipt-box { border: 1px solid #ddd; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
    .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .label { color: #666; }
    .value { font-weight: bold; }
    .amount-highlight { font-size: 22px; color: #1a1a1a; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
    .sig-box { border-top: 1px solid #222; padding-top: 8px; text-align: center; font-size: 12px; color: #444; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Digital Solution</h1>
    <h2>Advance Salary Receipt</h2>
  </div>

  <div class="receipt-box">
    <div class="row"><span class="label">Staff Name:</span><span class="value">${safeName}</span></div>
    <div class="row"><span class="label">Role:</span><span class="value" style="text-transform:capitalize">${safeRole}</span></div>
    <div class="row"><span class="label">Date:</span><span class="value">${formatDate(payment.created_at)}</span></div>
    <div class="row"><span class="label">Description:</span><span class="value">${safeDesc || '—'}</span></div>
    <div class="row"><span class="label">Issued By:</span><span class="value">${safeAdmin}</span></div>
    <div class="row"><span class="label">Amount:</span><span class="value amount-highlight">${formatCurrency(payment.amount)}</span></div>
  </div>

  <div class="signatures">
    <div class="sig-box">Employee Signature</div>
    <div class="sig-box">Manager / Admin Signature</div>
  </div>

  <div class="footer">Digital Solution — This is an advance salary payment receipt.</div>
</body>
</html>`;
}
