"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Wallet, 
  ArrowDownLeft, 
  RefreshCw, 
  Plus, 
  FileText, 
  AlertCircle, 
  History,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer, formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Select } from '@/components/common/Select';
import { useToast } from '@/components/common/ToastProvider';

interface InvoicePayment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  users?: {
    id: string;
    name: string;
  } | null;
}

interface WalletTransaction {
  id: string;
  customer_id: string;
  type: 'deposit' | 'applied_to_invoice' | 'refund';
  amount: number;
  applied_invoice_id: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

interface InvoiceRecord {
  id: string;
  invoice_code: string;
  grand_total: number;
  amount_paid: number;
  status: string;
  created_at: string;
  payment_method?: string;
  job_id?: string | null;
  jobs?: {
    id: string;
    job_code: string;
  } | null;
}

interface LedgerInstallmentRow {
  rowId: string;
  invoiceId: string;
  customerName: string;
  invoiceCode: string;
  jobCode: string;
  totalAmount: number;
  paymentDate: string | null;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber: string;
  amountLeftAfterPayment: number;
  status: 'paid' | 'partial' | 'pending' | 'historical';
  isHistorical: boolean;
  notes?: string | null;
  recordedBy?: string;
}

interface CustomerLedgerTabProps {
  customer: Customer;
}

export function CustomerLedgerTab({ customer }: CustomerLedgerTabProps) {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [showWalletHistory, setShowWalletHistory] = useState(false);

  // Deposit Advance Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Cash');
  const [depositRef, setDepositRef] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const fetchLedgerData = useCallback(async () => {
    if (!customer?.id) return;
    try {
      setLoading(true);

      const [invRes, payRes, walletRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            id,
            invoice_code,
            grand_total,
            amount_paid,
            status,
            created_at,
            payment_method,
            job_id,
            jobs (
              id,
              job_code
            )
          `)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('invoice_payments')
          .select(`
            id,
            invoice_id,
            customer_id,
            amount,
            payment_method,
            reference_number,
            notes,
            created_at,
            recorded_by,
            users:recorded_by (
              id,
              name
            )
          `)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('customer_wallet_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
      ]);

      if (invRes.error) throw invRes.error;
      if (payRes.error) throw payRes.error;
      if (walletRes.error) throw walletRes.error;

      setInvoices((invRes.data as any) || []);
      setPayments((payRes.data as any) || []);
      setWalletTransactions((walletRes.data as any) || []);
    } catch (err: any) {
      console.error('Error fetching customer ledger:', err);
      showToast(err.message || 'Failed to load customer ledger.', 'error');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, showToast]);

  useEffect(() => {
    fetchLedgerData();

    // Set up real-time subscriptions scoped to this customer
    const channel = supabase
      .channel(`customer-ledger-${customer.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_payments', filter: `customer_id=eq.${customer.id}` },
        () => fetchLedgerData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_wallet_transactions', filter: `customer_id=eq.${customer.id}` },
        () => fetchLedgerData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `customer_id=eq.${customer.id}` },
        () => fetchLedgerData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer.id, fetchLedgerData]);

  // Derive live wallet balance: SUM(deposit) - SUM(applied) - SUM(refund)
  const walletBalance = useMemo(() => {
    return walletTransactions.reduce((acc, tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'deposit') return acc + amt;
      if (tx.type === 'applied_to_invoice' || tx.type === 'refund') return acc - amt;
      return acc;
    }, 0);
  }, [walletTransactions]);

  // Aggregate totals across all invoices
  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;

    invoices.forEach((inv) => {
      totalInvoiced += Number(inv.grand_total || 0);
      totalPaid += Number(inv.amount_paid || 0);
    });

    const pendingBalance = Math.max(0, totalInvoiced - totalPaid);

    return {
      totalInvoiced,
      totalPaid,
      pendingBalance,
      invoiceCount: invoices.length,
    };
  }, [invoices]);

