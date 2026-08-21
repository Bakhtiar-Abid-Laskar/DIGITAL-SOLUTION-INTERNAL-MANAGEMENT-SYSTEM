"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Briefcase,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Package,
  PlusCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  UserCheck,
  Wrench,
} from "lucide-react";
import { formatCurrency, Job } from "@repairshop/shared";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TableSkeleton } from "@/components/common/LoadingState";
import { cn } from "@/lib/utils";

const RevenueChart = dynamic(() => import("@/components/dashboard/RevenueChart"), { ssr: false });

const ACTIVE_JOB_STATUSES = ["Received", "In Progress", "Waiting for Materials"] as const;
const PIPELINE_STATUSES = ["Received", "In Progress", "Waiting for Materials", "Completed"] as const;
const MAX_TECH_ACTIVE_JOBS = 5;

type Technician = {
  id: string;
  name: string;
  is_active: boolean;
};

type InvoiceRow = {
  id: string;
  invoice_code: string;
  customer_name: string;
  status: "draft" | "paid" | "cancelled";
  grand_total: number | string | null;
  created_at: string;
  paid_at?: string | null;
};

type PaymentRow = {
  id: string;
  type: string;
  amount: number | string | null;
  description?: string | null;
  created_at: string;
};

type InventoryAlert = {
  id: string;
  name: string;
  sku?: string | null;
  quantity: number;
  threshold: number;
  unit?: string | null;
};

type MaterialReturn = {
  id: string;
  material_name: string;
  quantity: number;
  technician_name: string;
  job_id?: string;
  job_code?: string;
  created_at: string;
  source: "material_allotments" | "job_materials";
};

type DashboardData = {
  jobs: Job[];
  technicians: Technician[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  inventoryAlerts: InventoryAlert[];
  materialReturns: MaterialReturn[];
};

type ActionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: "critical" | "warning" | "info";
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const numberValue = (value: number | string | null | undefined) => Number(value || 0);

const sameDay = (isoDate: string, date: Date) => {
  const itemDate = new Date(isoDate);
  return itemDate >= startOfDay(date) && itemDate < new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000);
};

const isActiveJob = (job: Job) => ACTIVE_JOB_STATUSES.includes(job.status as any);

const statusQuery = (status: string) => `/jobs?status=${encodeURIComponent(status)}`;
const technicianQuery = (id: string) => `/jobs?technician=${encodeURIComponent(id)}`;

