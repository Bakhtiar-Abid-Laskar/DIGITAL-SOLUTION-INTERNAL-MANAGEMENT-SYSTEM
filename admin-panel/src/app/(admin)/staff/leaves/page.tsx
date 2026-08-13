"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/common/Badge";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { CalendarX, Check, X } from "lucide-react";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";

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
        description="Manage employee leave requests."
      />

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Employee</th>
                <th scope="col" className="px-6 py-4 font-medium">Leave Date</th>
                <th scope="col" className="px-6 py-4 font-medium">Reason</th>
                <th scope="col" className="px-6 py-4 font-medium">Status</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <LoadingState message="Loading leaves..." />
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState 
                      icon={<CalendarX size={40} className="text-admin-text-muted" />}
                      heading="No leave requests"
                      subtext="There are currently no leave requests to manage."
                      asCard={false}
                    />
                  </td>
                </tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-admin-bg-hover transition-colors">
                    <td className="px-6 py-4 font-medium text-admin-text-primary">{leave.user?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-admin-text-secondary">{new Date(leave.leave_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-admin-text-secondary max-w-[200px] truncate" title={leave.reason}>{leave.reason || '-'}</td>
                    <td className="px-6 py-4">
                      {leave.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                      {leave.status === 'approved' && <Badge variant="success">Approved</Badge>}
                      {leave.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {leave.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(leave.id, 'approved')}
                            className="p-2 text-admin-completed-fg bg-admin-completed-bg hover:opacity-80 rounded-md transition-colors inline-flex items-center justify-center"
                            title="Approve Leave"
                            aria-label="Approve Leave"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                            className="p-2 text-admin-danger bg-admin-danger-dim hover:bg-admin-danger hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                            title="Reject Leave"
                            aria-label="Reject Leave"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
