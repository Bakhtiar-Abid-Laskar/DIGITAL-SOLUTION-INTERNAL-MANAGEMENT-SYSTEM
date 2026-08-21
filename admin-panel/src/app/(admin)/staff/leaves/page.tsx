"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/common/DataTable";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { CalendarX, Check, X } from "lucide-react";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { formatDate } from "@/utils/formatDate";

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_leave')
        .select(`
          *,
          user:users!user_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to fetch leaves data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  const handleUpdateStatus = (id: string, status: 'approved' | 'rejected') => {
    setConfirmModal({
      isOpen: true,
      title: `${status === 'approved' ? 'Approve' : 'Reject'} Leave`,
      message: `Are you sure you want to ${status} this leave request?`,
      isDestructive: status === 'rejected',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('employee_leave').update({ 
            status,
            approved_at: new Date().toISOString()
          }).eq('id', id);
          if (error) throw error;
          
          showToast(`Leave ${status} successfully.`, 'success');
          fetchLeaves();
        } catch (err: any) {
          showToast(err.message || 'Failed to update status', 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Leave Requests" 
        description="Manage and approve employee leave applications."
      />

      <DataTable
        isLoading={loading}
        skeletonRows={5}
        skeletonCols={5}
        isEmpty={leaves.length === 0}
        emptyState={
          <EmptyState 
            icon={<CalendarX size={40} className="text-admin-text-muted" />}
            heading="No leave requests"
            subtext="There are currently no leave requests to manage."
          />
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Leave Date</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {leaves.map(leave => (
            <TableRow key={leave.id}>
              <TableCell className="font-semibold text-admin-text-primary">
                {leave.user?.name || 'Unknown'}
              </TableCell>
              <TableCell className="text-admin-text-secondary text-xs">
                {formatDate(leave.leave_date)}
              </TableCell>
              <TableCell className="text-admin-text-secondary max-w-[240px] truncate" title={leave.reason}>
                {leave.reason || '-'}
              </TableCell>
              <TableCell>
                {leave.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                {leave.status === 'approved' && <Badge variant="success">Approved</Badge>}
                {leave.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
              </TableCell>
              <TableCell align="right">
                {leave.status === 'pending' && (
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => handleUpdateStatus(leave.id, 'approved')}
                      className="p-1.5 text-admin-completed-fg bg-admin-completed-bg hover:opacity-80 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer border border-admin-completed-fg/20"
                      title="Approve Leave"
                      aria-label="Approve Leave"
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                      className="p-1.5 text-admin-urgent-fg bg-admin-urgent-bg hover:opacity-80 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer border border-admin-urgent-fg/20"
                      title="Reject Leave"
                      aria-label="Reject Leave"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>

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
