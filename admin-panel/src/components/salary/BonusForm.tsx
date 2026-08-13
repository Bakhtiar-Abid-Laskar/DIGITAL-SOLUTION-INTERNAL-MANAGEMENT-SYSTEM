'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@repairshop/shared';
import { EmployeeBonus } from '@/types/salary';
import { Gift, Check, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import styles from '@/styles/salary.module.css';

interface Props {
  staff: User[];
  onSuccess: () => void;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function BonusForm({ staff, onSuccess }: Props) {
  const now = new Date();
  const [userId,  setUserId]  = useState('');
  const [amount,  setAmount]  = useState('');
  const [reason,  setReason]  = useState('');
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [lastBonus, setLastBonus] = useState<{ bonus: EmployeeBonus; staffName: string } | null>(null);

  const handleSubmit = async () => {
    setError('');
    if (!userId) return setError('Please select a staff member.');
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return setError('Amount must be greater than 0.');
    if (!reason.trim()) return setError('Reason is required.');

    setSaving(true);
    let err = null;
    let data = null;
    try {
      // user_id, created_by, and the audit log are all written server-side
      // by the security-definer RPC, which first verifies auth.uid() is admin.
      const response = await supabase.rpc('record_bonus', {
        p_user_id: userId,
        p_amount:  amt,
        p_reason:  reason.trim(),
        p_month:   month,
        p_year:    year,
      });
      data = response.data;
      err = response.error;
    } finally {
      setSaving(false);
    }
    
    if (err) return setError(err.message);

    const staffMember = staff.find(s => s.id === userId);
    setLastBonus({ bonus: data as EmployeeBonus, staffName: staffMember?.name || '' });
    setUserId(''); setAmount(''); setReason('');
    onSuccess();
  };

  const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Gift size={20} style={{ flexShrink: 0 }} />
        Record Bonus
      </h2>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="field-0cphiu" className={styles.label}>Staff Member *</label>
          <select id="field-0cphiu" className={styles.select} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— choose staff —</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="field-sr6k7h" className={styles.label}>Amount (₹) *</label>
          <input id="field-sr6k7h" className={styles.input} type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="field-5ogt1r" className={styles.label}>Month *</label>
          <select id="field-5ogt1r" className={styles.select} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="field-81w0ow" className={styles.label}>Year *</label>
          <select id="field-81w0ow" className={styles.select} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="field-egzcf2" className={styles.label}>Reason *</label>
        <input id="field-egzcf2" className={styles.input} type="text" value={reason}
          onChange={e => setReason(e.target.value)} placeholder="e.g. Diwali bonus, exceptional performance" />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} />
          {saving ? 'Recording...' : 'Record Bonus'}
        </button>
      </div>

      {lastBonus && (
        <div className={styles.successMsg} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
          Bonus of {formatCurrency(lastBonus.bonus.amount)} recorded for {lastBonus.staffName} on {formatDate(lastBonus.bonus.created_at)}.
        </div>
      )}
    </div>
  );
}
