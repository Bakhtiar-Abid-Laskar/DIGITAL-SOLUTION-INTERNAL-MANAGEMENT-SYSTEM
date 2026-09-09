"use client";

import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CreditCard, 
  Download, 
  RefreshCw, 
  AlertCircle,
  FileText,
  MessageCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Users,
  Wallet
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Textarea } from "@/components/common/Textarea";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { formatCurrency, useDebounceValue } from '@repairshop/shared';
import { formatDate } from "@/utils/formatDate";
import { useToast } from "@/components/common/ToastProvider";
import { Skeleton } from "@/components/common/Skeleton";

function PendingGroupCardSkeleton() {
  return (
    <div className="border border-admin-border rounded-xl bg-admin-bg-surface overflow-hidden shadow-xs p-4 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-20 rounded ml-auto" />
            <Skeleton className="h-5 w-24 rounded ml-auto" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface PendingInvoiceItem {
  id: string; // invoices.id
  type: 'Job' | 'Sale';
  reference: string;
  grand_total: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  job_id?: string | null;
}

interface CustomerPendingGroup {
  key: string;
  customerId?: string | null;
  customerName: string;
  customerContact: string;
  totalPendingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  invoices: PendingInvoiceItem[];
}

function parsePendingInvoicesToGroups(rows: any[]): CustomerPendingGroup[] {
  const groupsMap = new Map<string, CustomerPendingGroup>();

  rows.forEach((inv: any) => {
    const total = Number(inv.grand_total) || 0;
    const paid = Number(inv.amount_paid) || 0;
    const balance = inv.balance !== undefined ? Number(inv.balance) : total - paid;

    if (balance > 0) {
      const isJob = !!inv.job_id;
      let name = inv.customer_name;
      if (!name || name.trim() === '') {
        name = (isJob && (inv.jobs?.customer_name || inv.job_customer_name)) ? (inv.jobs?.customer_name || inv.job_customer_name) : 'Unknown';
      }
      let contact = inv.customer_contact;
      if (!contact || contact.trim() === '') {
        contact = (isJob && (inv.jobs?.customer_contact || inv.job_customer_contact)) ? (inv.jobs?.customer_contact || inv.job_customer_contact) : '';
      }

      name = (name || 'Unknown').replace(/\n/g, ' ').trim();
      contact = (contact || '').replace(/\n/g, ' ').trim();

      const groupKey = inv.customer_id ? `cid_${inv.customer_id}` : `contact_${contact || name.toLowerCase()}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          customerId: inv.customer_id || null,
          customerName: name,
          customerContact: contact,
          totalPendingBalance: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          invoices: []
        });
      }

      const group = groupsMap.get(groupKey)!;
      group.totalPendingBalance += balance;
      group.totalInvoiced += total;
      group.totalPaid += paid;
      group.invoices.push({
        id: inv.id,
        type: isJob ? 'Job' : 'Sale',
        reference: (isJob && (inv.jobs?.job_code || inv.job_code)) ? (inv.jobs?.job_code || inv.job_code) : inv.invoice_code,
        grand_total: total,
        amount_paid: paid,
        balance: balance,
        created_at: inv.created_at,
        job_id: inv.job_id || null,
      });
    }
  });

  const groupsArray = Array.from(groupsMap.values());
  groupsArray.forEach(g => {
    g.invoices.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  groupsArray.sort((a, b) => b.totalPendingBalance - a.totalPendingBalance);
  return groupsArray;
}

export default function PendingPaymentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  // Record Payment Modal State
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<{
    invoice: PendingInvoiceItem;
    customerName: string;
    customerContact: string;
  } | null>(null);

  // TanStack Query for Cached Pending Invoices with RPC
  const { 
    data: customerGroups = [], 
    isLoading: loading, 
    error: queryError, 
    refetch: fetchData 
  } = useQuery<CustomerPendingGroup[]>({
    queryKey: ['pending-payments-groups'],
    queryFn: async () => {
      // 1. High-Performance get_pending_invoices RPC (filters on database engine)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_pending_invoices');
      if (!rpcError && rpcData) {
        return parsePendingInvoicesToGroups(rpcData);
      }

      // 2. Fallback query if RPC unavailable
      console.warn('RPC get_pending_invoices fallback:', rpcError);
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_code,
          customer_id,
          customer_name,
          customer_contact,
          status,
          grand_total,
          amount_paid,
          created_at,
          paid_at,
          job_id,
          jobs ( job_code, customer_name, customer_contact )
        `)
        .gt('grand_total', 0)
        .neq('status', 'cancelled');

      if (invoicesError) throw invoicesError;
      return parsePendingInvoicesToGroups(invoicesData || []);
    },
  });

  const error = queryError instanceof Error ? queryError.message : null;

  // Auto-expand top 3 groups by default on initial data load
  useEffect(() => {
    if (customerGroups.length > 0 && expandedKeys.size === 0) {
      setExpandedKeys(new Set(customerGroups.slice(0, 3).map(g => g.key)));
    }
  }, [customerGroups, expandedKeys.size]);

  // Real-time subscription to auto-invalidate cache
  useEffect(() => {
    const channel = supabase
      .channel('admin-pending-payments-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-payments-groups'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_payments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-payments-groups'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Client-side filtering by customer name, contact, or invoice reference
  const filteredGroups = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return customerGroups;
    const q = debouncedSearchQuery.toLowerCase();
    return customerGroups.filter(g => {
      const matchCustomer = g.customerName.toLowerCase().includes(q) || g.customerContact.includes(q);
      const matchInvoice = g.invoices.some(inv => inv.reference.toLowerCase().includes(q));
      return matchCustomer || matchInvoice;
    });
  }, [customerGroups, debouncedSearchQuery]);

  const summary = useMemo(() => {
    let customerCount = filteredGroups.length;
    let totalInvoices = 0;
    let totalBalance = 0;

    filteredGroups.forEach(g => {
      totalInvoices += g.invoices.length;
      totalBalance += g.totalPendingBalance;
    });

    return {
      customerCount,
      totalInvoices,
      totalBalance,
    };
  }, [filteredGroups]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = () => {
    setExpandedKeys(new Set(filteredGroups.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Open Record Payment Modal
  const openRecordPaymentModal = useCallback((invoice: PendingInvoiceItem, customerName: string, customerContact: string) => {
    setActivePaymentInvoice({ invoice, customerName, customerContact });
  }, []);

  const handleSendWhatsAppReminder = useCallback(async (invoice: PendingInvoiceItem, customerName: string, customerContact: string) => {
    if (!customerContact) {
      showToast("No contact number available for this customer.", "error");
      return;
    }
    try {
      showToast(`Sending WhatsApp reminder to ${customerName}...`, 'info');
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_PENDING_REMINDER',
          phone: customerContact,
          customerName: customerName,
          reference: invoice.reference,
          balanceDue: invoice.balance,
          totalAmount: invoice.grand_total,
          jobId: invoice.type === 'Job' ? invoice.id : undefined,
          saleId: invoice.type === 'Sale' ? invoice.id : undefined,
        }
      });

      if (!error && data?.success) {
        showToast(`WhatsApp reminder sent to ${customerName}`, 'success');
      } else {
        const text = `Hello ${customerName}, a payment of ₹${invoice.balance.toFixed(2)} is pending for ${invoice.reference}. Please arrange payment at your earliest convenience. Thank you.`;
        window.open(`https://wa.me/${customerContact.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
        showToast('Opened WhatsApp chat draft', 'info');
      }
    } catch {
      const text = `Hello ${customerName}, a payment of ₹${invoice.balance.toFixed(2)} is pending for ${invoice.reference}. Please arrange payment at your earliest convenience. Thank you.`;
      window.open(`https://wa.me/${customerContact.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    }
  }, [showToast]);

  const handleOpenCustomerLedger = useCallback((group: CustomerPendingGroup) => {
    router.push(`/customers?search=${encodeURIComponent(group.customerName)}`);
  }, [router]);

  const handleExportXLSX = async () => {
    if (filteredGroups.length === 0) {
      showToast("No data to export", "error");
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const wsData: any[][] = [];

      // Letterhead
      wsData.push(['Digital Solution — Pending Payments Summary']);
      wsData.push(['Generated On:', new Date().toLocaleString('en-IN')]);
      wsData.push(['Total Customers with Dues:', summary.customerCount]);
      wsData.push(['Total Outstanding Balance:', summary.totalBalance]);
      wsData.push([]);

      // Headers
      wsData.push([
        'Customer Name',
        'Customer Phone',
        'Reference (Invoice/Job)',
        'Type',
        'Invoice Date',
        'Grand Total',
        'Amount Paid',
        'Balance Due'
      ]);

      filteredGroups.forEach(group => {
        group.invoices.forEach(inv => {
          wsData.push([
            group.customerName,
            group.customerContact || '—',
            inv.reference,
            inv.type,
            formatDate(inv.created_at),
            inv.grand_total,
            inv.amount_paid,
            inv.balance
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 20 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pending_Payments");
      XLSX.writeFile(wb, `pending-payments-grouped-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast("Pending payments exported to XLSX!", "success");
    } catch (e) {
      console.error(e);
      showToast('Export failed', 'error');
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Pending Payments"
        description="Grouped customer accounts with outstanding balances. Collect installments and sync live."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => { fetchData(); }}
              isLoading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleExportXLSX}
              disabled={filteredGroups.length === 0}
            >
              Export XLSX
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Customers with Dues"
          value={summary.customerCount}
          detail="Individual customer accounts"
          icon={<Users size={18} />}
          tone="info"
        />
        <StatCard 
          title="Total Pending Invoices"
          value={summary.totalInvoices}
          detail="Unpaid or partial jobs/sales"
          icon={<FileText size={18} />}
          tone="warning"
        />
        <StatCard 
          title="Total Balance Outstanding"
          value={formatCurrency(summary.totalBalance)}
          detail="Combined receivables across accounts"
          icon={<AlertCircle size={18} />}
          tone="danger"
        />
      </div>

      {/* Search & Bulk Expand Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by customer name, phone number, or invoice/job code..."
            showClearButton={Boolean(searchQuery)}
            onClearFilters={() => setSearchQuery("")}
          />
        </div>
        {filteredGroups.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
              Collapse All
            </Button>
          </div>
        )}
      </div>

      {/* Main Customer Grouped List */}
      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : loading && customerGroups.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PendingGroupCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={40} className="text-admin-text-muted" />}
          heading="No pending payments"
          subtext={searchQuery ? "No customer accounts match your search." : "All customer accounts are completely settled and up to date!"}
        />
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => (
            <CustomerPendingGroupCard
              key={group.key}
              group={group}
              isExpanded={expandedKeys.has(group.key)}
              onToggleExpand={toggleExpand}
              onOpenLedger={handleOpenCustomerLedger}
              onSendWhatsApp={handleSendWhatsAppReminder}
              onRecordPayment={openRecordPaymentModal}
            />
          ))}
        </div>
      )}

      {/* Record Installment Payment Modal */}
      {activePaymentInvoice && (
        <RecordInstallmentModal
          activeInvoice={activePaymentInvoice}
          onClose={() => setActivePaymentInvoice(null)}
          onSuccess={() => {
            setActivePaymentInvoice(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

interface CustomerPendingGroupCardProps {
  group: CustomerPendingGroup;
  isExpanded: boolean;
  onToggleExpand: (key: string) => void;
  onOpenLedger: (group: CustomerPendingGroup) => void;
  onSendWhatsApp: (inv: PendingInvoiceItem, customerName: string, customerContact: string) => void;
  onRecordPayment: (inv: PendingInvoiceItem, customerName: string, customerContact: string) => void;
}

const CustomerPendingGroupCard = React.memo(function CustomerPendingGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  onOpenLedger,
  onSendWhatsApp,
  onRecordPayment,
}: CustomerPendingGroupCardProps) {
  return (
    <div className="border border-admin-border rounded-xl bg-admin-bg-surface overflow-hidden shadow-xs transition-shadow hover:shadow-sm">
      {/* Customer Group Header */}
      <div 
        onClick={() => onToggleExpand(group.key)}
        className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-admin-bg-hover transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-admin-accent/10 border border-admin-accent/20 text-admin-accent flex items-center justify-center font-bold text-sm shrink-0">
            {group.customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-admin-text-primary text-base leading-tight truncate">
                {group.customerName}
              </h3>
              <Badge variant="neutral">
                {group.invoices.length} {group.invoices.length === 1 ? 'invoice' : 'invoices'}
              </Badge>
            </div>
            <p className="text-xs text-admin-text-muted mt-0.5 font-mono">
              {group.customerContact || 'No contact on file'}
            </p>
          </div>
        </div>

        {/* Right side: Combined total balance & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-admin-border">
          <div className="text-left md:text-right">
            <div className="text-xs text-admin-text-muted font-medium uppercase tracking-wider">
              Total Outstanding
            </div>
            <div className="text-lg font-black text-rose-600 font-mono">
              {formatCurrency(group.totalPendingBalance)}
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenLedger(group)}
              className="h-8 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
              leftIcon={<ExternalLink size={12} />}
            >
              View Ledger
            </Button>

            <button
              onClick={() => onToggleExpand(group.key)}
              className="p-1.5 rounded-lg text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-bg-subtle transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Customer Invoices Table */}
      {isExpanded && (
        <div className="border-t border-admin-border bg-slate-50/40 p-4">
          <div className="overflow-x-auto border border-admin-border rounded-lg bg-admin-bg-surface">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Created Date</th>
                  <th className="px-4 py-2.5 text-right">Grand Total</th>
                  <th className="px-4 py-2.5 text-right">Paid So Far</th>
                  <th className="px-4 py-2.5 text-right font-bold text-rose-600">Balance Due</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {group.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-admin-bg-hover transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-admin-text-primary">
                      {inv.reference}
                    </td>
                    <td className="px-4 py-3 text-admin-text-secondary">
                      <span className={`inline-block px-2 py-0.5 rounded text-2xs font-semibold ${
                        inv.type === 'Job' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-admin-text-secondary">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-admin-text-secondary">
                      {formatCurrency(inv.grand_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">
                      {formatCurrency(inv.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(inv.balance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {group.customerContact && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSendWhatsApp(inv, group.customerName, group.customerContact)}
                            className="h-7 px-2 text-xs text-admin-text-secondary"
                            leftIcon={<MessageCircle size={13} />}
                          >
                            Notify
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRecordPayment(inv, group.customerName, group.customerContact)}
                          className="h-7 px-2.5 text-xs text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                          leftIcon={<Plus size={13} />}
                        >
                          Record Payment
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

interface RecordInstallmentModalProps {
  activeInvoice: {
    invoice: PendingInvoiceItem;
    customerName: string;
    customerContact: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

function printMoneyReceipt(
  activeInvoice: { invoice: PendingInvoiceItem; customerName: string; customerContact: string }, 
  paymentAmount: number, 
  paymentMethod: string, 
  paymentRef: string, 
  paymentNotes: string
) {
  const receiptHtml = `
    <html>
    <head>
      <title>Money Receipt - ${activeInvoice.invoice.reference}</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 40px; color: #111827; }
        .receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 30px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
        .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .detail-item { font-size: 14px; }
        .detail-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .detail-value { font-weight: bold; margin-top: 2px; font-size: 15px; }
        .amount-box { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .amount-title { font-size: 14px; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .amount-value { font-size: 32px; font-weight: bold; color: #059669; }
        .summary-box { border-top: 1px dashed #d1d5db; padding-top: 20px; font-size: 14px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row.total { font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 8px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af; }
        .signature { margin-top: 50px; display: flex; justify-content: space-between; }
        .sig-line { width: 150px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 12px; }
        @media print {
          body { padding: 0; }
          .receipt-container { border: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1 class="title">MONEY RECEIPT</h1>
          <div class="subtitle">Digital Solution - Repair & Service</div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Receipt No</div>
            <div class="detail-value">RCPT-${Math.floor(Date.now() / 1000)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${new Date().toLocaleString('en-IN')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Customer Name</div>
            <div class="detail-value">${activeInvoice.customerName}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Phone</div>
            <div class="detail-value">${activeInvoice.customerContact || 'N/A'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Reference (Invoice)</div>
            <div class="detail-value">${activeInvoice.invoice.reference}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Payment Mode</div>
            <div class="detail-value">${paymentMethod} ${paymentRef ? '(' + paymentRef + ')' : ''}</div>
          </div>
        </div>

        <div class="amount-box">
          <div class="amount-title">Amount Received</div>
          <div class="amount-value">₹${paymentAmount.toFixed(2)}</div>
        </div>

        <div class="summary-box">
          <div class="summary-row">
            <span>Total Bill Amount:</span>
            <span>₹${activeInvoice.invoice.grand_total.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Previously Paid:</span>
            <span>₹${activeInvoice.invoice.amount_paid.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Payment Received:</span>
            <span style="color: #059669; font-weight: bold;">₹${paymentAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row total">
            <span>Remaining Balance:</span>
            <span style="color: #e11d48;">₹${Math.max(0, activeInvoice.invoice.balance - paymentAmount).toFixed(2)}</span>
          </div>
        </div>
        
        ${paymentNotes ? '<div style="margin-top: 20px; font-size: 13px; color: #4b5563;"><strong>Notes:</strong> ' + paymentNotes + '</div>' : ''}

        <div class="signature">
          <div class="sig-line">Customer Signature</div>
          <div class="sig-line">Authorized Signatory</div>
        </div>

        <div class="footer">
          This is a computer-generated receipt and does not require a physical signature.
        </div>
      </div>
    </body>
    </html>
  `;

  let iframe = document.getElementById('money-receipt-print-frame') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'money-receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(receiptHtml);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 250);
}

function RecordInstallmentModal({ activeInvoice, onClose, onSuccess }: RecordInstallmentModalProps) {
  const { showToast } = useToast();
  const [paymentAmount, setPaymentAmount] = useState(() => activeInvoice.invoice.balance.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(true);

  const handleConfirm = async () => {
    const numAmt = parseFloat(paymentAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast("Please enter a valid payment amount greater than 0.", "error");
      return;
    }
    if (numAmt > activeInvoice.invoice.balance) {
      showToast(`Payment amount cannot exceed remaining balance of ${formatCurrency(activeInvoice.invoice.balance)}.`, "error");
      return;
    }

    setSubmittingPayment(true);
    try {
      const { error } = await supabase.rpc('record_installment_payment', {
        p_invoice_id: activeInvoice.invoice.id,
        p_cash_amount: numAmt,
        p_payment_method: paymentMethod,
        p_reference_number: paymentRef.trim() || null,
        p_notes: paymentNotes.trim() || null,
      });

      if (error) throw error;

      showToast(`Recorded payment of ${formatCurrency(numAmt)} for ${activeInvoice.invoice.reference}!`, "success");
      
      if (printReceipt) {
        printMoneyReceipt(activeInvoice, numAmt, paymentMethod, paymentRef, paymentNotes);
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Error recording payment installment:', err);
      showToast(err.message || "Failed to record payment.", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Record Payment — ${activeInvoice.invoice.reference}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submittingPayment}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            isLoading={submittingPayment}
            leftIcon={<CheckCircle size={14} />}
          >
            Save Payment Installment
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-admin-border rounded-lg space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-admin-text-muted">Customer:</span>
            <strong className="text-admin-text-primary">{activeInvoice.customerName}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-admin-text-muted">Total Invoiced:</span>
            <span className="font-mono">{formatCurrency(activeInvoice.invoice.grand_total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-admin-text-muted">Paid so far:</span>
            <span className="font-mono text-emerald-700">{formatCurrency(activeInvoice.invoice.amount_paid)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-admin-border font-bold">
            <span className="text-rose-600">Remaining Balance:</span>
            <span className="font-mono text-rose-600 text-sm">{formatCurrency(activeInvoice.invoice.balance)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
              Installment Amount (₹) *
            </label>
            <button 
              type="button" 
              onClick={() => setPaymentAmount(activeInvoice.invoice.balance.toFixed(2))}
              className="text-xs text-admin-accent hover:underline"
            >
              Pay Full Balance ({formatCurrency(activeInvoice.invoice.balance)})
            </button>
          </div>
          <Input
            type="number"
            min="1"
            step="any"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount..."
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
            Payment Method *
          </label>
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
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
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="UTR / Cheque No. / Transaction ID"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
            Notes (Optional)
          </label>
          <Textarea
            rows={2}
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="e.g. Partial collection at counter"
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm text-admin-text-primary cursor-pointer w-max">
            <input 
              type="checkbox" 
              className="rounded border-admin-border text-admin-accent focus:ring-admin-accent w-4 h-4"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
            />
            Generate Money Receipt
          </label>
        </div>
      </div>
    </Modal>
  );
}
