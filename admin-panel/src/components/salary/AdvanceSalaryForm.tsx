'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@repairshop/shared';
import { Payment } from '@/types/salary';
import { Wallet, Check, Printer, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import { generateAdvanceReceiptHtml } from '@/utils/receiptHtml';
import DOMPurify from 'dompurify';
import styles from '@/styles/salary.module.css';

interface Props {
  staff: User[];
  currentAdminId: string;
  currentAdminName: string;
  onSuccess: () => void;
}

export default function AdvanceSalaryForm({ staff, currentAdminId, currentAdminName, onSuccess }: Props) {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastPayment, setLastPayment] = useState<{ payment: Payment; staffName: string; staffRole: string } | null>(null);

  const handleSubmit = async () => {
    setError('');
    if (!userId) return setError('Please select a staff member.');
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return setError('Amount must be greater than 0.');
    if (!date) return setError('Date is required.');

    setSaving(true);
    let err = null, resultData = null;
    try {
      // user_id and created_by are set server-side by the security-definer RPC
      // which first verifies auth.uid() is an active admin.
      const { data, error } = await supabase.rpc('record_advance_salary', {
        p_user_id:     userId,
        p_amount:      amt,
        p_description: description.trim() || null,
        p_date:        date,
      });
      err = error;
      resultData = data;
    } finally {
      setSaving(false);
    }

    if (err) return setError(err.message);
    const data = resultData;

    const staffMember = staff.find(s => s.id === userId);
    setLastPayment({ payment: data, staffName: staffMember?.name || '', staffRole: staffMember?.role || '' });
    setUserId(''); setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]);
    onSuccess();
  };

  const handlePrintReceipt = () => {
    if (!lastPayment) return;
    const html = generateAdvanceReceiptHtml(lastPayment.payment, lastPayment.staffName, lastPayment.staffRole, currentAdminName);
    const win = window.open('', '_blank');
    if (!win) return;
    const cleanHtml = DOMPurify.sanitize(html);
    win.document.write(cleanHtml);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wallet size={20} style={{ flexShrink: 0 }} />
        Record Advance Salary
      </h2>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="field-ikint0" className={styles.label}>Staff Member *</label>
          <select id="field-ikint0" className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="field-uc2ff1" className={styles.label}>Amount (₹) *</label>
          <input id="field-uc2ff1" className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" />
        </div>
        <div className={styles.field}>
          <label htmlFor="field-ez7gw6" className={styles.label}>Date *</label>
          <input id="field-ez7gw6" className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="field-qa0og4" className={styles.label}>Description (optional)</label>
        <input id="field-qa0og4" className={styles.input} type="text" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="e.g. Festival advance" />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} />
          {saving ? 'Recording...' : 'Record Advance'}
        </button>
        {lastPayment && (
          <button className={styles.btnSecondary} onClick={handlePrintReceipt} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Printer size={16} />
            Print Receipt
          </button>
        )}
      </div>

      {lastPayment && (
        <div className={styles.successMsg} style={{ marginTop: 12 }}>
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Advance of {formatCurrency(lastPayment.payment.amount)} recorded for {lastPayment.staffName} on {formatDate(lastPayment.payment.created_at)}.
        </div>
      )}
    </div>
  );
}