  // Build grouped ledger rows per invoice with live-calculated running balance
  const groupedLedger = useMemo(() => {
    return invoices.map((inv) => {
      const invPayments = payments.filter((p) => p.invoice_id === inv.id);
      const grandTotal = Number(inv.grand_total || 0);
      const rows: LedgerInstallmentRow[] = [];

      if (invPayments.length > 0) {
        // Sort chronologically ascending
        const sorted = [...invPayments].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        let runningPaid = 0;
        sorted.forEach((p) => {
          const amt = Number(p.amount || 0);
          runningPaid += amt;
          const leftAfter = Math.max(0, grandTotal - runningPaid);
          const isFull = leftAfter <= 0;

          rows.push({
            rowId: p.id,
            invoiceId: inv.id,
            customerName: customer.name,
            invoiceCode: inv.invoice_code || '—',
            jobCode: (inv.jobs as any)?.job_code || 'Direct Sale',
            totalAmount: grandTotal,
            paymentDate: p.created_at,
            amountPaid: amt,
            paymentMethod: p.payment_method,
            referenceNumber: p.reference_number || '—',
            amountLeftAfterPayment: leftAfter,
            status: isFull ? 'paid' : 'partial',
            isHistorical: false,
            notes: p.notes,
            recordedBy: (p.users as any)?.name || (p.users as any)?.full_name || undefined
          });
        });
      } else {
        // No invoice_payments rows recorded yet for this invoice
        const storedPaid = Number(inv.amount_paid || 0);
        if (storedPaid > 0) {
          // Historical pre-ledger invoice
          const leftAfter = Math.max(0, grandTotal - storedPaid);
          rows.push({
            rowId: `legacy-${inv.id}`,
            invoiceId: inv.id,
            customerName: customer.name,
            invoiceCode: inv.invoice_code || '—',
            jobCode: (inv.jobs as any)?.job_code || 'Direct Sale',
            totalAmount: grandTotal,
            paymentDate: inv.created_at,
            amountPaid: storedPaid,
            paymentMethod: inv.payment_method || 'Historical Record',
            referenceNumber: '—',
            amountLeftAfterPayment: leftAfter,
            status: 'historical',
            isHistorical: true,
            notes: 'Legacy pre-ledger lump-sum entry'
          });
        } else {
          // Unpaid invoice
          rows.push({
            rowId: `unpaid-${inv.id}`,
            invoiceId: inv.id,
            customerName: customer.name,
            invoiceCode: inv.invoice_code || '—',
            jobCode: (inv.jobs as any)?.job_code || 'Direct Sale',
            totalAmount: grandTotal,
            paymentDate: null,
            amountPaid: 0,
            paymentMethod: '—',
            referenceNumber: '—',
            amountLeftAfterPayment: grandTotal,
            status: 'pending',
            isHistorical: false,
            notes: 'No payments recorded yet'
          });
        }
      }

      return {
        invoice: inv,
        rows
      };
    });
  }, [invoices, payments, customer.name]);

