'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Holiday } from '@repairshop/shared';
import { Plus } from 'lucide-react';
import styles from '@/styles/salary.module.css';

export default function HolidayCalendarForm() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });
      if (err) console.error('Error fetching holidays:', err);
      else setHolidays(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!date) return setError('Holiday date is required');
    if (!name.trim()) return setError('Holiday name is required');

    setSaving(true);
    let err = null;
    try {
      const { error } = await supabase
        .from('holidays')
        .upsert({
          date,
          name: name.trim(),
          is_recurring: isRecurring,
        }, { onConflict: 'date' });
      err = error;
    } finally {
      setSaving(false);
    }
    
    if (err) {
      if (err.message?.includes('holidays_date_key') || (err as any).code === '23505') {
        setError('A holiday for this date is already configured. You can delete the existing one or pick another date.');
      } else {
        setError(err.message || 'Failed to save holiday');
      }
    } else {
      setSuccess('Holiday saved successfully!');
      setDate('');
      setName('');
      setIsRecurring(false);
      fetchHolidays();
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the holiday "${name}"?`)) return;
    const { error: err } = await supabase.from('holidays').delete().eq('id', id);
    if (err) {
      setError(err.message || 'Failed to delete holiday');
    } else {
      setSuccess('Holiday deleted');
      fetchHolidays();
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>📅 Official Company Holiday Calendar</h2>
      <p className={styles.hint}>Configured holidays are automatically excluded from working-day attendance deduction rules.</p>

      {/* Add Holiday Form */}
      <form onSubmit={handleAddHoliday} className="border border-admin-border p-4 rounded-xl space-y-4 bg-admin-bg-subtle/30 my-4">
        <h3 className="text-sm font-bold text-admin-text-primary uppercase tracking-wide">Add New Holiday</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="field-hdbvb1" className={styles.label}>Date *</label>
            <input id="field-hdbvb1" className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div className={styles.field}>
            <label htmlFor="field-3hr9k5" className={styles.label}>Holiday Name *</label>
            <input id="field-3hr9k5" className={styles.input} type="text" placeholder="e.g. Independence Day, Diwali" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="is_recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded border-admin-border" />
            <label htmlFor="is_recurring" className="text-sm text-admin-text-primary select-none cursor-pointer">Annual Recurring</label>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.successMsg}>{success}</p>}

        <button className={styles.btnPrimary} type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} />
          {saving ? 'Adding...' : 'Add Holiday'}
        </button>
      </form>

      {/* Holiday List Table */}
      <div className="mt-6 overflow-x-auto">
        <h3 className="text-sm font-bold text-admin-text-primary uppercase tracking-wide mb-3">Configured Holidays ({holidays.length})</h3>
        {loading ? (
          <p className={styles.hint}>Loading holiday calendar...</p>
        ) : holidays.length === 0 ? (
          <p className={styles.hint}>No company holidays configured yet.</p>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap border border-admin-border rounded-xl overflow-hidden">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Holiday Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-admin-bg-hover transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-admin-text-primary">{h.date}</td>
                  <td className="px-4 py-3 font-semibold text-admin-text-primary">{h.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${h.is_recurring ? 'bg-admin-accent/20 text-admin-accent' : 'bg-admin-bg-subtle text-admin-text-muted'}`}>
                      {h.is_recurring ? 'Annual Recurring' : 'Single Date'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDeleteHoliday(h.id, h.name)} className="text-xs text-admin-danger hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