export default function OverviewPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState("All");
  const [recentTechnician, setRecentTechnician] = useState("All");

  const fetchMaterialReturns = useCallback(async (): Promise<MaterialReturn[]> => {
    const allotments = await supabase
      .from("material_allotments")
      .select(`
        id,
        technician_id,
        qty,
        status,
        created_at,
        products ( name, unit ),
        users ( name ),
        source_job_material:source_job_material_id (
          job_id,
          jobs ( job_code )
        )
      `)
      .eq("status", "allotted")
      .order("created_at", { ascending: false })
      .limit(8);

    if (!allotments.error) {
      return (allotments.data || []).map((row: any) => ({
        id: row.id,
        material_name: row.products?.name || "Material",
        quantity: numberValue(row.qty),
        technician_name: row.users?.name || "Unassigned",
        job_id: row.source_job_material?.job_id,
        job_code: row.source_job_material?.jobs?.job_code,
        created_at: row.created_at,
        source: "material_allotments",
      }));
    }

    const fallback = await supabase
      .from("job_materials")
      .select(`
        id,
        material_name,
        quantity,
        status,
        created_at,
        technician_id,
        job_id,
        technicians:users!job_materials_technician_id_fkey ( name ),
        jobs ( job_code )
      `)
      .eq("status", "allotted")
      .order("created_at", { ascending: false })
      .limit(8);

    if (fallback.error) return [];

    return (fallback.data || []).map((row: any) => ({
      id: row.id,
      material_name: row.material_name,
      quantity: numberValue(row.quantity),
      technician_name: row.technicians?.name || "Unassigned",
      job_id: row.job_id,
      job_code: row.jobs?.job_code,
      created_at: row.created_at,
      source: "job_materials",
    }));
  }, []);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [jobsRes, techRes, invoicesRes, paymentsRes, inventoryRes, materialReturns] = await Promise.all([
        supabase
          .from("jobs")
          .select("*, technician:users!jobs_technician_id_fkey(name), job_technicians(technician_id, technician:users!job_technicians_technician_id_fkey(name))")
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("users")
          .select("id, name, is_active")
          .eq("role", "technician")
          .order("name", { ascending: true }),
        supabase
          .from("invoices")
          .select("id, invoice_code, customer_name, status, grand_total, created_at, paid_at")
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("payments")
          .select("id, type, amount, description, created_at")
          .in("type", ["materials_purchase", "daily_expenditure", "office_development"])
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("inventory")
          .select("id, quantity_cached, low_stock_threshold, products ( name, sku, unit )")
          .order("quantity_cached", { ascending: true })
          .limit(80),
        fetchMaterialReturns(),
      ]);

      const blockingError = jobsRes.error || techRes.error;
      if (blockingError) throw blockingError;

      const inventoryAlerts = ((inventoryRes.data || []) as any[])
        .map((item) => ({
          id: item.id,
          name: item.products?.name || "Unknown item",
          sku: item.products?.sku,
          unit: item.products?.unit,
          quantity: numberValue(item.quantity_cached),
          threshold: numberValue(item.low_stock_threshold),
        }))
        .filter((item) => item.quantity <= item.threshold);

      setData({
        jobs: (jobsRes.data || []) as any,
        technicians: (techRes.data || []) as Technician[],
        invoices: invoicesRes.error ? [] : ((invoicesRes.data || []) as InvoiceRow[]),
        payments: paymentsRes.error ? [] : ((paymentsRes.data || []) as PaymentRow[]),
        inventoryAlerts,
        materialReturns,
      });
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      const isNetworkError = err?.message?.includes("Failed to fetch") || (typeof navigator !== 'undefined' && !navigator.onLine);
      setError(
        isNetworkError
          ? "Unable to connect to the backend server. Please check your internet connection and refresh."
          : (err.message || "Failed to load dashboard data.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchMaterialReturns]);

  useEffect(() => {
    fetchDashboardData();

    const onFocus = () => fetchDashboardData(true);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => fetchDashboardData(true), 60000);

    const channel = supabase
      .channel(`admin-operations-overview-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => fetchDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => fetchDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => fetchDashboardData(true))
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  const derived = useMemo(() => {
    const empty = {
      jobsToday: 0,
      openJobs: 0,
      openJobsToday: 0,
      inProgress: 0,
      waitingParts: 0,
      readyPickup: 0,
      unpaidReady: 0,
      todaySales: 0,
      todayTransactions: 0,
      todayExpenses: 0,
      todayNet: 0,
      monthRevenue: 0,
      monthExpenses: 0,
      monthNet: 0,
      pendingPayments: 0,
      pipeline: [] as Array<{ status: string; count: number }>,
      technicianWorkload: [] as Array<{ technician: Technician; activeCount: number; breakdown: Record<string, number> }>,
      actionItems: [] as ActionItem[],
      trend: [] as Array<{ date: string; revenue: number }>,
      activity: [] as Array<{ id: string; label: string; detail: string; time: string; href: string }>,
    };
    if (!data) return empty;

    const now = new Date();
    const today = startOfDay(now);
    const month = startOfMonth(now);
    const activeJobs = data.jobs.filter(isActiveJob);
    const jobsToday = data.jobs.filter((job) => sameDay(job.created_at, now)).length;
    const openJobsToday = activeJobs.filter((job) => sameDay(job.created_at, now)).length;
    const paidInvoices = data.invoices.filter((invoice) => invoice.status === "paid");
    const todayInvoices = paidInvoices.filter((invoice) => sameDay(invoice.created_at, now));
    const monthInvoices = paidInvoices.filter((invoice) => new Date(invoice.created_at) >= month);
    const todayExpensesRows = data.payments.filter((payment) => sameDay(payment.created_at, now));
    const monthExpensesRows = data.payments.filter((payment) => new Date(payment.created_at) >= month);
    const todaySales = todayInvoices.reduce((sum, invoice) => sum + numberValue(invoice.grand_total), 0);
    const todayExpenses = todayExpensesRows.reduce((sum, payment) => sum + numberValue(payment.amount), 0);
    const monthRevenue = monthInvoices.reduce((sum, invoice) => sum + numberValue(invoice.grand_total), 0);
    const monthExpenses = monthExpensesRows.reduce((sum, payment) => sum + numberValue(payment.amount), 0);
    const pendingPayments = data.invoices
      .filter((invoice) => invoice.status === "draft")
      .reduce((sum, invoice) => sum + numberValue(invoice.grand_total), 0);

    const pipeline = PIPELINE_STATUSES.map((status) => ({
      status,
      count: data.jobs.filter((job) => job.status === status).length,
    }));

    const technicianWorkload = data.technicians.map((technician) => {
      const techJobs = activeJobs.filter((job) => job.technician_id === technician.id);
      const breakdown = techJobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { technician, activeCount: techJobs.length, breakdown };
    }).sort((a, b) => b.activeCount - a.activeCount);

    const waitingJobs = data.jobs.filter((job) => job.status === "Waiting for Materials").slice(0, 4);
    const pendingInvoices = data.invoices.filter((invoice) => invoice.status === "draft").slice(0, 3);
    const criticalStock = data.inventoryAlerts.filter((item) => item.quantity <= 0).slice(0, 3);
    const lowStock = data.inventoryAlerts.filter((item) => item.quantity > 0).slice(0, 3);

    const actionItems: ActionItem[] = [
      ...waitingJobs.map((job) => ({
        id: `waiting-${job.id}`,
        label: `${job.job_code} waiting for materials`,
        detail: `${job.customer_name} · ${job.device_type}`,
        href: `/jobs/${job.id}`,
        tone: "warning" as const,
      })),
      ...data.materialReturns.slice(0, 3).map((material) => ({
        id: `material-${material.id}`,
        label: `${material.material_name} awaiting return`,
        detail: `${material.quantity} unit(s) · ${material.technician_name}`,
        href: "/materials",
        tone: "info" as const,
      })),
      ...pendingInvoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        label: `${invoice.invoice_code} payment pending`,
        detail: `${invoice.customer_name} · ${formatCurrency(numberValue(invoice.grand_total))}`,
        href: "/sales?status=draft",
        tone: "critical" as const,
      })),
      ...criticalStock.map((item) => ({
        id: `critical-${item.id}`,
        label: `${item.name} is out of stock`,
        detail: `Current ${item.quantity} · Min ${item.threshold}`,
        href: `/inventory?search=${encodeURIComponent(item.sku || item.name)}`,
        tone: "critical" as const,
      })),
      ...lowStock.map((item) => ({
        id: `low-${item.id}`,
        label: `${item.name} is low`,
        detail: `Current ${item.quantity} · Min ${item.threshold}`,
        href: `/inventory?search=${encodeURIComponent(item.sku || item.name)}`,
        tone: "warning" as const,
      })),
    ].slice(0, 10);

    const trend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const revenue = paidInvoices
        .filter((invoice) => new Date(invoice.created_at) >= day && new Date(invoice.created_at) < next)
        .reduce((sum, invoice) => sum + numberValue(invoice.grand_total), 0);
      return {
        date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(day),
        revenue,
      };
    });

    const activity = [
      ...data.jobs.slice(0, 6).map((job) => ({
        id: `job-${job.id}`,
        label: `${job.job_code} · ${job.status}`,
        detail: `${job.customer_name} job updated`,
        time: job.completed_at || job.created_at,
        href: `/jobs/${job.id}`,
      })),
      ...data.invoices.slice(0, 5).map((invoice) => ({
        id: `invoice-${invoice.id}`,
        label: `${invoice.invoice_code} · ${invoice.status}`,
        detail: `${formatCurrency(numberValue(invoice.grand_total))} invoice`,
        time: invoice.paid_at || invoice.created_at,
        href: "/sales",
      })),
      ...data.materialReturns.slice(0, 4).map((material) => ({
        id: `mat-${material.id}`,
        label: `${material.material_name} allotted`,
        detail: `${material.technician_name} · ${material.job_code || "No job"}`,
        time: material.created_at,
        href: "/materials",
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    return {
      jobsToday,
      openJobs: activeJobs.length,
      openJobsToday,
      inProgress: data.jobs.filter((job) => job.status === "In Progress").length,
      waitingParts: data.jobs.filter((job) => job.status === "Waiting for Materials").length,
      readyPickup: data.jobs.filter((job) => job.status === "Completed").length,
      unpaidReady: pendingInvoices.length,
      todaySales,
      todayTransactions: todayInvoices.length,
      todayExpenses,
      todayNet: todaySales - todayExpenses,
      monthRevenue,
      monthExpenses,
      monthNet: monthRevenue - monthExpenses,
      pendingPayments,
      pipeline,
      technicianWorkload,
      actionItems,
      trend,
      activity,
    };
  }, [data]);

  const filteredRecentJobs = useMemo(() => {
    if (!data) return [];
    const query = recentSearch.trim().toLowerCase();
    return data.jobs
      .filter((job) => recentStatus === "All" || job.status === recentStatus)
      .filter((job) => recentTechnician === "All" || job.technician_id === recentTechnician)
      .filter((job) => {
        if (!query) return true;
        return (
          job.job_code.toLowerCase().includes(query) ||
          job.customer_name.toLowerCase().includes(query) ||
          job.customer_contact.toLowerCase().includes(query) ||
          job.device_type.toLowerCase().includes(query)
        );
      })
      .slice(0, 10);
  }, [data, recentSearch, recentStatus, recentTechnician]);

  const handleReturnMaterial = async (material: MaterialReturn) => {
    if (material.source !== "material_allotments") {
      showToast("Open Allotted Materials to reconcile this legacy material entry.", "info");
      router.push("/materials");
      return;
    }

    try {
      setReturningId(material.id);
      const { error: returnError } = await supabase.rpc("return_material_allotment", {
        p_allotment_id: material.id,
      });
      if (returnError) throw returnError;
      showToast("Material returned to inventory.", "success");
      fetchDashboardData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to return material.", "error");
    } finally {
      setReturningId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 rounded-lg bg-admin-bg-surface border border-admin-border skeleton-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="h-28 rounded-lg bg-admin-bg-surface border border-admin-border skeleton-pulse" />
          <div className="h-28 rounded-lg bg-admin-bg-surface border border-admin-border skeleton-pulse" />
          <div className="h-28 rounded-lg bg-admin-bg-surface border border-admin-border skeleton-pulse" />
          <div className="h-28 rounded-lg bg-admin-bg-surface border border-admin-border skeleton-pulse" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || "Failed to load dashboard data."} onRetry={() => fetchDashboardData()} />;
  }

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <section className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-admin-text-primary tracking-tight">Overview</h1>
            <span className="text-sm text-admin-text-muted">{todayLabel}</span>
            {refreshing && <Badge variant="neutral">Refreshing</Badge>}
          </div>
          <p className="text-sm text-admin-text-secondary mt-1">
            {derived.actionItems.length} items require attention · {data.technicians.filter((t) => t.is_active).length} technicians active · {formatCurrency(derived.todaySales)} sales today
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" leftIcon={<PlusCircle size={15} />} onClick={() => router.push("/jobs/new")}>Create Job</Button>
          <Button size="sm" variant="outline" leftIcon={<ShoppingCart size={15} />} onClick={() => router.push("/sales/new")}>Create Sale</Button>
          <Button size="sm" variant="outline" leftIcon={<Boxes size={15} />} onClick={() => router.push("/materials")}>Receive Material</Button>
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={15} />} isLoading={refreshing} onClick={() => fetchDashboardData(true)}>Refresh</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Open Jobs" value={derived.openJobs} detail={`+${derived.openJobsToday} today`} href="/jobs?status=active" icon={<Briefcase size={18} />} tone="info" />
        <KpiCard title="In Progress" value={derived.inProgress} detail={`${derived.waitingParts} waiting parts`} href={statusQuery("In Progress")} icon={<Wrench size={18} />} tone="primary" />
        <KpiCard title="Ready for Pickup" value={derived.readyPickup} detail={`${derived.unpaidReady} unpaid invoice(s)`} href={statusQuery("Completed")} icon={<CheckCircle2 size={18} />} tone="success" />
        <KpiCard title="Today's Sales" value={formatCurrency(derived.todaySales)} detail={`${derived.todayTransactions} transactions`} href="/sales?status=paid" icon={<IndianRupee size={18} />} tone="money" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card noAccentLine>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Action Required</CardTitle>
            <Badge variant={derived.actionItems.length ? "warning" : "success"}>{derived.actionItems.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.actionItems.length === 0 ? (
              <EmptyState asCard={false} icon={<CheckCircle2 size={34} />} heading="No urgent action" subtext="Jobs, payments, materials, and stock are currently clear." />
            ) : (
              derived.actionItems.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-start justify-between gap-3 rounded-lg border border-admin-border bg-admin-bg-surface p-3 hover:bg-admin-bg-subtle transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md", item.tone === "critical" ? "bg-admin-urgent-bg text-admin-urgent-fg" : item.tone === "warning" ? "bg-admin-pending-bg text-admin-pending-fg" : "bg-admin-progress-bg text-admin-progress-fg")}>
                      <AlertTriangle size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-admin-text-primary truncate">{item.label}</span>
                      <span className="block text-xs text-admin-text-muted truncate">{item.detail}</span>
                    </span>
                  </div>
                  <ArrowRight size={16} className="text-admin-text-muted shrink-0 mt-2" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card noAccentLine>
          <CardHeader>
            <CardTitle>Job Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.pipeline.map((stage) => {
              const total = Math.max(data.jobs.length, 1);
              const width = Math.max(4, (stage.count / total) * 100);
              return (
                <Link key={stage.status} href={statusQuery(stage.status)} className="block rounded-lg border border-admin-border p-3 hover:bg-admin-bg-subtle transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={stage.status} />
                    <span className="text-lg font-bold text-admin-text-primary">{stage.count}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-admin-bg-subtle overflow-hidden">
                    <div className="h-full rounded-full bg-admin-accent transition-all" style={{ width: `${width}%` }} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card noAccentLine>
          <CardHeader>
            <CardTitle>Technician Workload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.technicianWorkload.length === 0 ? (
              <EmptyState asCard={false} icon={<UserCheck size={34} />} heading="No technicians found" subtext="Active technician records will appear here." />
            ) : (
              derived.technicianWorkload.slice(0, 8).map(({ technician, activeCount, breakdown }) => {
                const width = Math.min(100, (activeCount / MAX_TECH_ACTIVE_JOBS) * 100);
                return (
                  <Link key={technician.id} href={technicianQuery(technician.id)} className="block rounded-lg border border-admin-border p-3 hover:bg-admin-bg-subtle transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-admin-text-primary">{technician.name}</p>
                        <p className="text-xs text-admin-text-muted">
                          {Object.entries(breakdown).map(([status, count]) => `${count} ${status.toLowerCase()}`).join(", ") || "No active jobs"}
                        </p>
                      </div>
                      <Badge variant={activeCount > 0 ? "accent" : "success"}>{activeCount > 0 ? "Busy" : "Available"}</Badge>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-admin-bg-subtle overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", activeCount >= MAX_TECH_ACTIVE_JOBS ? "bg-admin-warning" : "bg-admin-success")} style={{ width: `${width}%` }} />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card noAccentLine>
          <CardHeader>
            <CardTitle>Business Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MoneyCell label="Today Sales" value={derived.todaySales} />
              <MoneyCell label="Today Expenses" value={derived.todayExpenses} danger />
              <MoneyCell label="Today Net" value={derived.todayNet} highlight={derived.todayNet >= 0} />
              <MoneyCell label="Pending Payments" value={derived.pendingPayments} warning />
              <MoneyCell label="Month Revenue" value={derived.monthRevenue} />
              <MoneyCell label="Month Expenses" value={derived.monthExpenses} danger />
              <MoneyCell label="Month Net" value={derived.monthNet} highlight={derived.monthNet >= 0} />
              <Link href="/expenditure" className="rounded-lg border border-admin-border p-3 text-sm font-semibold text-admin-accent hover:bg-admin-bg-subtle transition-colors">Open Expenditure</Link>
            </div>
            <div className="mt-4 h-[220px]">
              <RevenueChart data={derived.trend} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card noAccentLine className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Material & Inventory Alerts</CardTitle>
            <Link href="/inventory" className="text-sm font-semibold text-admin-accent hover:text-admin-accent-dark">Open Inventory</Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StockPanel title="Critical Stock" items={data.inventoryAlerts.filter((item) => item.quantity <= 0)} empty="No critical stock outs." />
            <StockPanel title="Low Stock" items={data.inventoryAlerts.filter((item) => item.quantity > 0)} empty="No low-stock items." />
          </CardContent>
        </Card>

        <Card noAccentLine>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Awaiting Return</CardTitle>
            <Badge variant="accent">{data.materialReturns.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.materialReturns.length === 0 ? (
              <EmptyState asCard={false} icon={<Package size={34} />} heading="Nothing to return" subtext="All allotted materials are reconciled." />
            ) : (
              data.materialReturns.slice(0, 5).map((material) => (
                <div key={material.id} className="rounded-lg border border-admin-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-admin-text-primary truncate">{material.material_name}</p>
                      <p className="text-xs text-admin-text-muted truncate">{material.quantity} unit(s) · {material.technician_name} · {material.job_code || "No job"}</p>
                    </div>
                    <Button size="sm" variant="outline" isLoading={returningId === material.id} onClick={() => handleReturnMaterial(material)}>
                      Mark returned
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card noAccentLine>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <CardTitle>Recent Jobs</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
              <Input placeholder="Search jobs, customers, serials..." value={recentSearch} onChange={(event) => setRecentSearch(event.target.value)} className="pl-9 h-10" />
            </div>
            <Select value={recentStatus} onChange={(event) => setRecentStatus(event.target.value)} className="h-10">
              <option value="All">All Statuses</option>
              {PIPELINE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
            <Select value={recentTechnician} onChange={(event) => setRecentTechnician(event.target.value)} className="h-10">
              <option value="All">All Technicians</option>
              {data.technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
            </Select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto table-scroll-shadow">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary border-y border-admin-border">
              <tr>
                <th className="px-6 py-3 font-medium">Job Code</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Device</th>
                <th className="px-6 py-3 font-medium">Technician</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Priority</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {filteredRecentJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-admin-text-muted">No recent jobs match the current filters.</td>
                </tr>
              ) : (
                filteredRecentJobs.map((job) => (
                  <tr key={job.id} onClick={() => router.push(`/jobs/${job.id}`)} className="hover:bg-admin-bg-hover transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-semibold text-admin-text-primary">{job.job_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-admin-text-primary">{job.customer_name}</div>
                      <div className="text-xs text-admin-text-muted">{job.customer_contact}</div>
                    </td>
                    <td className="px-6 py-4 text-admin-text-secondary">{job.device_type}</td>
                    <td className="px-6 py-4 text-admin-text-secondary">
                      {(() => {
                        const techNames = [
                          job.technician?.name,
                          ...(job.job_technicians || []).map((jt: any) => jt.technician?.name)
                        ].filter(Boolean);
                        const uniqueNames = Array.from(new Set(techNames));
                        return uniqueNames.length > 0 ? uniqueNames.join(', ') : 'Unassigned';
                      })()}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4"><PriorityBadge priority={job.priority} /></td>
                    <td className="px-6 py-4 text-xs text-admin-text-muted">{new Date(job.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card noAccentLine>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {derived.activity.length === 0 ? (
            <EmptyState asCard={false} icon={<Clock3 size={34} />} heading="No activity yet" subtext="Recent jobs, invoices, and material movements will appear here." />
          ) : (
            derived.activity.map((item) => (
              <Link key={item.id} href={item.href} className="flex items-center justify-between gap-3 rounded-lg border border-admin-border p-3 hover:bg-admin-bg-subtle transition-colors">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-admin-text-primary truncate">{item.label}</span>
                  <span className="block text-xs text-admin-text-muted truncate">{item.detail}</span>
                </span>
                <span className="text-xs text-admin-text-muted shrink-0">{new Date(item.time).toLocaleDateString()}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, detail, href, icon, tone }: { title: string; value: string | number; detail: string; href: string; icon: React.ReactNode; tone: "primary" | "info" | "success" | "money" }) {
  const toneStyles = {
    primary: "bg-admin-accent-dim text-admin-accent",
    info: "bg-admin-progress-bg text-admin-progress-fg",
    success: "bg-admin-completed-bg text-admin-completed-fg",
    money: "bg-admin-pending-bg text-admin-pending-fg",
  };

  return (
    <Link href={href}>
      <Card noAccentLine className="p-4 hover:bg-admin-bg-subtle transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-admin-text-muted">{title}</p>
            <p className="mt-2 text-2xl font-bold text-admin-text-primary">{value}</p>
            <p className="mt-1 text-sm text-admin-text-secondary">{detail}</p>
          </div>
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneStyles[tone])}>{icon}</span>
        </div>
      </Card>
    </Link>
  );
}

function MoneyCell({ label, value, danger, warning, highlight }: { label: string; value: number; danger?: boolean; warning?: boolean; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-bg-surface p-3">
      <p className="text-xs font-semibold uppercase text-admin-text-muted">{label}</p>
      <p className={cn("mt-1 text-base font-bold", danger ? "text-admin-danger" : warning ? "text-admin-warning" : highlight ? "text-admin-success" : "text-admin-text-primary")}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function StockPanel({ title, items, empty }: { title: string; items: InventoryAlert[]; empty: string }) {
  return (
    <div className="rounded-lg border border-admin-border">
      <div className="flex items-center justify-between border-b border-admin-border px-3 py-2">
        <p className="text-sm font-semibold text-admin-text-primary">{title}</p>
        <Badge variant={items.length ? "warning" : "success"}>{items.length}</Badge>
      </div>
      <div className="divide-y divide-admin-border">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-admin-text-muted">{empty}</p>
        ) : (
          items.slice(0, 6).map((item) => (
            <Link key={item.id} href={`/inventory?search=${encodeURIComponent(item.sku || item.name)}`} className="flex items-center justify-between gap-3 p-3 hover:bg-admin-bg-subtle transition-colors">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-admin-text-primary truncate">{item.name}</span>
                <span className="block text-xs text-admin-text-muted truncate">{item.sku || item.unit || "Stock item"}</span>
              </span>
              <span className="text-right text-sm font-bold text-admin-text-primary">
                {item.quantity}
                <span className="text-admin-text-muted font-medium"> / {item.threshold}</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
