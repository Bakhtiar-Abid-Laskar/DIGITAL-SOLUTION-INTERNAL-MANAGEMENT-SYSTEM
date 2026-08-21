"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, History, DollarSign, Cloud, ExternalLink, Users, Download, Wrench, Package, TrendingUp } from "lucide-react";
import dynamic from 'next/dynamic';

const TechPerformanceChart = dynamic(() => import('@/components/dashboard/TechPerformanceChart'), { ssr: false });
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), { ssr: false });
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import { useToast } from "@/components/common/ToastProvider";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { DataTableSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs } from "@/components/common/Tabs";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tech"); 
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  
  // Tech Performance State
  const [techData, setTechData] = useState<{name: string, count: number, id: string}[]>([]);
  const [techLoading, setTechLoading] = useState(true);
  const [techMonth, setTechMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Customer History State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerJobs, setCustomerJobs] = useState<any[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  // Revenue State
  const [revenueData, setRevenueData] = useState<{ totalRevenue: number; totalLabour: number; totalParts: number; recentBills: any[] } | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  // Drive Export State
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [triggeringExport, setTriggeringExport] = useState<string | null>(null);

  const fetchTechPerformance = useCallback(async (cancelled = false) => {
    if (!cancelled) setTechLoading(true);
    try {
      const date = new Date(techMonth + "-01T00:00:00");
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data: jobs } = await supabase
        .from('jobs')
        .select('technician_id, users!jobs_technician_id_fkey(name)')
        .eq('status', 'Completed')
        .gte('completed_at', date.toISOString())
        .lt('completed_at', nextMonth.toISOString());

      if (cancelled) return;
      if (jobs) {
        const counts: Record<string, {name: string, count: number, id: string}> = {};
        jobs.forEach(job => {
          if (job.technician_id) {
            if (!counts[job.technician_id]) {
              counts[job.technician_id] = {
                id: job.technician_id,
                name: (job.users as any)?.name || 'Unknown',
                count: 0
              };
            }
            counts[job.technician_id].count++;
          }
        });
        setTechData(Object.values(counts));
      }
    } finally {
      if (!cancelled) setTechLoading(false);
    }
  }, [techMonth]);

  const fetchRevenueData = useCallback(async (cancelled = false) => {
    if (!cancelled) setRevenueLoading(true);
    try {
      const date = new Date();
      date.setDate(1);
      date.setHours(0,0,0,0);

      const { data: bills } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), jobs!left(job_code, customer_name, completed_at)')
        .gte('created_at', date.toISOString())
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (bills) {
        const totalRevenue = bills.reduce((acc, b) => acc + (b.grand_total || 0), 0);
        const totalLabour = bills.reduce((acc, b) => {
          const labourItem = b.invoice_items?.find((i: any) => i.item_name === 'Labour Charge');
          return acc + (labourItem ? Number(labourItem.line_total || (labourItem.quantity * labourItem.selling_rate)) : 0);
        }, 0);
        const totalParts = bills.reduce((acc, b) => {
          const partsItems = b.invoice_items?.filter((i: any) => i.item_name !== 'Labour Charge') || [];
          return acc + partsItems.reduce((sum: number, item: any) => sum + Number(item.line_total || (item.quantity * item.selling_rate)), 0);
        }, 0);
        setRevenueData({
          totalRevenue,
          totalLabour,
          totalParts,
          recentBills: bills
        });
      }
    } finally {
      if (!cancelled) setRevenueLoading(false);
    }
  }, []);

  const fetchExportJobs = useCallback(async (cancelled = false) => {
    if (!cancelled) setExportLoading(true);
    try {
      const { data } = await supabase.from('export_jobs_latest').select('*');
      if (cancelled) return;
      if (data) setExportJobs(data);
    } finally {
      if (!cancelled) setExportLoading(false);
    }
  }, []);

  const handleTriggerExport = async (type: 'monthly-data' | 'attendance-report') => {
    setTriggeringExport(type);
    try {
      const endpoint = type === 'monthly-data' ? 'export-monthly-data' : 'export-attendance-reports';
      const { error } = await supabase.functions.invoke(endpoint, {
        body: { month: exportMonth }
      });
      if (error) throw error;
      showToast(`Export for ${exportMonth} started!`, 'success');
      fetchExportJobs();
    } catch (err: any) {
      console.error("FULL EXPORT ERROR:", err);
      let errMsg = err.message;
      if (err.context && typeof err.context.text === 'function') {
        try {
          const text = await err.context.text();
          errMsg = text;
        } catch (e) {}
      }
      showToast(`Failed to trigger export: ${errMsg}`, 'error');
    } finally {
      setTriggeringExport(null);
    }
  };

  const fetchCustomerJobs = useCallback(async (page = 1, cancelled = false) => {
    if (!customerSearch.trim()) {
      setCustomerJobs([]);
      setCustomerTotalPages(1);
      return;
    }
    if (!cancelled) setCustomerLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .or(`customer_name.ilike.%${customerSearch}%,customer_contact.ilike.%${customerSearch}%`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (cancelled) return;
      if (error) throw error;
      setCustomerJobs(data || []);
      if (count !== null) setCustomerTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: any) {
      if (cancelled) return;
      showToast('Error searching customer history.', 'error');
    } finally {
      if (!cancelled) setCustomerLoading(false);
    }
  }, [customerSearch, showToast]);

  useEffect(() => {
    let cancelled = false;
    if (activeTab === "tech") fetchTechPerformance(cancelled);
    if (activeTab === "revenue") fetchRevenueData(cancelled);
    if (activeTab === "export") fetchExportJobs(cancelled);
    return () => { cancelled = true; };
  }, [activeTab, fetchTechPerformance, fetchRevenueData, fetchExportJobs]);

  useEffect(() => {
    let cancelled = false;
    if (activeTab === "customer") {
      fetchCustomerJobs(customerPage, cancelled);
    }
    return () => { cancelled = true; };
  }, [activeTab, customerPage, fetchCustomerJobs]);

  const onSearchSubmit = () => {
    setCustomerPage(1);
    fetchCustomerJobs(1);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    let csvData = "";
    let filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === "tech") {
      csvData = "Technician,Completed Jobs\n" + techData.map(t => `"${t.name}",${t.count}`).join("\n");
    } else if (activeTab === "customer") {
      if (customerJobs.length === 0) {
        showToast("No customer jobs to export.", "info");
        setExporting(false);
        return;
      }
      csvData = "Job Code,Customer,Contact,Device,Status,Created At\n" + 
        customerJobs.map(j => `"${j.job_code}","${j.customer_name}","${j.customer_contact}","${j.device_type}","${j.status}","${j.created_at}"`).join("\n");
    } else if (activeTab === "revenue") {
      if (!revenueData || revenueData.recentBills.length === 0) {
        showToast("No revenue data to export.", "info");
        setExporting(false);
        return;
      }
      csvData = "Job Code,Customer,Grand Total,Labour,Parts,Paid,Created At\n" + 
        revenueData.recentBills.map(b => `"${b.jobs?.job_code || b.invoice_code}","${b.jobs?.customer_name || b.customer_name}",${b.grand_total},${
          b.invoice_items?.find((i:any)=>i.item_name==='Labour Charge')?.line_total || 0
        },${
          b.invoice_items?.filter((i:any)=>i.item_name!=='Labour Charge').reduce((sum:number,i:any)=>sum+Number(i.line_total||0),0)
        },${b.status === 'paid'},"${b.created_at}"`).join("\n");
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const tabs = [
    { id: "tech", label: "Technician Performance", icon: <Users size={16} /> },
    { id: "customer", label: "Customer History", icon: <History size={16} /> },
    { id: "revenue", label: "Revenue", icon: <DollarSign size={16} /> },
    { id: "export", label: "Drive Exports", icon: <Cloud size={16} /> },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Reports & Analytics" 
        description="Analyze shop operational metrics, technician productivity, and revenue trends."
        actions={
          <Button onClick={handleExportCSV} isLoading={exporting} variant="outline" size="sm" leftIcon={<Download size={14} />}>
            Export CSV
          </Button>
        }
      />

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="flex-1">
        {/* TECH TAB */}
        {activeTab === "tech" && (
          <div className="space-y-4">
            {techLoading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="h-96 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
                <DataTableSkeleton rows={5} cols={2} hasFilterBar={false} />
              </div>
            ) : techData.length === 0 ? (
              <EmptyState 
                icon={<Users size={40} className="text-admin-text-muted" />}
                heading="No data available"
                subtext="No jobs have been completed this month yet."
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card noAccentLine className="h-96 flex flex-col border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold">Jobs Completed</CardTitle>
                    <Input 
                      type="month" 
                      value={techMonth} 
                      onChange={(e) => setTechMonth(e.target.value)} 
                      className="w-44 h-9 text-sm"
                      aria-label="Filter Tech Month"
                    />
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <TechPerformanceChart data={techData} />
                  </CardContent>
                </Card>
                <Card noAccentLine className="flex flex-col border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
                  <CardHeader className="pb-3 border-b border-admin-border">
                    <CardTitle className="text-base font-semibold">Technician Productivity</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto flex-1 table-scroll-shadow">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border text-xs uppercase font-semibold">
                        <tr>
                          <th scope="col" className="px-6 py-3.5">Technician</th>
                          <th scope="col" className="px-6 py-3.5 text-right">Completed Jobs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-admin-border">
                        {techData.map(tech => (
                          <tr key={tech.id} className="hover:bg-admin-bg-hover transition-colors">
                            <td className="px-6 py-4 font-semibold text-admin-text-primary">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-admin-accent-dim text-admin-accent border border-admin-accent/20 flex items-center justify-center font-bold text-xs">
                                  {tech.name[0]?.toUpperCase() || 'T'}
                                </div>
                                <span>{tech.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-admin-text-primary text-right font-mono text-base">{tech.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* CUSTOMER TAB */}
        {activeTab === "customer" && (
          <Card noAccentLine className="h-full flex flex-col border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
            <CardHeader className="border-b border-admin-border pb-4">
              <CardTitle className="text-base font-semibold">Customer Repair History</CardTitle>
              <div className="flex items-center gap-3 max-w-lg mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
                  <Input 
                    type="text" 
                    placeholder="Search by customer name or phone..." 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                    className="pl-9 h-10 text-sm"
                    aria-label="Customer Search"
                  />
                </div>
                <Button size="sm" onClick={onSearchSubmit} isLoading={customerLoading} className="h-10 px-4">
                  Search
                </Button>
              </div>
            </CardHeader>
            
            {customerLoading ? (
              <DataTableSkeleton rows={5} cols={5} hasFilterBar={false} />
            ) : (
              <>
                <div className="overflow-x-auto flex-1 table-scroll-shadow">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border text-xs uppercase font-semibold">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Job Code</th>
                        <th scope="col" className="px-6 py-3.5">Customer</th>
                        <th scope="col" className="px-6 py-3.5">Device</th>
                        <th scope="col" className="px-6 py-3.5">Status</th>
                        <th scope="col" className="px-6 py-3.5">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                      {customerJobs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8">
                            <EmptyState 
                              icon={<History size={40} className="text-admin-text-muted" />}
                              heading="No jobs found"
                              subtext={customerSearch ? 'No jobs found matching this query.' : 'Search for a customer to view their repair history.'}
                              asCard={false}
                            />
                          </td>
                        </tr>
                      ) : (
                        customerJobs.map(job => (
                          <tr key={job.id} onClick={() => router.push(`/jobs/${job.id}`)} className="hover:bg-admin-bg-hover transition-colors cursor-pointer">
                            <td className="px-6 py-4 font-mono font-bold text-xs text-admin-text-primary">{job.job_code}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-admin-text-primary">{job.customer_name}</div>
                              <div className="text-xs text-admin-text-muted">{job.customer_contact}</div>
                            </td>
                            <td className="px-6 py-4 text-admin-text-secondary">{job.device_type}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={job.status} />
                            </td>
                            <td className="px-6 py-4 text-admin-text-muted text-xs">{formatDate(job.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {customerJobs.length > 0 && (
                  <div className="p-4 border-t border-admin-border bg-admin-bg-surface">
                    <Pagination currentPage={customerPage} totalPages={customerTotalPages} onPageChange={setCustomerPage} />
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* REVENUE TAB */}
        {activeTab === "revenue" && (
          <div className="space-y-4">
            {revenueLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
                  ))}
                </div>
                <div className="h-80 bg-admin-bg-surface border border-admin-border rounded-xl skeleton-pulse" />
                <DataTableSkeleton rows={4} cols={5} hasFilterBar={false} />
              </div>
            ) : revenueData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Revenue (This Month)"
                    value={formatCurrency(revenueData.totalRevenue)}
                    detail="Gross customer billed value"
                    icon={<TrendingUp size={18} />}
                    tone="success"
                  />
                  <StatCard
                    title="Labour Revenue"
                    value={formatCurrency(revenueData.totalLabour)}
                    detail="Service charge total"
                    icon={<Wrench size={18} />}
                    tone="info"
                  />
                  <StatCard
                    title="Parts Revenue"
                    value={formatCurrency(revenueData.totalParts)}
                    detail="Materials & inventory total"
                    icon={<Package size={18} />}
                    tone="warning"
                  />
                </div>
                
                <Card noAccentLine className="h-80 flex flex-col border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    {revenueData.recentBills.length > 0 ? (
                      <RevenueChart data={revenueData.recentBills.slice().reverse().map((b: any) => ({
                        date: formatDate(b.created_at).substring(0, 6),
                        revenue: b.grand_total || 0
                      }))} />
                    ) : (
                      <EmptyState heading="No Data" subtext="No revenue data available to graph." asCard={false} />
                    )}
                  </CardContent>
                </Card>

                <Card noAccentLine className="flex flex-col border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
                  <CardHeader className="pb-3 border-b border-admin-border">
                    <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto flex-1 table-scroll-shadow">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border text-xs uppercase font-semibold">
                        <tr>
                          <th scope="col" className="px-6 py-3.5">Job Code</th>
                          <th scope="col" className="px-6 py-3.5">Customer</th>
                          <th scope="col" className="px-6 py-3.5">Date</th>
                          <th scope="col" className="px-6 py-3.5 text-right">Amount</th>
                          <th scope="col" className="px-6 py-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-admin-border">
                        {revenueData.recentBills.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8">
                              <EmptyState 
                                icon={<DollarSign size={40} className="text-admin-text-muted" />}
                                heading="No invoices found"
                                subtext="No invoices generated this month."
                                asCard={false}
                              />
                            </td>
                          </tr>
                        ) : (
                          revenueData.recentBills.map(bill => (
                            <tr key={bill.id} className="hover:bg-admin-bg-hover transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-xs text-admin-text-primary">{bill.jobs?.job_code || bill.invoice_code}</td>
                              <td className="px-6 py-4 text-admin-text-secondary">{bill.jobs?.customer_name || bill.customer_name}</td>
                              <td className="px-6 py-4 text-admin-text-muted text-xs">{formatDate(bill.created_at)}</td>
                              <td className="px-6 py-4 font-bold text-admin-text-primary text-right">{formatCurrency(bill.grand_total || 0)}</td>
                              <td className="px-6 py-4 text-center">
                                <Badge variant={bill.status === 'paid' ? 'success' : 'danger'}>
                                  {bill.status === 'paid' ? 'PAID' : 'UNPAID'}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            ) : (
              <EmptyState 
                icon={<DollarSign size={40} className="text-admin-text-muted" />}
                heading="No Data"
                subtext="Could not load revenue data."
              />
            )}
          </div>
        )}

        {/* DRIVE EXPORTS TAB */}
        {activeTab === "export" && (
          <div className="space-y-4">
            <Card noAccentLine className="border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-admin-border pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">Google Drive Exports</CardTitle>
                  <p className="text-xs text-admin-text-muted mt-0.5">
                    Trigger manual exports of your shop data to Google Drive.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-admin-text-muted">Target Month:</span>
                  <Input 
                    type="month" 
                    value={exportMonth} 
                    onChange={(e) => setExportMonth(e.target.value)} 
                    className="w-40 h-9 text-sm"
                    aria-label="Target Export Month"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Monthly Data */}
                <div className="border border-admin-border bg-admin-bg-subtle/30 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-admin-text-primary">Monthly Data Export</h3>
                    <p className="text-xs text-admin-text-secondary mt-1 max-w-md">
                      Exports Jobs, Sales, and an Inventory snapshot to a single Excel workbook.
                    </p>
                    {(() => {
                      const job = exportJobs.find(j => j.type === 'monthly-data');
                      if (!job) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-muted font-medium">
                            {formatDate(job.started_at)}
                          </span>
                          {job.status === 'success' && job.drive_link && (
                            <a href={job.drive_link} target="_blank" rel="noreferrer" className="text-admin-accent hover:underline flex items-center gap-1 font-semibold">
                              View in Drive <ExternalLink size={12} />
                            </a>
                          )}
                          {job.status === 'failed' && (
                            <span className="text-admin-urgent-fg font-semibold" title={job.error_message}>Error occurred</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleTriggerExport('monthly-data')} 
                    isLoading={triggeringExport === 'monthly-data'}
                    disabled={triggeringExport !== null || exportJobs.find(j => j.type === 'monthly-data')?.status === 'running'}
                  >
                    Export {exportMonth} Data
                  </Button>
                </div>

                {/* Attendance Reports */}
                <div className="border border-admin-border bg-admin-bg-subtle/30 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-admin-text-primary">Attendance Reports Export</h3>
                    <p className="text-xs text-admin-text-secondary mt-1 max-w-md">
                      Generates an individual Excel attendance report for each staff member.
                    </p>
                    {(() => {
                      const job = exportJobs.find(j => j.type === 'attendance-report');
                      if (!job) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-muted font-medium">
                            {formatDate(job.started_at)}
                          </span>
                          {job.status === 'success' && job.drive_link && (
                            <a href={job.drive_link} target="_blank" rel="noreferrer" className="text-admin-accent hover:underline flex items-center gap-1 font-semibold">
                              View in Drive <ExternalLink size={12} />
                            </a>
                          )}
                          {job.status === 'failed' && (
                            <span className="text-admin-urgent-fg font-semibold" title={job.error_message}>Error occurred</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleTriggerExport('attendance-report')} 
                    isLoading={triggeringExport === 'attendance-report'}
                    disabled={triggeringExport !== null || exportJobs.find(j => j.type === 'attendance-report')?.status === 'running'}
                  >
                    Export {exportMonth} Attendance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
