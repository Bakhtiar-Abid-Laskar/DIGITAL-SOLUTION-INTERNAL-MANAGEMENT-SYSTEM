"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Briefcase, Users, History, DollarSign, Cloud, ExternalLink } from "lucide-react";
import dynamic from 'next/dynamic';

const TechPerformanceChart = dynamic(() => import('@/components/dashboard/TechPerformanceChart'), { ssr: false });
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), { ssr: false });
import { Job, formatCurrency } from '@repairshop/shared';
import { formatDate } from '@/utils/formatDate';
import { useToast } from "@/components/common/ToastProvider";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { LoadingState, TableSkeleton, CardSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs } from "@/components/common/Tabs";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tech"); 
  const [exporting, setExporting] = useState(false);
  
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

  // Exports State
  const [revenueData, setRevenueData] = useState<{ totalRevenue: number; totalLabour: number; totalParts: number; recentBills: any[] } | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  // Drive Export State
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Default to previous month
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
        .from('billing')
        .select('*, jobs!inner(job_code, customer_name, completed_at)')
        .gte('created_at', date.toISOString())
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (bills) {
        const totalRevenue = bills.reduce((acc, b) => acc + (b.grand_total || 0), 0);
        const totalLabour = bills.reduce((acc, b) => acc + (b.labour_charge || 0), 0);
        const totalParts = bills.reduce((acc, b) => acc + (b.parts_total || 0), 0);
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
      const functionName = type === 'monthly-data' ? 'export-monthly-data' : 'export-attendance-reports';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { month: exportMonth }
      });
      if (error) throw error;
      alert(`Export triggered successfully. Status should update shortly.`);
    } catch (err: any) {
      alert(`Failed to trigger export: ${err.message}`);
    } finally {
      setTriggeringExport(null);
    }
  };

  const handleCustomerSearch = useCallback(async (pageNum = 1, cancelled = false) => {
    if (!customerSearch.trim()) {
      if (!cancelled) {
        setCustomerJobs([]);
        setCustomerTotalPages(1);
      }
      return;
    }
    if (!cancelled) setCustomerLoading(true);
    
    try {
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .or(`customer_name.ilike.%${customerSearch}%,customer_contact.ilike.%${customerSearch}%`)
        .order('created_at', { ascending: false });

      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count } = await query;

      if (cancelled) return;
      if (data) setCustomerJobs(data as any);
      if (count !== null) setCustomerTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } finally {
      if (!cancelled) setCustomerLoading(false);
    }
  }, [customerSearch]);

  useEffect(() => {
    let cancelled = false;
    if (activeTab === 'customer' && customerSearch.trim()) {
      handleCustomerSearch(customerPage, cancelled);
    }
    return () => { cancelled = true; };
  }, [activeTab, customerSearch, customerPage, handleCustomerSearch]);

  const onSearchSubmit = () => {
    setCustomerPage(1);
    handleCustomerSearch(1);
  };

  const handleExportCSV = () => {
    setExporting(true);
    let csvData = '';
    let filename = '';

    if (activeTab === 'tech') {
      filename = `tech-performance-${techMonth}.csv`;
      csvData = 'Technician,Completed Jobs\n';
      techData.forEach(t => csvData += `"${t.name}",${t.count}\n`);
    } else if (activeTab === 'customer') {
      filename = `customer-history.csv`;
      csvData = 'Job Code,Customer,Device,Status,Created At\n';
      customerJobs.forEach(j => csvData += `"${j.job_code}","${j.customer_name}","${j.device_type}","${j.status}","${new Date(j.created_at).toLocaleDateString()}"\n`);
    } else if (activeTab === 'revenue' && revenueData) {
      filename = `revenue-recent-invoices.csv`;
      csvData = 'Job Code,Customer,Date,Amount,Status\n';
      revenueData.recentBills.forEach(b => csvData += `"${b.jobs?.job_code}","${b.jobs?.customer_name}","${formatDate(b.created_at)}",${b.grand_total},"${b.is_paid ? 'PAID' : 'UNPAID'}"\n`);
    }

    if (!csvData) {
      setExporting(false);
      return;
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
    <div className="space-y-4 h-full flex flex-col">
      <PageHeader 
        title="Reports" 
        description="Analyze shop performance and history."
      >
        <Button onClick={handleExportCSV} isLoading={exporting} variant="outline" size="sm" className="flex items-center gap-2">
          <Download size={16} />
          Export CSV
        </Button>
      </PageHeader>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="flex-1">
        {/* TECH TAB */}
        {activeTab === "tech" && (
          <div className="space-y-4">
            {techLoading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="h-96 skeleton-pulse rounded-xl" />
                <TableSkeleton />
              </div>
            ) : techData.length === 0 ? (
                <EmptyState 
                  icon={<Users size={40} className="text-admin-text-muted" />}
                  heading="No data available"
                  subtext="No jobs have been completed this month yet."
                />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card className="h-96 flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Jobs Completed</CardTitle>
                    <Input aria-label="Field" 
                      type="month" 
                      value={techMonth} 
                      onChange={(e) => setTechMonth(e.target.value)} 
                      className="w-48"
                    />
                    </CardHeader>
                    <CardContent className="flex-1 pb-4">
                      <TechPerformanceChart data={techData} />
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>Technician Breakdown</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-admin-bg-subtle text-admin-text-secondary border-y border-admin-border">
                        <tr>
                          <th scope="col" className="px-6 py-4 font-medium">Technician</th>
                          <th scope="col" className="px-6 py-4 font-medium text-right">Completed Jobs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-admin-border">
                        {techData.map(tech => (
                          <tr key={tech.id} className="hover:bg-admin-bg-hover transition-colors">
                            <td className="px-6 py-4 font-medium text-admin-text-primary">{tech.name}</td>
                            <td className="px-6 py-4 font-bold text-admin-text-primary text-right">{tech.count}</td>
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
          <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Customer Job History</CardTitle>
              </CardHeader>
              <CardContent className="border-b border-admin-border pb-4">
                <div className="flex items-center gap-4 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
                  <Input aria-label="Search by Name or Phone..." 
                    type="text" 
                    placeholder="Search by Name or Phone..." 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={onSearchSubmit} isLoading={customerLoading}>
                  Search
                </Button>
              </div>
            </CardContent>
            
            
            {customerLoading ? (
              <TableSkeleton />
            ) : (
              <>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border">
                      <tr>
                        <th scope="col" className="px-6 py-4 font-medium">Job Code</th>
                        <th scope="col" className="px-6 py-4 font-medium">Customer</th>
                        <th scope="col" className="px-6 py-4 font-medium">Device</th>
                        <th scope="col" className="px-6 py-4 font-medium">Status</th>
                        <th scope="col" className="px-6 py-4 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                      {customerJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState 
                          icon={<History size={40} className="text-admin-text-muted" />}
                          heading="No jobs found"
                          subtext={customerSearch ? 'No jobs found for this customer.' : 'Search for a customer to view their history.'}
                          asCard={false}
                        />
                      </td>
                    </tr>
                  ) : (
                    customerJobs.map(job => (
                      <tr key={job.id} onClick={() => router.push(`/jobs/${job.id}`)} className="hover:bg-admin-bg-hover transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-medium text-admin-text-primary">{job.job_code}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-admin-text-primary">{job.customer_name}</div>
                          <div className="text-xs text-admin-text-secondary">{job.customer_contact}</div>
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{job.device_type}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4 text-admin-text-secondary">{formatDate(job.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                  </table>
                </div>
                {customerJobs.length > 0 && (
                  <Pagination currentPage={customerPage} totalPages={customerTotalPages} onPageChange={setCustomerPage} />
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
                  <CardSkeleton count={3} />
                  <div className="h-80 skeleton-pulse rounded-xl" />
                  <TableSkeleton />
                </div>
              ) : revenueData ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                      <div className="text-sm font-medium text-admin-text-secondary mb-1">Total Revenue (This Month)</div>
                      <div className="text-3xl font-bold text-admin-text-primary">{formatCurrency(revenueData.totalRevenue)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-admin-text-secondary mb-1">Labour Revenue</div>
                        <div className="text-3xl font-bold text-admin-accent">{formatCurrency(revenueData.totalLabour)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-admin-text-secondary mb-1">Parts Revenue</div>
                      <div className="text-3xl font-bold text-admin-text-secondary">{formatCurrency(revenueData.totalParts)}</div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="h-80 flex flex-col">
                    <CardHeader>
                      <CardTitle>Revenue (Last 30 Days)</CardTitle>
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

                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-admin-bg-subtle text-admin-text-secondary border-y border-admin-border">
                        <tr>
                          <th scope="col" className="px-6 py-4 font-medium">Job Code</th>
                          <th scope="col" className="px-6 py-4 font-medium">Customer</th>
                          <th scope="col" className="px-6 py-4 font-medium">Date</th>
                          <th scope="col" className="px-6 py-4 font-medium text-right">Amount</th>
                          <th scope="col" className="px-6 py-4 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-admin-border">
                        {revenueData.recentBills.length === 0 ? (
                          <tr>
                            <td colSpan={5}>
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
                              <td className="px-6 py-4 font-medium text-admin-text-primary">{bill.jobs?.job_code}</td>
                              <td className="px-6 py-4 text-admin-text-secondary">{bill.jobs?.customer_name}</td>
                              <td className="px-6 py-4 text-admin-text-secondary">{new Date(bill.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 font-bold text-admin-text-primary text-right">{formatCurrency(bill.grand_total || 0)}</td>
                              <td className="px-6 py-4 text-center">
                                <Badge variant={bill.is_paid ? 'success' : 'danger'}>
                                  {bill.is_paid ? 'PAID' : 'UNPAID'}
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Google Drive Exports</CardTitle>
                  <p className="text-sm text-admin-text-secondary mt-1">
                    Trigger manual exports of your shop data to Google Drive.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-admin-text-secondary">Target Month:</span>
                  <Input aria-label="Field" 
                    type="month" 
                    value={exportMonth} 
                    onChange={(e) => setExportMonth(e.target.value)} 
                    className="w-48"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Monthly Data */}
                <div className="border border-admin-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-admin-text-primary">Monthly Data Export</h3>
                    <p className="text-sm text-admin-text-secondary mt-1 max-w-md">
                      Exports Jobs, Sales, and an Inventory snapshot to a single Excel workbook.
                    </p>
                    {(() => {
                      const job = exportJobs.find(j => j.type === 'monthly-data');
                      if (!job) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 text-sm">
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-secondary">
                            {formatDate(job.started_at)}
                          </span>
                          {job.status === 'success' && job.drive_link && (
                            <a href={job.drive_link} target="_blank" rel="noreferrer" className="text-admin-accent hover:underline flex items-center gap-1">
                              View in Drive <ExternalLink size={14} />
                            </a>
                          )}
                          {job.status === 'failed' && (
                            <span className="text-admin-danger" title={job.error_message}>Error occurred</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <Button 
                    onClick={() => handleTriggerExport('monthly-data')} 
                    isLoading={triggeringExport === 'monthly-data'}
                    disabled={triggeringExport !== null || exportJobs.find(j => j.type === 'monthly-data')?.status === 'running'}
                  >
                    Export {exportMonth} Data
                  </Button>
                </div>

                {/* Attendance Reports */}
                <div className="border border-admin-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-admin-text-primary">Attendance Reports Export</h3>
                    <p className="text-sm text-admin-text-secondary mt-1 max-w-md">
                      Generates an individual Excel attendance report for each staff member.
                    </p>
                    {(() => {
                      const job = exportJobs.find(j => j.type === 'attendance-report');
                      if (!job) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 text-sm">
                          <StatusBadge status={job.status === 'running' ? 'In Progress' : job.status === 'success' ? 'Completed' : 'Cancelled'} />
                          <span className="text-admin-text-secondary">
                            {formatDate(job.started_at)}
                          </span>
                          {job.status === 'success' && job.drive_link && (
                            <a href={job.drive_link} target="_blank" rel="noreferrer" className="text-admin-accent hover:underline flex items-center gap-1">
                              View in Drive <ExternalLink size={14} />
                            </a>
                          )}
                          {job.status === 'failed' && (
                            <span className="text-admin-danger" title={job.error_message}>Error occurred</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <Button 
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
