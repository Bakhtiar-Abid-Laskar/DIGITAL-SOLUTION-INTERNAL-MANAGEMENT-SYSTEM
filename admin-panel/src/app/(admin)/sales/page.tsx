"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Invoice } from "@/types/sales";
import { exportSalesToCSV } from "@/utils/salesCsv";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { DataTableSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { Tabs } from "@/components/common/Tabs";
import { Calendar, Download, PlusCircle, Receipt, Search, X } from "lucide-react";
import { useDebounceValue, formatCurrency } from '@repairshop/shared';
import { formatDate } from "@/utils/formatDate";

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  const variant = status === "paid" ? "success" : status === "cancelled" ? "danger" : "warning";
  return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
}

function TaxRegimeBadge({ regime }: { regime: string }) {
  if (regime === 'legacy') return <Badge variant="neutral">Legacy</Badge>;
  if (regime === 'inter_state') return <Badge variant="accent">IGST</Badge>;
  return <Badge variant="accent">CGST+SGST</Badge>;
}

export default function SalesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "all");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);
  const PAGE_SIZE = 20;

  const fetchTabCounts = useCallback(async () => {
    try {
      const [allRes, draftRes, paidRes, cancelledRes] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).ilike('status', 'draft'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).ilike('status', 'paid'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).ilike('status', 'cancelled'),
      ]);

      setStatusCounts({
        draft: draftRes.count ?? 0,
        paid: paidRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0,
      });
      setTotalCount(allRes.count ?? 0);
    } catch (err) {
      console.error('Error fetching invoice tab counts:', err);
    }
  }, []);

  const fetchInvoices = useCallback(async (cancelled = false) => {
    try {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      let matchedSaleIds: string[] = [];
      if (debouncedSearchQuery) {
        const queryStr = `%${debouncedSearchQuery}%`;
        const { data: itemMatches } = await supabase
          .from("invoice_items")
          .select("invoice_id")
          .or(`serial_number.ilike.${queryStr},item_name.ilike.${queryStr}`);
        if (itemMatches && itemMatches.length > 0) {
          matchedSaleIds = itemMatches.map(i => i.invoice_id).filter(Boolean);
        }
      }

      let query = supabase
        .from("invoices")
        .select("*, created_by_user:users(name)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.ilike("status", statusFilter);
      if (paymentFilter !== "All") query = query.eq("payment_method", paymentFilter);
      if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte("created_at", to.toISOString());
      }
      if (debouncedSearchQuery) {
        const queryStr = `%${debouncedSearchQuery}%`;
        let orString = `invoice_code.ilike.${queryStr},customer_name.ilike.${queryStr},customer_contact.ilike.${queryStr},customer_email.ilike.${queryStr},customer_gstin.ilike.${queryStr},notes.ilike.${queryStr}`;
        if (matchedSaleIds.length > 0) {
          orString += `,id.in.(${matchedSaleIds.join(',')})`;
        }
        query = query.or(orString);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error: queryError, count } = await query.range(from, to);

      if (cancelled) return;
      if (queryError) throw queryError;
      if (data) setInvoices(data as Invoice[]);
      if (count !== null) setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: unknown) {
      if (cancelled) return;
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch invoices.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, debouncedSearchQuery, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentFilter, debouncedSearchQuery, dateFrom, dateTo]);

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "all");
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetchInvoices(cancelled);

    const channel = supabase.channel("admin-invoices-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        fetchInvoices();
        fetchTabCounts();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchInvoices, fetchTabCounts]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("All");
    setStatusFilter("all");
  };

  const tabItems = [
    { id: "all", label: `All (${totalCount})` },
    { id: "draft", label: `Draft (${statusCounts.draft || 0})` },
    { id: "paid", label: `Paid (${statusCounts.paid || 0})` },
    { id: "cancelled", label: `Cancelled (${statusCounts.cancelled || 0})` }
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Invoices & Sales"
        description="Create, search, filter, and export customer invoices."
        actions={
          <div className="flex items-center gap-3">
            <Button size="sm" leftIcon={<PlusCircle size={15} />} onClick={() => router.push("/sales/new")}>
              Create Invoice
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Download size={15} />} onClick={() => exportSalesToCSV(invoices as any)}>
              Export CSV
            </Button>
          </div>
        }
      />

      <Tabs items={tabItems} activeId={statusFilter} onChange={setStatusFilter} />

      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-center justify-between bg-admin-bg-surface border border-admin-border rounded-lg shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
            <Input
              type="text"
              placeholder="Search invoice code, name, phone..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 text-sm w-36"
              aria-label="Date From"
            />
            <span className="text-xs text-admin-text-muted">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 text-sm w-36"
              aria-label="Date To"
            />
          </div>

          <div className="w-40">
            <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-10 text-sm" aria-label="Payment Method">
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          {(searchQuery || dateFrom || dateTo || paymentFilter !== 'All' || statusFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} leftIcon={<X size={14} />} className="h-10">
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Main Content */}
      {loading ? (
        <DataTableSkeleton rows={6} cols={8} hasFilterBar={false} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInvoices} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt size={40} className="text-admin-text-muted" />}
          heading="No invoices found"
          subtext="Try adjusting your filters or create a new invoice."
          action={<Button variant="outline" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
        />
      ) : (
        <Card noAccentLine className="flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
          <div className="overflow-x-auto flex-1 table-scroll-shadow">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Invoice Code</th>
                  <th scope="col" className="px-6 py-3.5">Customer</th>
                  <th scope="col" className="px-6 py-3.5">Payment</th>
                  <th scope="col" className="px-6 py-3.5">Tax Regime</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Total</th>
                  <th scope="col" className="px-6 py-3.5">Created</th>
                  <th scope="col" className="px-6 py-3.5">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
                {invoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className="hover:bg-admin-bg-hover transition-colors cursor-pointer"
                    onClick={() => router.push(`/sales/${inv.id}`)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-xs text-admin-text-primary">{inv.invoice_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-admin-text-primary">{inv.customer_name}</div>
                      <div className="text-admin-text-muted text-xs">{inv.customer_contact || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-admin-text-secondary">{inv.payment_method || '-'}</td>
                    <td className="px-6 py-4"><TaxRegimeBadge regime={inv.tax_regime} /></td>
                    <td className="px-6 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="px-6 py-4 text-right font-bold text-admin-text-primary">
                      {formatCurrency(Number(inv.grand_total || 0))}
                    </td>
                    <td className="px-6 py-4 text-admin-text-muted text-xs">{formatDate(inv.created_at)}</td>
                    <td className="px-6 py-4 text-admin-text-secondary text-xs">{inv.created_by_user?.name || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-admin-border bg-admin-bg-surface">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </Card>
      )}
    </div>
  );
}
