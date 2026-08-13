"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User, useDebounceValue } from '@repairshop/shared';
import { Check, Ban, CalendarDays, Users, Plus, Search } from "lucide-react";
import Link from 'next/link';
import { AddStaffModal } from "@/components/staff/AddStaffModal";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Select } from "@/components/common/Select";
import { LoadingState, TableSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useAppConfig } from "@/context/AppConfigContext";
import { Pagination } from "@/components/common/Pagination";

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

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Staff Management" 
        description="Manage your team, their roles, and approve access."
        actions={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => window.location.href = '/staff/leaves'} className="flex items-center gap-2">
              <CalendarDays size={18} />
              Leave Requests
            </Button>
            <Button onClick={() => setIsAddStaffOpen(true)} className="flex items-center gap-2">
              <Plus size={18} />
              Add Staff
            </Button>
          </div>
        }
      />

      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="field-6mslou" className="block text-sm font-medium text-admin-text-secondary mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-admin-text-muted" size={16} />
            <Input id="field-6mslou" 
              placeholder="Search by Name or Email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-48">
          <label htmlFor="field-cfwuoy" className="block text-sm font-medium text-admin-text-secondary mb-1">Role</label>
          <Select id="field-cfwuoy" 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            {config.roles.map(r => (
              <option key={r.id} value={r.id}>{r.id.charAt(0).toUpperCase() + r.id.slice(1)}</option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <label htmlFor="field-e0eob9" className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
          <Select id="field-e0eob9" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending/Blocked">Pending/Blocked</option>
          </Select>
        </div>
        <Button variant="ghost" onClick={() => fetchStaff()} className="text-admin-accent hover:text-admin-accent-dark hover:bg-admin-accent-dim">
          Refresh
        </Button>
      </Card>

      <AddStaffModal 
        isOpen={isAddStaffOpen} 
        onClose={() => setIsAddStaffOpen(false)} 
        onSuccess={fetchStaff} 
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Name</th>
                  <th scope="col" className="px-6 py-4 font-medium">Contact</th>
                  <th scope="col" className="px-6 py-4 font-medium">Role</th>
                  <th scope="col" className="px-6 py-4 font-medium">Status</th>
                  <th scope="col" className="px-6 py-4 font-medium">Joined</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
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
                    <td className="px-6 py-4 font-medium text-admin-text-primary">{user.name}</td>
                    <td className="px-6 py-4 text-admin-text-secondary">
                      <div className="text-admin-text-primary">{user.email}</div>
                      <div className="text-xs">{user.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-admin-text-secondary">{user.role}</td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="warning">Pending/Blocked</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-admin-text-secondary">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link 
                        href={`/attendance?search=${encodeURIComponent(user.name)}`}
                        className="p-2 text-admin-accent bg-admin-accent-dim hover:bg-admin-accent hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                        title="View Attendance"
                        aria-label="View Attendance"
                      >
                        <CalendarDays size={18} />
                      </Link>
                      
                      {user.is_active ? (
                        <button 
                          onClick={() => handleBlock(user.id)}
                          className="p-2 text-admin-danger bg-admin-danger-dim hover:bg-admin-danger hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                          title="Block User"
                          aria-label="Block User"
                        >
                          <Ban size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleApprove(user.id)}
                          className="p-2 text-admin-accent bg-admin-accent/10 hover:bg-admin-accent hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                          title="Approve User"
                          aria-label="Approve User"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {staff.length > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
