"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { JobTypeItem } from "@/types/salary";
import { Plus, Edit2, Trash2, Tag, CheckCircle2, XCircle } from "lucide-react";
import JobTypeFormModal from "@/components/catalog/JobTypeFormModal";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { DataTable, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/common/DataTable";
import { Button } from "@/components/common/Button";
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

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search job types..."
        showClearButton={Boolean(searchQuery)}
        onClearFilters={() => setSearchQuery("")}
      />

      <DataTable
        isLoading={loading}
        skeletonRows={5}
        skeletonCols={5}
        isEmpty={filtered.length === 0}
        emptyState={
          <EmptyState
            icon={<Tag size={40} className="text-admin-text-muted" />}
            heading="No job types found"
            subtext="Create a new job type to enable automatic customer charge and incentive accrual."
          />
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Job Type Title</TableHeaderCell>
            <TableHeaderCell>Base Customer Charge</TableHeaderCell>
            <TableHeaderCell>Technician Incentive</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {filtered.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-bold text-admin-text-primary">
                {item.title}
              </TableCell>
              <TableCell className="font-semibold text-admin-accent">
                {currency.format(item.customer_charge_amount || 0)}
              </TableCell>
              <TableCell className="font-medium text-admin-success">
                +{currency.format(item.technician_incentive || 0)}
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    item.is_active
                      ? 'bg-admin-completed-bg text-admin-completed-fg border-admin-completed-fg/30'
                      : 'bg-admin-urgent-bg text-admin-urgent-fg border-admin-urgent-fg/30'
                  }`}
                >
                  {item.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {item.is_active ? 'Active' : 'Inactive'}
                </button>
              </TableCell>
              <TableCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => { setEditingItem(item); setShowModal(true); }}
                    className="p-1.5 text-admin-text-secondary hover:text-admin-accent hover:bg-admin-bg-subtle rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                    title="Edit Job Type"
                    aria-label="Edit Job Type"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-1.5 text-admin-text-secondary hover:text-admin-danger hover:bg-admin-urgent-bg/20 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                    title="Delete Job Type"
                    aria-label="Delete Job Type"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>

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
