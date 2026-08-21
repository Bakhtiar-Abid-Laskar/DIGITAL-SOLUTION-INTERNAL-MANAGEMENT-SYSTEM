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
      if (statusFilter !== "All") query = query.eq('is_active', statusFilter === "Active");
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

  const handleApprove = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve User',
      message: 'Are you sure you want to approve this user? They will gain access to the system.',
      isDestructive: false,
      onConfirm: async () => {
        const { error } = await supabase.from('users').update({ is_active: true }).eq('id', id);
        if (!error) fetchStaff();
        setConfirmModal(null);
      }
    });
  };

  const handleBlock = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Block User',
      message: 'Are you sure you want to block this user? They will lose access immediately.',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
        if (!error) fetchStaff();
        setConfirmModal(null);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Staff Permanently',
      message: `Are you absolutely sure you want to permanently delete ${name}? This action cannot be undone. Any past jobs or payments associated with them will remain in the system but will no longer show their name.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.functions.invoke('admin-delete-user', {
            body: { userId: id }
          });
          
          if (error) throw new Error(error.message);
          
          showToast(`Successfully deleted ${name}`, 'success');
          fetchStaff();
        } catch (err: any) {
          console.error(err);
          showToast(`Failed to delete user: ${err.message}`, 'error');
        } finally {
          setConfirmModal(null);
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
            <option value="Active">Active</option>
            <option value="Pending/Blocked">Pending/Blocked</option>
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
                        <Badge variant="warning">Pending/Blocked</Badge>
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
                            onClick={() => handleBlock(user.id)}
                            className="p-1.5 text-admin-text-secondary hover:text-admin-urgent-fg hover:bg-admin-urgent-bg/30 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Block User"
                            aria-label="Block User"
                          >
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleApprove(user.id)}
                            className="p-1.5 text-admin-text-secondary hover:text-admin-completed-fg hover:bg-admin-completed-bg/30 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Approve User"
                            aria-label="Approve User"
                          >
                            <Check size={15} />
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-1.5 text-admin-text-secondary hover:text-admin-danger hover:bg-admin-urgent-bg/30 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Delete Permanently"
                          aria-label="Delete Permanently"
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
