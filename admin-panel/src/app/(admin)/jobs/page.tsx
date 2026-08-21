"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Job, User, useDebounceValue } from '@repairshop/shared';
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Tabs } from "@/components/common/Tabs";
import { Pagination } from "@/components/common/Pagination";
import { DataTableSkeleton } from "@/components/common/Skeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import ReassignTechnicianModal from "@/components/jobs/ReassignTechnicianModal";
import { PlusCircle, Search, Download, Briefcase, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { exportJobsToCSV } from "@/utils/csv";
import { formatDate } from "@/utils/formatDate";

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Counts for tabs
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "All");
  const [techFilter, setTechFilter] = useState(() => searchParams.get("technician") || "All");
  const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get("priority") || "All");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals/Drawers
  const [reassignJob, setReassignJob] = useState<Job | null>(null);

  const fetchTabCounts = useCallback(async () => {
    try {
      const [allRes, recRes, progRes, compRes, waitRes, delivRes, cancelRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Waiting for Materials'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Delivered'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Cancelled'),
      ]);

      setStatusCounts({
        'Received': recRes.count || 0,
        'In Progress': progRes.count || 0,
        'Completed': compRes.count || 0,
        'Waiting for Materials': waitRes.count || 0,
        'Delivered': delivRes.count || 0,
        'Cancelled': cancelRes.count || 0,
      });
      setTotalCount(allRes.count || 0);
    } catch (err) {
      console.error('Error fetching tab counts:', err);
    }
  }, []);

  const fetchJobs = useCallback(async (cancelled = false) => {
    try {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
      let query = supabase.from('jobs').select(`
        *,
        technician:users!jobs_technician_id_fkey(name),
        job_technicians(technician_id, removed_at, technician:users!job_technicians_technician_id_fkey(name))
      `, { count: 'exact' }).order('created_at', { ascending: false });

      if (statusFilter === "active") query = query.in('status', ['Received', 'In Progress', 'Waiting for Materials']);
      else if (statusFilter !== "All") query = query.eq('status', statusFilter);
      if (techFilter !== "All") query = query.or(`technician_id.eq.${techFilter},job_technicians.technician_id.eq.${techFilter}`);
      if (priorityFilter !== "All") query = query.eq('priority', priorityFilter);
      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte('created_at', to.toISOString());
      }
      
      if (debouncedSearchQuery) {
        query = query.or(`job_code.ilike.%${debouncedSearchQuery}%,customer_name.ilike.%${debouncedSearchQuery}%,customer_contact.ilike.%${debouncedSearchQuery}%,reported_issue.ilike.%${debouncedSearchQuery}%,remarks.ilike.%${debouncedSearchQuery}%,work_notes.ilike.%${debouncedSearchQuery}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;
      if (cancelled) return;
      if (queryError) throw queryError;
      
      if (data) setJobs(data as any);
      if (count !== null) setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: any) {
      if (cancelled) return;
      console.error(err);
      setError(err.message || 'Failed to fetch jobs.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, techFilter, priorityFilter, dateFrom, dateTo, debouncedSearchQuery, currentPage]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'technician')
        .eq('is_active', true);
      if (error) throw error;
      if (data) setTechnicians(data as User[]);
    } catch (err) {
      console.error('Failed to fetch technicians', err);
    }
  }, []);

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "All");
    setTechFilter(searchParams.get("technician") || "All");
    setPriorityFilter(searchParams.get("priority") || "All");
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    fetchTechnicians();
    fetchTabCounts();
  }, [fetchTechnicians, fetchTabCounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, techFilter, priorityFilter, debouncedSearchQuery, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetchJobs(cancelled);
    
    const channel = supabase.channel('admin-joblist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchJobs();
        fetchTabCounts();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchJobs, fetchTabCounts]);

  const handleExportCSV = () => {
    exportJobsToCSV(jobs);
  };

  const openJobDetail = (job: Job) => {
    router.push(`/jobs/${job.id}`);
  };

  const openReassign = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setReassignJob(job);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setTechFilter('All');
    setPriorityFilter('All');
    setStatusFilter('All');
  };

  const tabItems = [
    { id: "All", label: `All (${totalCount})` },
    { id: "active", label: `Open (${(statusCounts['Received'] || 0) + (statusCounts['In Progress'] || 0) + (statusCounts['Waiting for Materials'] || 0)})` },
    { id: "Received", label: `Received (${statusCounts['Received'] || 0})` },
    { id: "In Progress", label: `In Progress (${statusCounts['In Progress'] || 0})` },
    { id: "Waiting for Materials", label: `Waiting (${statusCounts['Waiting for Materials'] || 0})` },
    { id: "Completed", label: `Completed (${statusCounts['Completed'] || 0})` },
    { id: "Delivered", label: `Delivered (${statusCounts['Delivered'] || 0})` },
    { id: "Cancelled", label: `Cancelled (${statusCounts['Cancelled'] || 0})` },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Jobs Management" 
        description="View and manage all customer repair jobs."
        actions={
          <div className="flex items-center gap-3">
            <Button size="sm" leftIcon={<PlusCircle size={15} />} onClick={() => router.push('/jobs/new')}>
              Create Job
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Download size={15} />} onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs 
        items={tabItems} 
        activeId={statusFilter} 
        onChange={setStatusFilter} 
      />

      {/* Filter Bar */}
      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-center justify-between bg-admin-bg-surface border border-admin-border rounded-lg shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
            <Input 
              placeholder="Search code, customer, contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              aria-label="Search jobs"
            />
          </div>

          <div className="w-44">
            <Select
              aria-label="Filter by Technician"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="h-10 text-sm"
            >
              <option value="All">All Technicians</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>

          <div className="w-36">
            <Select
              aria-label="Filter by Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 text-sm"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              aria-label="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 text-sm w-36"
              title="From Date"
            />
            <span className="text-xs text-admin-text-muted">to</span>
            <Input 
              type="date" 
              aria-label="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 text-sm w-36"
              title="To Date"
            />
          </div>

          {(searchQuery || techFilter !== 'All' || priorityFilter !== 'All' || dateFrom || dateTo || statusFilter !== 'All') && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} leftIcon={<X size={14} />} className="h-10">
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Main Table Content */}
      {loading ? (
        <DataTableSkeleton rows={6} cols={8} hasFilterBar={false} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchJobs} />
      ) : jobs.length === 0 ? (
        <EmptyState 
          icon={<Briefcase size={40} className="text-admin-text-muted" />}
          heading="No jobs found"
          subtext="No repair jobs match your current filter criteria."
          action={<Button variant="outline" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
        />
      ) : (
        <Card noAccentLine className="flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
          <div className="overflow-x-auto flex-1 table-scroll-shadow">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border sticky top-0 z-10 text-xs uppercase font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Job Code</th>
                  <th scope="col" className="px-6 py-3.5">Customer</th>
                  <th scope="col" className="px-6 py-3.5">Device</th>
                  <th scope="col" className="px-6 py-3.5">Technician</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Priority</th>
                  <th scope="col" className="px-6 py-3.5">Created</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
                {jobs.map((job) => (
                  <tr 
                    key={job.id} 
                    onClick={() => openJobDetail(job)}
                    className="hover:bg-admin-bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-xs text-admin-text-primary">{job.job_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-admin-text-primary">{job.customer_name}</div>
                      <div className="text-xs text-admin-text-muted">{job.customer_contact}</div>
                    </td>
                    <td className="px-6 py-4 text-admin-text-secondary">{job.device_type}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-admin-text-secondary text-xs">
                          {(() => {
                            const techNames = [
                              job.technician?.name,
                              ...(job.job_technicians || []).map((jt: any) => jt.technician?.name)
                            ].filter(Boolean);
                            const uniqueNames = Array.from(new Set(techNames));
                            return uniqueNames.length > 0 ? uniqueNames.join(', ') : 'Unassigned';
                          })()}
                        </span>
                        <button 
                          onClick={(e) => openReassign(e, job)}
                          className="text-xs text-admin-accent hover:underline font-semibold ml-1 cursor-pointer"
                        >
                          Reassign
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={job.priority} />
                    </td>
                    <td className="px-6 py-4 text-admin-text-muted text-xs">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openJobDetail(job)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-admin-border bg-admin-bg-surface">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* Reassign Modal */}
      {reassignJob && (
        <ReassignTechnicianModal 
          job={reassignJob}
          technicians={technicians}
          onClose={() => setReassignJob(null)}
          onSuccess={() => {
            setReassignJob(null);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}