  const handleExportXLSX = async () => {
    try {
      setExportingXlsx(true);
      const { buildCustomerLedgerWorkbook } = await import('@/lib/customerLedgerExcel');

      const wb = await buildCustomerLedgerWorkbook({
        customer,
        summary: {
          totalInvoiced: summary.totalInvoiced,
          totalPaid: summary.totalPaid,
          pendingBalance: summary.pendingBalance,
          walletBalance,
        },
        groupedLedger,
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Customer_Ledger_${cleanCustomerName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      showToast('Customer ledger exported to XLSX successfully!', 'success');
    } catch (err: any) {
      console.error('Error exporting XLSX:', err);
      showToast(err.message || 'Failed to export XLSX.', 'error');
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleDepositAdvance = async () => {
    const numAmt = parseFloat(depositAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast('Please enter a valid deposit amount greater than 0.', 'error');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const { error } = await supabase.rpc('deposit_customer_advance', {
        p_customer_id: customer.id,
        p_amount: numAmt,
        p_payment_method: depositMethod,
        p_reference_number: depositRef.trim() || null,
        p_notes: depositNotes.trim() || null
      });

      if (error) throw error;

      showToast(`Successfully deposited ${formatCurrency(numAmt)} to wallet!`, 'success');
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositRef('');
      setDepositNotes('');
      fetchLedgerData();
    } catch (err: any) {
      console.error('Error depositing customer advance:', err);
      showToast(err.message || 'Failed to deposit advance.', 'error');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const getStatusBadge = (status: LedgerInstallmentRow['status'], isHistorical: boolean) => {
    if (isHistorical) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Historical — pre-ledger
        </span>
      );
    }
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Partial
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Financial Health & Wallet Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Wallet Balance Card (Prominently Highlighted) */}
        <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-indigo-50/40 to-white flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2 text-indigo-700">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Wallet size={14} className="text-indigo-600" /> Wallet Balance
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                walletBalance > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-100 text-indigo-700 border border-indigo-200/60'
              }`}>
                {walletBalance > 0 ? 'Active Credit' : '₹0.00 Balance'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 mt-2 font-mono tracking-tight truncate">
              {formatCurrency(walletBalance)}
            </div>
            <p className="text-[11px] text-indigo-600/90 mt-1 line-clamp-2">
              Unallocated advance balance available for future invoices
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-indigo-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full text-xs font-semibold bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-2xs"
              leftIcon={<Plus size={13} />}
            >
              Deposit Advance
            </Button>
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="p-4 rounded-xl border border-admin-border bg-admin-bg-surface flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-admin-text-muted" /> Total Invoiced
            </span>
            <div className="text-xl sm:text-2xl font-black text-admin-text-primary mt-2 font-mono tracking-tight truncate">
              {formatCurrency(summary.totalInvoiced)}
            </div>
          </div>
          <div className="text-[11px] text-admin-text-muted mt-2 pt-2 border-t border-admin-border/50">
            Across {summary.invoiceCount} {summary.invoiceCount === 1 ? 'invoice' : 'invoices'}
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-4 rounded-xl border border-admin-border bg-admin-bg-surface flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft size={14} className="text-emerald-600" /> Total Collected
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2 font-mono tracking-tight truncate">
              {formatCurrency(summary.totalPaid)}
            </div>
          </div>
          <div className="text-[11px] text-admin-text-muted mt-2 pt-2 border-t border-admin-border/50">
            Installments & settlements
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="p-4 rounded-xl border border-admin-border bg-admin-bg-surface flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} className="text-rose-600" /> Total Outstanding
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-2 font-mono tracking-tight truncate ${summary.pendingBalance > 0 ? 'text-rose-600' : 'text-admin-text-primary'}`}>
              {formatCurrency(summary.pendingBalance)}
            </div>
          </div>
          <div className="text-[11px] text-admin-text-muted mt-2 pt-2 border-t border-admin-border/50">
            {summary.pendingBalance > 0 ? 'Due across pending invoices' : 'All invoices settled'}
          </div>
        </div>
      </div>

      {/* Action and Sub-view bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
            Running Installment Ledger
            <span className="text-xs font-normal text-admin-text-muted">
              (Live-computed running balance per installment)
            </span>
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWalletHistory(!showWalletHistory)}
            className="text-xs text-admin-text-secondary"
            leftIcon={<History size={13} />}
          >
            {showWalletHistory ? 'Hide Wallet History' : `Wallet Activity (${walletTransactions.length})`}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXLSX}
            isLoading={exportingXlsx}
            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            leftIcon={<FileSpreadsheet size={13} />}
          >
            Download Ledger (.xlsx)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLedgerData}
            isLoading={loading}
            leftIcon={<RefreshCw size={13} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Optional Wallet Activity Drawer / Table */}
      {showWalletHistory && (
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet size={14} className="text-indigo-600" /> Wallet Transactions History
            </span>
            <span className="text-xs text-indigo-700">
              Live Wallet Balance: <strong className="font-mono">{formatCurrency(walletBalance)}</strong>
            </span>
          </div>

          {walletTransactions.length === 0 ? (
            <p className="text-xs text-admin-text-muted text-center py-4">
              No wallet advance transactions recorded for this customer.
            </p>
          ) : (
            <div className="overflow-x-auto border border-admin-border rounded-lg bg-white">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Applied Invoice</th>
                    <th className="px-4 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {walletTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-admin-bg-hover">
                      <td className="px-4 py-2.5 text-admin-text-secondary">{formatDate(tx.created_at)}</td>
                      <td className="px-4 py-2.5 font-semibold">
                        {tx.type === 'deposit' && <span className="text-emerald-700">Deposit (+)</span>}
                        {tx.type === 'applied_to_invoice' && <span className="text-indigo-700">Applied to Invoice (-)</span>}
                        {tx.type === 'refund' && <span className="text-rose-700">Refund (-)</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-admin-text-primary">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-admin-text-muted font-mono">
                        {tx.applied_invoice_id ? tx.applied_invoice_id.slice(0, 8) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-admin-text-muted">
                        {tx.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Per-Customer Installment Ledger Table */}
      {loading ? (
        <div className="p-8 text-center text-sm text-admin-text-muted flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-admin-accent" />
          Loading customer ledger records...
        </div>
      ) : groupedLedger.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-admin-border rounded-xl bg-admin-bg-surface text-admin-text-muted space-y-2">
          <p className="font-semibold text-admin-text-primary">No Invoices or Ledger Entries Found</p>
          <p className="text-xs">
            This customer currently has no linked invoices or installment records. Invoices generated from repair jobs or counter sales will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="border border-admin-border rounded-xl overflow-hidden bg-admin-bg-surface shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap min-w-[960px]">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Customer</th>
                  <th scope="col" className="px-4 py-3">Invoice #</th>
                  <th scope="col" className="px-4 py-3">Job #</th>
                  <th scope="col" className="px-4 py-3 text-right">Total Amount</th>
                  <th scope="col" className="px-4 py-3">Payment Date</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount Paid</th>
                  <th scope="col" className="px-4 py-3">Payment Method</th>
                  <th scope="col" className="px-4 py-3">Reference #</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount Left</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
                {groupedLedger.map(({ invoice, rows }) => (
                  <React.Fragment key={invoice.id}>
                    {/* Visual Invoice Header Row */}
                    <tr className="bg-slate-50/80 border-t border-b border-admin-border font-semibold text-admin-text-secondary">
                      <td colSpan={10} className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-admin-text-primary font-bold">
                              {invoice.invoice_code || 'Invoice'}
                            </span>
                            <span className="text-admin-text-muted">•</span>
                            <span>Date: {formatDate(invoice.created_at)}</span>
                            <span className="text-admin-text-muted">•</span>
                            <span>
                              Total: <strong className="font-mono text-admin-text-primary">{formatCurrency(invoice.grand_total)}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-admin-text-muted">
                              {rows.length} {rows.length === 1 ? 'entry' : 'installments'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Individual Installment / Payment Rows */}
                    {rows.map((row) => (
                      <tr 
                        key={row.rowId} 
                        className={`hover:bg-admin-bg-hover transition-colors ${
                          row.isHistorical ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        {/* 1. Customer */}
                        <td className="px-4 py-3 font-medium text-admin-text-primary">
                          {row.customerName}
                        </td>

                        {/* 2. Invoice # */}
                        <td className="px-4 py-3 font-mono font-semibold text-admin-text-primary">
                          {row.invoiceCode}
                        </td>

                        {/* 3. Job # */}
                        <td className="px-4 py-3 font-mono text-admin-text-secondary">
                          {row.jobCode}
                        </td>

                        {/* 4. Total Amount */}
                        <td className="px-4 py-3 text-right font-mono text-admin-text-secondary">
                          {formatCurrency(row.totalAmount)}
                        </td>

                        {/* 5. Payment Date */}
                        <td className="px-4 py-3 text-admin-text-secondary">
                          {row.paymentDate ? formatDate(row.paymentDate) : <span className="text-admin-text-muted">—</span>}
                        </td>

                        {/* 6. Amount Paid (this installment) */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {row.amountPaid > 0 ? (
                            formatCurrency(row.amountPaid)
                          ) : (
                            <span className="text-admin-text-muted font-normal">₹0.00</span>
                          )}
                        </td>

                        {/* 7. Payment Method */}
                        <td className="px-4 py-3 text-admin-text-secondary">
                          {row.paymentMethod}
                        </td>

                        {/* 8. Reference # */}
                        <td className="px-4 py-3 font-mono text-admin-text-muted text-xs">
                          {row.referenceNumber}
                        </td>

                        {/* 9. Amount Left After This Payment (Computed Live) */}
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={row.amountLeftAfterPayment > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {formatCurrency(row.amountLeftAfterPayment)}
                          </span>
                        </td>

                        {/* 10. Status */}
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(row.status, row.isHistorical)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deposit Customer Advance Modal */}
      {isDepositModalOpen && (
        <Modal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          title="Deposit Customer Advance (Wallet)"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDepositModalOpen(false)}
                disabled={submittingDeposit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDepositAdvance}
                isLoading={submittingDeposit}
                leftIcon={<Plus size={14} />}
              >
                Confirm Deposit
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900">
              This deposits funds into <strong>{customer.name}</strong>'s unallocated wallet. These funds can later be applied toward any job invoice or direct sale.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                Deposit Amount (₹) *
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="e.g. 500.00"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                Payment Method *
              </label>
              <Select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                Reference Number (Optional)
              </label>
              <Input
                value={depositRef}
                onChange={(e) => setDepositRef(e.target.value)}
                placeholder="UTR / Cheque No. / Transaction ID"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                Notes / Purpose (Optional)
              </label>
              <Textarea
                rows={2}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="e.g. Advance deposit for upcoming laptop screen replacement"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
