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
import { SearchFilterBar } from '@/components/common/SearchFilterBar';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { DataTableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/ToastProvider';
import { Lock, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  if (isLoading) return <DataTableSkeleton rows={6} cols={4} />;

  if (role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState 
          icon={<Lock className="w-12 h-12 text-admin-urgent-fg" />}
          heading="Access Denied"
          subtext="Expenditure management is restricted to administrators only."
        />
      </div>
    );
  }

  const filtered = search.trim()
    ? payments.filter(p => p.description?.toLowerCase().includes(search.toLowerCase()))
    : payments;

  const handleExportXLSX = () => {
    setExporting(true);
    if (filtered.length === 0) {
      showToast('No records to export', 'info');
      setExporting(false);
      return;
    }

    const data = filtered.map(p => ({
      Date: new Date(p.created_at).toLocaleDateString(),
      Type: p.type,
      Description: p.description || '',
      Amount: p.amount
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenditures");
    XLSX.writeFile(wb, `expenditure-${month}.xlsx`);
    
    setExporting(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Expenditure Tracking" 
        description="Record and monitor all business expenses for the selected month."
        actions={
          <Button onClick={handleExportXLSX} isLoading={exporting} variant="outline" size="sm" leftIcon={<Download size={14} />}>
            Export XLSX
          </Button>
        }
      />

      <ExpenditureSummaryCards payments={payments} />

      {profile && (
        <ExpenditureForm
          currentAdminId={profile.id}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      )}

      {/* Search & Filters */}
      <SearchFilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search expense description..."
        showClearButton={Boolean(search || typeFilter !== 'all')}
        onClearFilters={() => {
          setSearch('');
          setTypeFilter('all');
        }}
      >
        <div className="w-40">
          <Input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)} 
            className="h-10 text-sm"
            aria-label="Filter Month"
          />
        </div>
        <div className="w-48">
          <Select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value as PaymentType | 'all')}
            className="h-10 text-sm"
            aria-label="Filter by Type"
          >
            {EXPENDITURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
      </SearchFilterBar>

      <div className="flex-1 overflow-hidden">
        <ExpenditureTable payments={filtered} isLoading={loading} />
      </div>
    </div>
  );
}
