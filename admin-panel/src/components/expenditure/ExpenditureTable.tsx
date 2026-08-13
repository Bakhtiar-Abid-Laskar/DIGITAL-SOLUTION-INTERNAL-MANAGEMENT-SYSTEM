'use client';

import { Payment, PaymentType } from '@/types/salary';
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import styles from '@/styles/expenditure.module.css';

const TYPE_LABELS: Record<PaymentType, string> = {
  advance_salary: 'Advance Salary',
  materials_purchase: 'Materials Purchase',
  daily_expenditure: 'Daily Expenditure',
  office_development: 'Office Development',
};

const TYPE_COLORS: Record<string, string> = {
  materials_purchase: '#3b82f6',
  daily_expenditure: '#f59e0b',
  office_development: '#8b5cf6',
};

interface Props {
  payments: Payment[];
}

export default function ExpenditureTable({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <div className={styles.card}>
        <p style={{ textAlign: 'center', color: '#666', padding: '24px 0' }}>No expenditure records found.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td>{formatDate(p.created_at)}</td>
                <td>
                  <span className={styles.typeBadge} style={{ backgroundColor: TYPE_COLORS[p.type] || '#6b7280' }}>
                    {TYPE_LABELS[p.type] || p.type}
                  </span>
                </td>
                <td style={{ fontWeight: 'bold' }}>{formatCurrency(p.amount)}</td>
                <td style={{ color: 'var(--color-admin-text-secondary)' }}>{p.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
