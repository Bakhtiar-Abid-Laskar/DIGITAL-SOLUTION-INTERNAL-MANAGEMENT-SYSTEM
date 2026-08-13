"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Job } from '@repairshop/shared';
import dynamic from 'next/dynamic';

const JobsPieChart = dynamic(() => import('@/components/dashboard/JobsPieChart'), { ssr: false });
import { useAppConfig } from "@/context/AppConfigContext";
import { Briefcase, CheckCircle, Users, AlertCircle, RefreshCw, BarChart2, Bell, PlusCircle, Receipt, Boxes } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { LoadingState, CardSkeleton, TableSkeleton } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from 'next/link';

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { profile } = useAuth();
  const { getJobStatusColor } = useAppConfig();
  
  const [stats, setStats] = useState({
    jobsToday: 0,
    completedThisWeek: 0,
    activeTechs: 0,
    pendingApprovals: 0
  });

  const [pieData, setPieData] = useState<{name: string, value: number, color: string}[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [alerts, setAlerts] = useState<{id: string, text: string, type: 'urgent' | 'warning' | 'info', time: string}[]>([]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
    
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      weekAgo.setHours(0,0,0,0);

      // Execute all 7 dashboard queries in parallel
      const [
        jobsTodayRes,
        completedWeekRes,
        activeTechsRes,
        pendingUsersRes,
        inventoryRes,
        recentJobsRes,
        todaysJobsRes
      ] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'Completed').gte('completed_at', weekAgo.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'technician').eq('is_active', true),
        supabase.from('users').select('name, role', { count: 'exact' }).eq('is_active', false),
        supabase.rpc('get_low_stock_items'),
        supabase.from('jobs').select(`*, technician:users!jobs_technician_id_fkey(name)`).order('created_at', { ascending: false }).limit(10),
        supabase.from('jobs').select('status').gte('created_at', today.toISOString())
      ]);

      const jobsTodayCount = jobsTodayRes.count;
      const completedWeekCount = completedWeekRes.count;
      const activeTechsCount = activeTechsRes.count;
      const pendingCount = pendingUsersRes.count;
      const pendingUsers = pendingUsersRes.data;
      const allInventory = inventoryRes.data;
      const recent = recentJobsRes.data;
      const todaysJobs = todaysJobsRes.data;

      setStats({
        jobsToday: jobsTodayCount || 0,
        completedThisWeek: completedWeekCount || 0,
        activeTechs: activeTechsCount || 0,
        pendingApprovals: pendingCount || 0
      });

      // Alerts generation
      const newAlerts = [];
      if (pendingUsers && pendingUsers.length > 0) {
        newAlerts.push({
          id: 'alert-pending',
          text: `${pendingUsers.length} pending user approval(s) require attention.`,
          type: 'warning' as const,
          time: 'Just now'
        });
      }
      // Inventory low-stock alerts
      if (allInventory) {
        allInventory.forEach((item: any) => {
          newAlerts.push({
            id: `alert-inv-${item.product_name}`,
            text: `Low stock: ${item.product_name} (${item.quantity_cached} left).`,
            type: 'info' as const,
            time: 'Active'
          });
        });
      }
      setAlerts(newAlerts);

      // Recent Jobs
      if (recent) setRecentJobs(recent as any);

      // Pie Chart Data
      if (todaysJobs) {
        const counts = todaysJobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const newPieData = Object.entries(counts).map(([statusName, count]) => ({
          name: statusName,
          value: count,
          color: getJobStatusColor(statusName)
        }));

        setPieData(newPieData);
      }
    
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel(`admin-overview-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading && !refreshing) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-[24px] bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <ErrorState 
        message={error || 'Failed to load dashboard statistics.'} 
        onRetry={fetchDashboardData} 
      />
    );
  }

  // Calculate real date labels for today
  const todayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-admin-accent to-admin-accent-dark rounded-[24px] p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-white/5 skew-x-12 translate-x-16 pointer-events-none" />
        
        <div className="relative z-10 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, {profile?.name || 'Admin'}</h1>
          <p className="text-white/80">Here's what's happening in your shop today.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20" leftIcon={<PlusCircle size={16} />} onClick={() => router.push('/jobs/new')}>
            Create Job
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20" leftIcon={<Receipt size={16} />} onClick={() => router.push('/sales/new')}>
            Create Sale
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20" leftIcon={<Boxes size={16} />} onClick={() => router.push('/materials')}>
            Materials
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20" leftIcon={<RefreshCw size={16} />} onClick={handleRefresh} isLoading={refreshing}>
            Refresh
          </Button>
          <div className="hidden lg:flex w-10 h-10 rounded-full bg-white/10 items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Jobs Today" value={stats.jobsToday} icon={Briefcase} variant="accent" />
        <StatCard title="Completed This Week" value={stats.completedThisWeek} icon={CheckCircle} variant="success" />
        <StatCard title="Active Technicians" value={stats.activeTechs} icon={Users} variant="purple" />
        <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={AlertCircle} variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Alerts Module */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-admin-text-muted">No pending alerts.</div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="flex gap-3 p-3 rounded-xl bg-admin-bg-subtle">
                    <div className="shrink-0 mt-0.5">
                      {alert.type === 'warning' && <AlertCircle className="text-admin-warning" size={18} />}
                      {alert.type === 'info' && <Bell className="text-admin-progress-fg" size={18} />}
                      {alert.type === 'urgent' && <AlertCircle className="text-admin-danger" size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-admin-text-primary leading-tight">{alert.text}</p>
                      <p className="text-xs text-admin-text-muted mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Jobs Overview ({todayLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative flex items-center justify-center">
              {pieData.length === 0 ? (
                <div className="text-admin-text-muted text-center">No jobs created today.</div>
              ) : (
                <JobsPieChart data={pieData} />
              )}
              {pieData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-admin-text-primary">{stats.jobsToday}</span>
                  <span className="text-xs text-admin-text-muted">Total</span>
                </div>
              )}
            </div>
            
            {/* Legend */}
            {pieData.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-xs font-medium text-admin-text-secondary">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Recent Jobs</CardTitle>
          <Link href="/jobs" className="text-sm font-medium text-admin-accent hover:text-admin-accent-dark transition-colors">
            View All &rarr;
          </Link>
        </CardHeader>
        <div className="overflow-x-auto table-scroll-shadow">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary border-y border-admin-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Job Code</th>
                <th scope="col" className="px-6 py-3 font-medium">Customer</th>
                <th scope="col" className="px-6 py-3 font-medium">Device</th>
                <th scope="col" className="px-6 py-3 font-medium">Technician</th>
                <th scope="col" className="px-6 py-3 font-medium">Status</th>
                <th scope="col" className="px-6 py-3 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-admin-text-muted">No recent jobs found.</td>
                </tr>
              ) : (
                recentJobs.map(job => (
                  <tr 
                    key={job.id} 
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="hover:bg-admin-bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-admin-text-primary">{job.job_code}</td>
                    <td className="px-6 py-4 text-admin-text-secondary">{job.customer_name}</td>
                    <td className="px-6 py-4 text-admin-text-secondary">{job.device_type}</td>
                    <td className="px-6 py-4 text-admin-text-secondary">{job.technician?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={job.priority} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, variant }: { title: string, value: number, icon: any, variant: 'accent' | 'success' | 'purple' | 'danger' }) {
  const variantStyles = {
    accent: "bg-admin-pending-bg text-admin-pending-fg border-admin-pending-fg/20",
    success: "bg-admin-completed-bg text-admin-completed-fg border-admin-completed-fg/20",
    purple: "bg-admin-progress-bg text-admin-progress-fg border-admin-progress-fg/20",
    danger: "bg-admin-urgent-bg text-admin-urgent-fg border-admin-urgent-fg/20"
  };

  return (
    <Card noAccentLine className="p-0 hover:-translate-y-1 transition-transform duration-200">
      <CardContent className="flex items-center gap-4">
        <div className={cn("p-4 rounded-[14px] border", variantStyles[variant])}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-admin-text-secondary font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-admin-text-primary">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
