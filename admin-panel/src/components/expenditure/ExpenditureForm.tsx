'use client';

import { useReducer } from 'react';
import { supabase } from '@/lib/supabase';
import { PaymentType } from '@/types/salary';
import { Plus, PlusCircle, CheckCircle2 } from 'lucide-react';
import styles from '@/styles/expenditure.module.css';

const EXPENDITURE_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'materials_purchase', label: 'Materials Purchase' },
  { value: 'daily_expenditure', label: 'Daily Expenditure' },
  { value: 'office_development', label: 'Office Development' },
];

interface Props {
  currentAdminId: string;
  onSuccess: () => void;
}

export default function ExpenditureForm({ currentAdminId, onSuccess }: Props) {
  const [state, dispatch] = useReducer((prev: any, next: any) => ({ ...prev, ...next }), {
    type: '' as PaymentType | '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    saving: false,
    error: '',
    success: '',
  });

  const handleSubmit = async () => {
    dispatch({ error: '', success: '' });
    if (!state.type) return dispatch({ error: 'Please select an expenditure type.' });
    const amt = parseFloat(state.amount);
    if (!state.amount || isNaN(amt) || amt <= 0) return dispatch({ error: 'Amount must be greater than 0.' });
    if (!state.description.trim()) return dispatch({ error: 'Description is required.' });
    if (!state.date) return dispatch({ error: 'Date is required.' });

    dispatch({ saving: true });
    let err = null;
    try {
      const { error } = await supabase.from('payments').insert({
        type: state.type,
        amount: amt,
        description: state.description.trim(),
        user_id: null,
        created_by: currentAdminId,
        created_at: new Date(state.date).toISOString(),
      });
      err = error;
    } finally {
      dispatch({ saving: false });
    }

    if (err) return dispatch({ error: err.message });
    dispatch({ 
      success: 'Expenditure recorded successfully!',
      type: '', amount: '', description: '', date: new Date().toISOString().split('T')[0]
    });
    onSuccess();
  };

  return (
    <div className={styles.card}>
      <button
        className={styles.btnPrimary}
        onClick={handleSubmit}
        disabled={state.saving}
        style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <Plus size={16} />
        {state.saving ? 'Saving...' : 'Add Expenditure'}
      </button>
    </div>
  );
}
