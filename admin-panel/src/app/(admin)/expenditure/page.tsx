'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Payment, PaymentType } from '@/types/salary';
import ExpenditureForm from '@/components/expenditure/ExpenditureForm';
import ExpenditureTable from '@/components/expenditure/ExpenditureTable';
import ExpenditureSummaryCards from '@/components/expenditure/ExpenditureSummaryCards';
import { getCurrentMonth } from '@/utils/formatDate';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/ToastProvider';
import { Lock, ClipboardList, Download } from 'lucide-react';

const EXPENDITURE_TYPES: Array<{ value: PaymentType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'materials_purchase', label: 'Materials Purchase' },
  { value: 'daily_expenditure', label: 'Daily Expenditure' },
  { value: 'office_development', label: 'Office Development' },
];

export default function ExpenditurePage() {
  const { role, profile, isLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth);
  const [typeFilter, setTypeFilter] = useState<PaymentType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const start = `${month}-01`;
    // Next month
    const [y, m] = month.split('-').map(Number);
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;

    let query = supabase
      .from('payments')
      .select('*')
      .in('type', ['materials_purchase', 'daily_expenditure', 'office_development'])
      .gte('created_at', start + 'T00:00:00.000Z')
      .lt('created_at', nextMonth + 'T00:00:00.000Z')
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    try {
      const { data, error } = await query;
      if (error) {
        showToast('Failed to fetch expenditure records', 'error');
      } else {
        setPayments(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [month, typeFilter, refreshKey, showToast]);

  useEffect(() => {
    if (role === 'admin') fetchPayments();
  }, [role, fetchPayments]);

  if (isLoading) return <LoadingState message="Loading expenditure records..." className="h-full" />;

  if (role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState 
          icon={<Lock className="w-12 h-12 text-admin-danger" />}
          heading="Access Denied"
          subtext="Expenditure management is restricted to administrators only."
        />
      </div>
    );
  }

  const filtered = search.trim()
    ? payments.filter(p => p.description?.toLowerCase().includes(search.toLowerCase()))
    : payments;

  const handleExportCSV = () => {
    setExporting(true);
    if (filtered.length === 0) {
      showToast('No records to export', 'info');
      setExporting(false);
      return;
    }

    let csvData = 'Date,Type,Description,Amount\n';
    filtered.forEach(p => {
      csvData += `"${new Date(p.created_at).toLocaleDateString()}","${p.type}","${p.description || ''}",${p.amount}\n`;
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenditure-${month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Expenditure Tracking" 
        description="Record and monitor all business expenses for the selected month."
      >
        <Button onClick={handleExportCSV} isLoading={exporting} variant="outline" size="sm" className="flex items-center gap-2">
          <Download size={16} />
          Export CSV
        </Button>
      </PageHeader>

      <ExpenditureSummaryCards payments={payments} />

      {profile && (
        <ExpenditureForm
          currentAdminId={profile.id}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      )}

      {/* Filters */}
      <Card noAccentLine>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={20} className="text-admin-text-secondary" />
            Expenditure History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Month</label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Type</label>
              <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as PaymentType | 'all')}>
                {EXPENDITURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Search Description</label>
              <Input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <LoadingState message="Loading expenditure records..." />
        ) : (
          <ExpenditureTable payments={filtered} />
        )}
      </div>
    </div>
  );
}
