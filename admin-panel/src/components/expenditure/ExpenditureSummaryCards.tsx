'use client';

import { Payment } from '@/types/salary';
import { formatCurrency } from '@repairshop/shared';
import { Package, Wallet, Building2, IndianRupee } from 'lucide-react';
import styles from '@/styles/expenditure.module.css';

interface Props {
  payments: Payment[];
}

interface CardConfig {
  label: string;
  value: number;
  accentColor: string;
  Icon: React.ElementType;
}

export default function ExpenditureSummaryCards({ payments }: Props) {
  const sum = (type: string) =>
    payments.filter(p => p.type === type).reduce((s, p) => s + p.amount, 0);

  const materials = sum('materials_purchase');
  const daily     = sum('daily_expenditure');
  const office    = sum('office_development');
  const total     = materials + daily + office;

  const cards: CardConfig[] = [
    { label: 'Materials Purchase', value: materials, accentColor: 'var(--color-admin-progress-fg)',  Icon: Package      },
    { label: 'Daily Expenditure',  value: daily,     accentColor: 'var(--color-admin-warning)',      Icon: Wallet       },
    { label: 'Office Development', value: office,    accentColor: 'var(--color-admin-accent)',       Icon: Building2    },
    { label: 'Total Expenditure',  value: total,     accentColor: 'var(--color-admin-danger)',       Icon: IndianRupee  },
  ];

  return (
    <div className={styles.summaryGrid}>
      {cards.map(card => (
        <div key={card.label} className={styles.summaryCard} style={{ borderTopColor: card.accentColor }}>
          <div className={styles.summaryIcon}>
            <card.Icon size={24} style={{ color: card.accentColor }} />
          </div>
          <div className={styles.summaryLabel}>{card.label}</div>
          <div className={styles.summaryValue} style={{ color: card.accentColor }}>{formatCurrency(card.value)}</div>
        </div>
      ))}
    </div>
  );
}
