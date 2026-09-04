"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  CreditCard, 
  Download, 
  RefreshCw, 
  AlertCircle,
  FileText,
  MessageCircle,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { DataTable, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/common/DataTable";
import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { formatCurrency, useDebounceValue } from '@repairshop/shared';
import { formatDate } from "@/utils/formatDate";
import { useToast } from "@/components/common/ToastProvider";

interface PendingPayment {
  id: string;
  type: 'Sale' | 'Job';
  reference: string;
  customer_name: string;
  customer_contact: string;
  grand_total: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  job_id?: string | null;
}

export default function PendingPaymentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_code,
          customer_name,
          customer_contact,
          status,
          grand_total,
          amount_paid,
          created_at,
          paid_at,
          job_id,
          jobs ( job_code )
        `)
        .gt('grand_total', 0)
        .neq('status', 'cancelled');  // cancelled invoices are voided — never pending

      if (invoicesError) throw invoicesError;

      const combined: PendingPayment[] = [];

      (invoicesData || []).forEach((inv: any) => {
        const total = Number(inv.grand_total) || 0;
        const paid = Number(inv.amount_paid) || 0;
        const balance = total - paid;
        
        // Only include if there is a pending balance
        if (balance > 0) {
          const isJob = !!inv.job_id;
          combined.push({
            id: inv.id,
            type: isJob ? 'Job' : 'Sale',
            reference: isJob && inv.jobs ? inv.jobs.job_code : inv.invoice_code,
            customer_name: inv.customer_name || 'Unknown',
            customer_contact: inv.customer_contact || '',
            grand_total: total,
            amount_paid: paid,
            balance: balance,
            created_at: inv.created_at,
            job_id: inv.job_id || null,
          });
        }
      });

      // Sort oldest first (highest priority to collect)
      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setPayments(combined);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load pending payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return payments;
    const lowerQ = debouncedSearchQuery.toLowerCase();
    return payments.filter(p => 
      p.customer_name.toLowerCase().includes(lowerQ) ||
      p.reference.toLowerCase().includes(lowerQ) ||
      p.customer_contact.includes(lowerQ)
    );
  }, [payments, debouncedSearchQuery]);

  const handleMarkAsPaid = async (item: PendingPayment) => {
    if (!window.confirm(`Are you sure you want to mark ${item.reference} as fully paid?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('record_payment', {
        p_invoice_id: item.id,
        p_amount: item.grand_total,
        p_payment_method: 'Cash',
      });
        
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update payment status.");
      setLoading(false);
    }
  };

  const handleSendWhatsAppReminder = async (row: PendingPayment) => {
    if (!row.customer_contact) return;
    try {
      showToast(`Sending WhatsApp reminder to ${row.customer_name}...`, 'info');
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_PENDING_REMINDER',
          phone: row.customer_contact,
          customerName: row.customer_name,
          reference: row.reference,
          balanceDue: row.balance,
          totalAmount: row.grand_total,
          jobId: row.type === 'Job' ? row.id : undefined,
          saleId: row.type === 'Sale' ? row.id : undefined,
        }
      });
      if (!error && data?.success) {
        showToast(`WhatsApp reminder sent to ${row.customer_name}`, 'success');
      } else {
        // Fallback to wa.me deep link
        const text = `Hello ${row.customer_name}, a payment of ₹${row.balance.toFixed(2)} is pending for ${row.reference}. Please arrange the payment at your earliest convenience. Thank you.`;
        window.open(`https://wa.me/${row.customer_contact.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
        showToast('Opened WhatsApp chat draft', 'info');
      }
    } catch {
      const text = `Hello ${row.customer_name}, a payment of ₹${row.balance.toFixed(2)} is pending for ${row.reference}. Please arrange the payment at your earliest convenience. Thank you.`;
      window.open(`https://wa.me/${row.customer_contact.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };


  const summary = useMemo(() => {
    return {
      count: filtered.length,
      totalBalance: filtered.reduce((acc, curr) => acc + curr.balance, 0),
    };
  }, [filtered]);

  const handleExportXLSX = async () => {
    if (filtered.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const data = filtered.map(p => ({
        Date: new Date(p.created_at).toLocaleDateString(),
        Type: p.type,
        Reference: p.reference,
        Customer: p.customer_name,
        Contact: p.customer_contact,
        Total: p.grand_total,
        Paid: p.amount_paid,
        Balance: p.balance,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pending_Payments");
      XLSX.writeFile(wb, `pending-payments-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Export failed');
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Pending Payments"
        description="Track and collect outstanding balances from sales and completed jobs."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleExportXLSX}
              disabled={filtered.length === 0}
            >
              Export XLSX
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          title="Total Pending Accounts"
          value={summary.count}
          detail="Active unpaid/partially paid records"
          icon={<FileText size={18} />}
          tone="info"
        />
        <StatCard 
          title="Total Balance Due"
          value={formatCurrency(summary.totalBalance)}
          detail="Total outstanding amount to collect"
          icon={<AlertCircle size={18} />}
          tone="danger"
        />
      </div>

      {/* Search & Filter */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customer, reference, or phone..."
        showClearButton={Boolean(searchQuery)}
        onClearFilters={() => setSearchQuery("")}
      />

      {/* Data Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <DataTable
          isLoading={loading}
          skeletonRows={6}
          skeletonCols={6}
          isEmpty={filtered.length === 0}
          emptyState={
            <EmptyState
              icon={<CreditCard size={40} className="text-admin-text-muted" />}
              heading="No pending payments"
              subtext={searchQuery ? "No records match your search." : "All accounts are settled and paid up."}
            />
          }
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Reference</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell align="right">Grand Total</TableHeaderCell>
              <TableHeaderCell align="right">Paid</TableHeaderCell>
              <TableHeaderCell align="right">Balance Due</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map((row) => (
              <TableRow 
                key={`${row.type}-${row.id}`}
                isClickable
                onClick={() => {
                  if (row.type === 'Job' && row.job_id) {
                    router.push(`/jobs/${row.job_id}`);
                  } else if (row.type === 'Job') {
                    router.push('/jobs');
                  } else {
                    router.push(`/sales/${row.id}`);
                  }
                }}
              >
                <TableCell>
                  <div className="font-semibold text-admin-text-primary">{row.customer_name}</div>
                  <div className="text-xs text-admin-text-muted">{row.customer_contact || "No contact"}</div>
                </TableCell>
                <TableCell>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-admin-bg-subtle text-admin-text-secondary border border-admin-border font-mono text-xs font-semibold">
                    {row.reference}
                  </span>
                  <div className="text-xs text-admin-text-muted mt-0.5">{row.type}</div>
                </TableCell>
                <TableCell className="text-xs text-admin-text-secondary">
                  {formatDate(row.created_at)}
                </TableCell>
                <TableCell align="right" className="font-medium text-admin-text-secondary">
                  {formatCurrency(row.grand_total)}
                </TableCell>
                <TableCell align="right" className="font-medium text-admin-text-secondary">
                  {formatCurrency(row.amount_paid)}
                </TableCell>
                <TableCell align="right" className="font-bold text-admin-urgent-fg">
                  {formatCurrency(row.balance)}
                </TableCell>
                <TableCell align="right">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {row.customer_contact && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<MessageCircle size={14} />}
                        onClick={() => handleSendWhatsAppReminder(row)}
                      >
                        Notify
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-admin-success-border text-admin-success-fg hover:bg-admin-success-bg"
                      leftIcon={<CheckCircle size={14} />}
                      onClick={() => handleMarkAsPaid(row)}
                    >
                      Mark Paid
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
