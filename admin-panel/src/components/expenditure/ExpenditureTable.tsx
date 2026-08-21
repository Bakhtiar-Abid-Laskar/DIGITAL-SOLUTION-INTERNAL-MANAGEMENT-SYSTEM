'use client';

import { Payment, PaymentType } from '@/types/salary';
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import { DataTable, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { Receipt } from 'lucide-react';

const TYPE_LABELS: Record<PaymentType, string> = {
  advance_salary: 'Advance Salary',
  materials_purchase: 'Materials Purchase',
  daily_expenditure: 'Daily Expenditure',
  office_development: 'Office Development',
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  materials_purchase: 'bg-admin-progress-bg text-admin-progress-fg border-admin-progress-fg/20',
  daily_expenditure: 'bg-admin-urgent-bg text-admin-urgent-fg border-admin-urgent-fg/20',
  office_development: 'bg-admin-accent-dim text-admin-accent border-admin-accent/20',
};

interface Props {
  payments: Payment[];
  isLoading?: boolean;
}

export default function ExpenditureTable({ payments, isLoading }: Props) {
  return (
    <DataTable
      isLoading={isLoading}
      skeletonRows={5}
      skeletonCols={4}
      isEmpty={payments.length === 0}
      emptyState={
        <EmptyState
          icon={<Receipt size={40} className="text-admin-text-muted" />}
          heading="No expenditure records found"
          subtext="No expenses recorded for the selected month and filter."
        />
      }
    >
      <TableHead>
        <tr>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell align="right">Amount</TableHeaderCell>
          <TableHeaderCell>Description</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {payments.map(p => (
          <TableRow key={p.id}>
            <TableCell className="text-xs text-admin-text-muted font-medium">
              {formatDate(p.created_at)}
            </TableCell>
            <TableCell>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPE_BADGE_CLASSES[p.type] || 'bg-admin-bg-subtle text-admin-text-secondary border-admin-border'}`}>
                {TYPE_LABELS[p.type] || p.type}
              </span>
            </TableCell>
            <TableCell align="right" className="font-bold text-admin-text-primary">
              {formatCurrency(p.amount)}
            </TableCell>
            <TableCell className="text-admin-text-secondary">
              {p.description || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );
}
