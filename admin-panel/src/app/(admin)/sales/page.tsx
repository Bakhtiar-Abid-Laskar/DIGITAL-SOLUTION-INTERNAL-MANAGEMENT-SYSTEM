"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Invoice } from "@/types/sales";
import { exportSalesToCSV } from "@/utils/salesCsv";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Pagination } from "@/components/common/Pagination";
import { Tabs } from "@/components/common/Tabs";
import { Calendar, Download, PlusCircle, Receipt, Search } from "lucide-react";

import { useDebounceValue } from '@repairshop/shared';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);
  const PAGE_SIZE = 20;

  const fetchTabCounts = useCallback(async () => {
    try {
      const [allRes, draftRes, paidRes, cancelledRes] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
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

      let query = supabase
        .from("invoices")
        .select("*, created_by_user:users!invoices_created_by_fkey(name)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (paymentFilter !== "All") query = query.eq("payment_method", paymentFilter);
      if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte("created_at", to.toISOString());
      }
      if (debouncedSearchQuery) {
        query = query.or(`invoice_code.ilike.%${debouncedSearchQuery}%,customer_name.ilike.%${debouncedSearchQuery}%,customer_contact.ilike.%${debouncedSearchQuery}%`);
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
    let cancelled = false;
    fetchInvoices(cancelled);

    const channel = supabase.channel("admin-invoices-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
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
          <>
            <Button leftIcon={<PlusCircle size={16} />} onClick={() => router.push("/sales/new")}>
              Create Invoice
            </Button>
            <Button variant="outline" leftIcon={<Download size={16} />} onClick={() => exportSalesToCSV(invoices as any)}>
              Export CSV
            </Button>
          </>
        }
      />

      <Tabs items={tabItems} activeId={statusFilter} onChange={setStatusFilter} className="mb-[-24px] z-10 relative" />

      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface rounded-tl-none pt-6">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="field-pltjww" className="block text-sm font-medium text-admin-text-secondary mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
            <Input id="field-pltjww"
              type="text"
              placeholder="Search by invoice code, name, phone..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="field-ha2bwp" className="block text-sm font-medium text-admin-text-secondary mb-1">Date Range</label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
              <Input id="field-ha2bwp" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="pl-9 text-sm" />
            </div>
            <span className="text-admin-text-muted">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
              <Input aria-label="Field" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="pl-9 text-sm" />
            </div>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="field-x8kuyb" className="block text-sm font-medium text-admin-text-secondary mb-1">Payment</label>
          <Select id="field-x8kuyb" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </Select>
        </div>
        <Button variant="ghost" onClick={handleClearFilters} className="text-admin-text-secondary">
          Clear Filters
        </Button>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {error ? (
          <div className="flex-1">
            <ErrorState message={error} onRetry={fetchInvoices} asCard={false} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1 table-scroll-shadow">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-admin-bg-surface text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">Invoice Code</th>
                    <th scope="col" className="px-6 py-4 font-medium">Customer</th>
                    <th scope="col" className="px-6 py-4 font-medium">Payment</th>
                    <th scope="col" className="px-6 py-4 font-medium">Tax Regime</th>
                    <th scope="col" className="px-6 py-4 font-medium">Status</th>
                    <th scope="col" className="px-6 py-4 font-medium text-right">Total</th>
                    <th scope="col" className="px-6 py-4 font-medium">Created</th>
                    <th scope="col" className="px-6 py-4 font-medium">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {loading ? (
                    <tr>
                      <td colSpan={8}>
                        <LoadingState message="Loading invoices..." />
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          icon={<Receipt size={40} className="text-admin-text-muted" />}
                          heading="No invoices found"
                          subtext="Try adjusting your filters or create a new invoice."
                          asCard={false}
                        />
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-admin-bg-hover transition-colors">
                        <td className="px-6 py-4 font-medium text-admin-text-primary">{inv.invoice_code}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-admin-text-primary">{inv.customer_name}</div>
                          <div className="text-admin-text-secondary text-xs">{inv.customer_contact}</div>
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{inv.payment_method || '-'}</td>
                        <td className="px-6 py-4"><TaxRegimeBadge regime={inv.tax_regime} /></td>
                        <td className="px-6 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="px-6 py-4 text-right font-semibold text-admin-text-primary">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(inv.grand_total || 0))}
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{new Date(inv.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-admin-text-secondary">{inv.created_by_user?.name || "Unknown"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && !error && invoices.length > 0 && (
               <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
