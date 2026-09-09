"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User, useDebounceValue } from '@repairshop/shared';
import { Check, Ban, CalendarDays, Users, Plus, Trash2 } from "lucide-react";
import Link from 'next/link';
import { AddStaffModal } from "@/components/staff/AddStaffModal";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Select } from "@/components/common/Select";
import { DataTableSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useAppConfig } from "@/context/AppConfigContext";
import { Pagination } from "@/components/common/Pagination";
import { formatDate } from "@/utils/formatDate";
import { parseEdgeFunctionError } from "@/lib/edgeFunctions";

export default function StaffPage() {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { config } = useAppConfig();
  
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  const { showToast } = useToast();
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  const fetchStaff = useCallback(async (cancelled = false) => {
    if (!cancelled) setLoading(true);
    try {
      let query = supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false });

      if (roleFilter !== "All") query = query.eq('role', roleFilter);
      if (statusFilter === "Active") query = query.eq('is_active', true);
      if (statusFilter === "Inactive" || statusFilter === "Pending/Blocked") query = query.eq('is_active', false);
      if (debouncedSearchQuery) {
        query = query.or(`name.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (cancelled) return;
      if (error) throw error;
      if (data) setStaff(data as User[]);
      if (count !== null) setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: any) {
      if (cancelled) return;
      console.error(err);
      showToast('Failed to fetch staff data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, debouncedSearchQuery, currentPage, showToast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchStaff(cancelled);
    };
    run();
    return () => { cancelled = true; };
  }, [fetchStaff]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  const handleApprove = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Activate Staff Member',
      message: `Are you sure you want to activate ${name}? They will regain login access to the system.`,
      isDestructive: false,
      onConfirm: async () => {
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_manage_staff_status', {
            p_user_id: id,
            p_action: 'activate',
          });

          if (rpcErr) throw new Error(rpcErr.message);
          if (rpcData?.error) throw new Error(rpcData.error);

          showToast(`${name} has been activated successfully.`, 'success');
          fetchStaff();
        } catch (err: any) {
          console.error(err);
          showToast(`Failed to activate staff: ${err.message}`, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeactivate = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Deactivate Staff Member',
      message: `Are you sure you want to deactivate ${name}? Their login access will be immediately revoked, and they will no longer appear in job assignment pickers. All past jobs, payments, attendance, and financial history will remain intact.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_manage_staff_status', {
            p_user_id: id,
            p_action: 'deactivate',
          });

          if (rpcErr) throw new Error(rpcErr.message);
          if (rpcData?.error) throw new Error(rpcData.error);

          showToast(`${name} has been deactivated and login access revoked.`, 'success');
          fetchStaff();
        } catch (err: any) {
          console.error(err);
          showToast(`Failed to deactivate staff: ${err.message}`, 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Staff Member',
      message: `Are you sure you want to permanently delete ${name}? This will hard-delete their account immediately. Any jobs, payments, or attendance records they are linked to will be preserved — their name will simply be cleared from those records. This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        // Dismiss modal immediately for snappy UX
        setConfirmModal(null);
        try {
          const { data, error } = await supabase.functions.invoke('admin-delete-user', {
            body: { userId: id, action: 'delete' }
          });

          if (error) {
            const errorMsg = await parseEdgeFunctionError(error, `Failed to process ${name}`);
            throw new Error(errorMsg);
          }

          if (data?.error) {
            throw new Error(data.error);
          }

          // Remove from local state immediately (optimistic update)
          setStaff(prev => prev.filter(s => s.id !== id));
          showToast(data?.message || `${name} has been permanently deleted.`, 'success');
          // Background re-sync with server
          fetchStaff();
        } catch (err: any) {
          console.error(err);
          showToast(`Action failed: ${err.message}`, 'error');
          fetchStaff(); // Re-fetch to restore correct state on failure
        }
      }
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Staff Management" 
        description="Manage your team, their roles, and approve access."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/staff/leaves'} leftIcon={<CalendarDays size={15} />}>
              Leave Requests
            </Button>
            <Button size="sm" onClick={() => setIsAddStaffOpen(true)} leftIcon={<Plus size={15} />}>
              Add Staff
            </Button>
          </div>
        }
      />

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search staff by name or email..."
        showClearButton={Boolean(searchQuery || roleFilter !== 'All' || statusFilter !== 'All')}
        onClearFilters={() => {
          setSearchQuery("");
          setRoleFilter("All");
          setStatusFilter("All");
        }}
      >
        <div className="w-40">
          <Select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 text-sm"
            aria-label="Filter by Role"
          >
            <option value="All">All Roles</option>
            {config.roles.map(r => (
              <option key={r.id} value={r.id}>{r.id.charAt(0).toUpperCase() + r.id.slice(1)}</option>
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 text-sm"
            aria-label="Filter by Status"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Staff</option>
            <option value="Inactive">Inactive Staff</option>
          </Select>
        </div>
      </SearchFilterBar>

      <AddStaffModal 
        isOpen={isAddStaffOpen} 
        onClose={() => setIsAddStaffOpen(false)} 
        onSuccess={fetchStaff} 
      />

      {loading ? (
        <DataTableSkeleton rows={6} cols={6} hasFilterBar={false} />
      ) : (
        <Card noAccentLine className="flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
          <div className="overflow-x-auto flex-1 table-scroll-shadow">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Name</th>
                  <th scope="col" className="px-6 py-3.5">Contact</th>
                  <th scope="col" className="px-6 py-3.5">Role</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Joined</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
                {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState 
                      icon={<Users size={48} />}
                      heading="No staff members found"
                      subtext="Try adjusting your filters or search."
                      asCard={false}
                    />
                  </td>
                </tr>
              ) : (
                staff.map(user => (
                  <tr key={user.id} className="hover:bg-admin-bg-hover transition-colors">
                    <td className="px-6 py-4 font-semibold text-admin-text-primary">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-admin-accent-dim text-admin-accent border border-admin-accent/20 flex items-center justify-center font-bold text-xs">
                          {user.name[0]?.toUpperCase() || 'U'}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-admin-text-secondary">
                      <div className="text-admin-text-primary text-xs font-medium">{user.email}</div>
                      <div className="text-xs text-admin-text-muted">{user.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-admin-text-secondary">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-admin-bg-subtle text-admin-text-secondary border border-admin-border text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="warning">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-admin-text-muted text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link 
                          href={`/attendance?search=${encodeURIComponent(user.name)}`}
                          className="p-1.5 text-admin-text-secondary hover:text-admin-accent hover:bg-admin-bg-subtle rounded-md transition-colors inline-flex items-center justify-center"
                          title="View Attendance"
                          aria-label="View Attendance"
                        >
                          <CalendarDays size={16} />
                        </Link>
                        
                        {user.is_active ? (
                          <button 
                            onClick={() => handleDeactivate(user.id, user.name)}
                            className="p-1.5 text-admin-text-secondary hover:text-admin-urgent-fg hover:bg-admin-urgent-bg/30 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Deactivate Staff"
                            aria-label="Deactivate Staff"
                          >
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleApprove(user.id, user.name)}
                            className="p-1.5 text-admin-text-secondary hover:text-admin-completed-fg hover:bg-admin-completed-bg/30 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Activate Staff"
                            aria-label="Activate Staff"
                          >
                            <Check size={15} />
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-1.5 text-admin-text-secondary hover:text-admin-danger hover:bg-admin-urgent-bg/30 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Delete Staff"
                          aria-label="Delete Staff"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {staff.length > 0 && (
          <div className="p-4 border-t border-admin-border bg-admin-bg-surface">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>
      )}

      {confirmModal?.isOpen && (
        <ConfirmationModal
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={confirmModal.isDestructive}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
