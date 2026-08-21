"use client";

import React, { useState, useEffect } from 'react';
import { Job, JobMaterial } from '@repairshop/shared';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Badge } from '@/components/common/Badge';
import { useToast } from '@/components/common/ToastProvider';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@repairshop/shared';
import { Package, CheckCircle2, ArrowRight } from 'lucide-react';

interface MaterialReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  materials: JobMaterial[];
  onReconciled: (updatedJob: Job, updatedMaterials: JobMaterial[]) => void;
}

export function MaterialReconciliationModal({
  isOpen,
  onClose,
  job,
  materials,
  onReconciled,
}: MaterialReconciliationModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [workNotes, setWorkNotes] = useState(job.work_notes || '');
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});

  // Initialize usage map with added quantities
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      materials.forEach((m) => {
        const added = Number(m.added_qty ?? m.qty_taken ?? m.quantity ?? 1);
        initial[m.id] = Number(m.used_qty ?? added);
      });
      setUsageMap(initial);
      setWorkNotes(job.work_notes || '');
    }
  }, [isOpen, materials, job]);

  const handleQtyChange = (matId: string, maxQty: number, valueStr: string) => {
    const parsed = parseFloat(valueStr);
    if (isNaN(parsed)) {
      setUsageMap((prev) => ({ ...prev, [matId]: 0 }));
      return;
    }
    const clamped = Math.max(0, Math.min(maxQty, parsed));
    setUsageMap((prev) => ({ ...prev, [matId]: clamped }));
  };

  const handleSubmit = async () => {
    // Validate
    for (const m of materials) {
      const added = Number(m.added_qty ?? m.qty_taken ?? m.quantity ?? 1);
      const used = usageMap[m.id] ?? 0;
      if (used < 0 || used > added) {
        showToast(`Invalid quantity for ${m.material_name}. Must be between 0 and ${added}.`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const materialPayload = materials.map((m) => ({
        material_id: m.id,
        used_qty: usageMap[m.id] ?? 0,
      }));

      const { data, error } = await supabase.rpc('complete_job_materials', {
        p_job_id: job.id,
        p_materials: materialPayload,
        p_work_notes: workNotes.trim() || null,
        p_technician_id: job.technician_id || null,
      });

      if (error) throw error;

      showToast('Job marked as Completed and materials reconciled!', 'success');

      // Fetch fresh materials for this job
      const { data: freshMats } = await supabase
        .from('job_materials')
        .select('*')
        .eq('job_id', job.id);

      onReconciled(
        { ...job, status: 'Completed', completed_at: new Date().toISOString(), work_notes: workNotes },
        (freshMats || []) as JobMaterial[]
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to reconcile materials and complete job.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const techName = job.technician?.name || 'Assigned Technician';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-admin-completed-bg text-admin-completed-fg flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-admin-text-primary">Complete Job & Reconcile Materials</h3>
            <p className="text-xs text-admin-text-muted">Job {job.job_code} · {job.customer_name}</p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-admin-text-muted">
            Unused stock will move to <span className="font-semibold text-admin-text-primary">{techName}&apos;s</span> allocation holding.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={submitting}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Complete & Reconcile
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-admin-text-secondary">
          Confirm the exact quantity of each part used during this repair. Consumed parts will be billed to the customer; any remaining stock will be recorded as held by the technician until returned.
        </p>

        {materials.length === 0 ? (
          <div className="p-4 bg-admin-bg-subtle rounded-xl text-center text-sm text-admin-text-muted">
            No materials were logged for this job.
          </div>
        ) : (
          <div className="border border-admin-border rounded-xl overflow-hidden divide-y divide-admin-border">
            {materials.map((m) => {
              const added = Number(m.added_qty ?? m.qty_taken ?? m.quantity ?? 1);
              const used = usageMap[m.id] ?? added;
              const remaining = Math.max(0, added - used);

              return (
                <div key={m.id} className="p-4 bg-admin-bg-surface flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-admin-bg-subtle border border-admin-border flex items-center justify-center shrink-0 text-admin-text-secondary">
                      <Package size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-admin-text-primary truncate">{m.material_name}</h4>
                      <p className="text-xs text-admin-text-muted">
                        Unit Price: {formatCurrency(m.unit_cost)} · Added: <span className="font-semibold">{added}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-end">
                      <label className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider mb-1">
                        Quantity Used
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={added.toString()}
                          step="1"
                          value={used.toString()}
                          onChange={(e) => handleQtyChange(m.id, added, e.target.value)}
                          className="w-20 h-9 text-center font-bold text-sm"
                        />
                        <span className="text-xs text-admin-text-muted font-medium">/ {added}</span>
                      </div>
                    </div>

                    <div className="w-28 text-right flex flex-col items-end justify-center">
                      <span className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider mb-1">
                        Holding
                      </span>
                      {remaining > 0 ? (
                        <Badge variant="warning" className="text-xs font-semibold">
                          +{remaining} Unused
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">
                          0 Leftover
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
            Final Work Notes (Optional)
          </label>
          <Textarea
            rows={3}
            value={workNotes}
            onChange={(e) => setWorkNotes(e.target.value)}
            placeholder="Add any final technician notes or repair remarks..."
            className="text-sm"
          />
        </div>
      </div>
    </Modal>
  );
}
