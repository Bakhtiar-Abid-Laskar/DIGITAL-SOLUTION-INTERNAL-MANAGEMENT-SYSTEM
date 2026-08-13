"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { JobTypeItem } from "@/types/salary";
import { Plus, Edit2, Trash2, Tag, Search, CheckCircle2, XCircle } from "lucide-react";
import JobTypeFormModal from "@/components/catalog/JobTypeFormModal";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export default function JobTypesPage() {
  const [jobTypes, setJobTypes] = useState<JobTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<JobTypeItem | null>(null);

  const { showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchJobTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_types')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setJobTypes(data as JobTypeItem[]);
    } catch (err: unknown) {
      console.error(err);
      showToast('Failed to fetch job types.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = async (item: JobTypeItem) => {
    try {
      const { error } = await supabase
        .from('job_types')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);
      if (error) throw error;
      showToast(`Job type "${item.title}" updated successfully.`, 'success');
      fetchJobTypes();
    } catch (err: unknown) {
      console.error(err);
      showToast('Failed to update status.', 'error');
    }
  };

  const handleDelete = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Job Type',
      message: `Are you sure you want to delete "${title}"? This cannot be undone. You can also deactivate it instead.`,
      onConfirm: async () => {
        const { error } = await supabase.from('job_types').delete().eq('id', id);
        if (error) {
          showToast('Failed to delete job type.', 'error');
        } else {
          showToast('Job type deleted successfully.', 'success');
          fetchJobTypes();
        }
        setConfirmModal(null);
      }
    });
  };

  const filtered = jobTypes.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Job Types Catalog"
        description="Configure base customer charges and technician incentive rates for repair job types."
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => { setEditingItem(null); setShowModal(true); }}>
            Add Job Type
          </Button>
        }
      />

      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-center justify-between bg-admin-bg-surface">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
          <Input
            type="text"
            placeholder="Search job types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1 table-scroll-shadow">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Job Type Title</th>
                <th scope="col" className="px-6 py-4 font-medium">Base Customer Charge</th>
                <th scope="col" className="px-6 py-4 font-medium">Technician Incentive</th>
                <th scope="col" className="px-6 py-4 font-medium">Status</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <LoadingState message="Loading job types catalog..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Tag size={40} className="text-admin-text-muted" />}
                      heading="No job types found"
                      subtext="Create a new job type to enable automatic customer charge and incentive accrual."
                      asCard={false}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="transition-colors hover:bg-admin-bg-hover">
                    <td className="px-6 py-4 font-bold text-admin-text-primary">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 font-semibold text-admin-accent">
                      {currency.format(item.customer_charge_amount || 0)}
                    </td>
                    <td className="px-6 py-4 font-medium text-admin-success">
                      +{currency.format(item.technician_incentive || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          item.is_active
                            ? 'bg-admin-success-dim text-admin-success border-admin-success/30'
                            : 'bg-admin-danger-dim text-admin-danger border-admin-danger/30'
                        }`}
                      >
                        {item.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {item.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => { setEditingItem(item); setShowModal(true); }}
                        className="p-2 text-admin-accent bg-admin-accent-dim hover:bg-admin-accent hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                        title="Edit Job Type"
                        aria-label="Edit Job Type"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-2 text-admin-danger bg-admin-danger-dim hover:bg-admin-danger hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                        title="Delete Job Type"
                        aria-label="Delete Job Type"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <JobTypeFormModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowModal(false); setEditingItem(null); fetchJobTypes(); }}
        />
      )}

      {confirmModal?.isOpen && (
        <ConfirmationModal
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={true}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
