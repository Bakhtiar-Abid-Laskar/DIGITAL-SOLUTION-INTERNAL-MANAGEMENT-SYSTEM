'use client';

import { useState } from 'react';
import { SalaryBreakdown } from '@/types/salary';
import { User } from '@repairshop/shared';
import { Calculator, Play } from 'lucide-react';
import styles from '@/styles/salary.module.css';

interface Props {
  staff: User[];
  onResult: (breakdown: SalaryBreakdown) => void;
}

export default function SalaryCalculatorForm({ staff, onResult }: Props) {
  const [userId, setUserId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async () => {
    if (calculating) return;
    setError('');
    if (!userId) return setError('Please select a staff member.');
    if (!month) return setError('Please select a month.');

    setCalculating(true);
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-monthly-salary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, month })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Calculation failed');
      }

      onResult(json.data as SalaryBreakdown);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calculator size={20} style={{ flexShrink: 0 }} />
        Calculate Monthly Salary
      </h2>
      <p className={styles.hint}>Working days are auto-calculated from attendance records for the selected month.</p>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="field-eqtp3p" className={styles.label}>Select Staff Member *</label>
          <select id="field-eqtp3p" className={styles.select} value={userId} onChange={e => setUserId(e.target.value)} aria-label="Select staff member">
            <option value="">-- Choose Staff --</option>
            {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="field-u1883d" className={styles.label}>Month *</label>
          <input id="field-u1883d" className={styles.input} type="month" value={month} onChange={e => setMonth(e.target.value)} aria-label="Select month" />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={styles.btnPrimary}
        onClick={handleCalculate}
        disabled={calculating}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        {calculating ? (
          <>
            <Calculator size={16} />
            Calculating...
          </>
        ) : (
          <>
            <Play size={16} />
            Calculate Salary
          </>
        )}
      </button>
    </div>
  );
}
