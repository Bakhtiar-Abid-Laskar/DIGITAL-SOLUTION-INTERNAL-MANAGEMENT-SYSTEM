'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StaffRate } from '@/types/salary';
import { User } from '@repairshop/shared';
import { CheckCircle2, Settings } from 'lucide-react';
import styles from '@/styles/salary.module.css';

interface Props {
  staff: User[];
}

export default function StaffRateForm({ staff }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rate, setRate] = useState<StaffRate | null>(null);

  // Form State
  const [monthlySalary, setMonthlySalary] = useState('');
  const [allowedLeaveDays, setAllowedLeaveDays] = useState('2');
  const [absentDeduction, setAbsentDeduction] = useState('');
  const [halfdayDeduction, setHalfdayDeduction] = useState('');
  const [penaltyTier1, setPenaltyTier1] = useState('');
  const [penaltyTier2, setPenaltyTier2] = useState('');
  const [otRate, setOtRate] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchRate = async () => {
      if (!selectedUserId) {
        if (isMounted) setRate(null);
        return;
      }
      if (isMounted) {
        setLoading(true);
        setError('');
        setSuccess('');
      }

      try {
        const { data, error: err } = await supabase
          .from('staff_rates')
          .select('*')
          .eq('user_id', selectedUserId)
          .maybeSingle();

        if (!isMounted) return;

        if (err) setError(err.message);
        setRate(data);

        setMonthlySalary(data?.monthly_salary?.toString() || data?.base_pay?.toString() || '');
        setAllowedLeaveDays(data?.allowed_leave_days?.toString() || '2');
        setAbsentDeduction(data?.absent_day_deduction?.toString() || '0');
        setHalfdayDeduction(data?.halfday_deduction?.toString() || '80');
        setPenaltyTier1(data?.penalty_tier1_amount?.toString() || '30');
        setPenaltyTier2(data?.penalty_tier2_amount?.toString() || '60');
        setOtRate(data?.ot_rate_per_hour?.toString() || '0');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRate();
    return () => { isMounted = false; };
  }, [selectedUserId]);

  const handleSave = async () => {
    setError(''); setSuccess('');

    const monthlyVal = parseFloat(monthlySalary);
    const leaveVal = parseInt(allowedLeaveDays, 10);
    const absentVal = parseFloat(absentDeduction);
    const halfdayVal = parseFloat(halfdayDeduction);
    const pTier1 = parseFloat(penaltyTier1);
    const pTier2 = parseFloat(penaltyTier2);
    const otVal = parseFloat(otRate);

    if (!selectedUserId) return setError('Please select a staff member.');
    if (isNaN(monthlyVal) || monthlyVal < 0) return setError('Monthly salary must be 0 or greater.');
    if (isNaN(leaveVal) || leaveVal < 0) return setError('Allowed leave days must be 0 or greater.');
    if (isNaN(absentVal) || absentVal < 0) return setError('Absent deduction must be 0 or greater.');
    if (isNaN(halfdayVal) || halfdayVal < 0) return setError('Half-day deduction must be 0 or greater.');
    if (isNaN(pTier1) || pTier1 < 0) return setError('1st hour penalty must be 0 or greater.');
    if (isNaN(pTier2) || pTier2 < 0) return setError('>1 hour penalty must be 0 or greater.');
    if (isNaN(otVal) || otVal < 0) return setError('OT rate must be 0 or greater.');

    setSaving(true);
    const payload = {
      user_id: selectedUserId,
      monthly_salary: monthlyVal,
      base_pay: monthlyVal, // Fallback compatibility
      base_daily_rate: monthlyVal > 0 ? Math.round((monthlyVal / 30) * 100) / 100 : 0,
      allowed_leave_days: leaveVal,
      absent_day_deduction: absentVal,
      halfday_deduction: halfdayVal,
      penalty_tier1_amount: pTier1,
      penalty_tier2_amount: pTier2,
      ot_rate_per_hour: otVal,
    };

    try {
      const { error: err } = await supabase.from('staff_rates').upsert(payload, { onConflict: 'user_id' });
      if (err) return setError(err.message);
      setSuccess('Staff salary configuration saved successfully!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings size={20} style={{ flexShrink: 0 }} />
        Payroll Configuration
      </h2>

      <div className={styles.field}>
        <label htmlFor="field-t5m4kx" className={styles.label}>Select Staff Member *</label>
        <select id="field-t5m4kx" className={styles.select} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">— choose staff —</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
      </div>

      {loading && <p className={styles.hint}>Loading current configuration...</p>}

      {selectedUserId && !loading && (
        <div className="space-y-6 mt-4">
          {rate ? (
            <p className={styles.hint} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, color: 'var(--color-admin-success)' }} />
              Existing configuration loaded. Update below.
            </p>
          ) : (
            <p className={styles.hint}>No salary config set yet. Enter new configuration below.</p>
          )}

          <div className="border border-admin-border p-4 rounded-xl space-y-4 bg-admin-bg-subtle/30">
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="field-b1qtk0" className={styles.label}>Fixed Monthly Salary (₹) *</label>
                <input id="field-b1qtk0" className={styles.input} type="number" min="0" step="0.01"
                  value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="e.g. 25000" />
              </div>

              <div className={styles.field}>
                <label htmlFor="field-15q5pa" className={styles.label}>Allowed Leave Days per Month *</label>
                <input id="field-15q5pa" className={styles.input} type="number" min="0" step="1"
                  value={allowedLeaveDays} onChange={e => setAllowedLeaveDays(e.target.value)} placeholder="Default: 2" />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="field-s8cymf" className={styles.label}>Absent Day Penalty Deduction (₹)</label>
                <input id="field-s8cymf" className={styles.input} type="number" min="0" step="0.01"
                  value={absentDeduction} onChange={e => setAbsentDeduction(e.target.value)} placeholder="e.g. 800" />
                <span className="text-xs text-admin-text-muted mt-1">Applied after allowed leave days are used.</span>
              </div>

              <div className={styles.field}>
                <label htmlFor="field-lg58yo" className={styles.label}>Half-Day Deduction (₹)</label>
                <input id="field-lg58yo" className={styles.input} type="number" min="0" step="0.01"
                  value={halfdayDeduction} onChange={e => setHalfdayDeduction(e.target.value)} placeholder="e.g. 80" />
                <span className="text-xs text-admin-text-muted mt-1">Applied per half-day marked.</span>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="field-7gr68q" className={styles.label}>Late/Early 1st Hr Penalty (₹)</label>
                <input id="field-7gr68q" className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier1} onChange={e => setPenaltyTier1(e.target.value)} placeholder="e.g. 30" />
              </div>

              <div className={styles.field}>
                <label htmlFor="field-fhzhvk" className={styles.label}>Late/Early {'>'}1 Hr Penalty (₹)</label>
                <input id="field-fhzhvk" className={styles.input} type="number" min="0" step="0.01"
                  value={penaltyTier2} onChange={e => setPenaltyTier2(e.target.value)} placeholder="e.g. 60" />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="field-iwxfrs" className={styles.label}>Overtime (OT) Rate (₹/hour)</label>
                <input id="field-iwxfrs" className={styles.input} type="number" min="0" step="0.01"
                  value={otRate} onChange={e => setOtRate(e.target.value)} placeholder="e.g. 150" />
              </div>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {saving ? 'Saving Config...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );
}
