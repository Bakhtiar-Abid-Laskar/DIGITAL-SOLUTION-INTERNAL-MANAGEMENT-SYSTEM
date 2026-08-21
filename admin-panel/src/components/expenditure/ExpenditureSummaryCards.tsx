'use client';

import { Payment } from '@/types/salary';
import { formatCurrency } from '@repairshop/shared';
import { Package, Wallet, Building2, IndianRupee } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';

interface Props {
  payments: Payment[];
}

export default function ExpenditureSummaryCards({ payments }: Props) {
  const sum = (type: string) =>
    payments.filter(p => p.type === type).reduce((s, p) => s + p.amount, 0);

  const materials = sum('materials_purchase');
  const daily     = sum('daily_expenditure');
  const office    = sum('office_development');
  const total     = materials + daily + office;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Materials Purchase"
        value={formatCurrency(materials)}
        detail="Parts and components"
        icon={<Package size={18} />}
        tone="info"
      />
      <StatCard
        title="Daily Expenditure"
        value={formatCurrency(daily)}
        detail="Routine operational spend"
        icon={<Wallet size={18} />}
        tone="warning"
      />
      <StatCard
        title="Office Development"
        value={formatCurrency(office)}
        detail="Infrastructure & tools"
        icon={<Building2 size={18} />}
        tone="neutral"
      />
      <StatCard
        title="Total Expenditure"
        value={formatCurrency(total)}
        detail="Combined expenses this month"
        icon={<IndianRupee size={18} />}
        tone="danger"
      />
    </div>
  );
}
