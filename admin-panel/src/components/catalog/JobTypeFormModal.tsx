"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { JobTypeItem } from '@/types/salary';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { X, Tag } from 'lucide-react';

interface Props {
  item: JobTypeItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JobTypeFormModal({ item, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: item?.title || '',
    customer_charge_amount: item?.customer_charge_amount?.toString() || '0',
    technician_incentive: item?.technician_incentive?.toString() || '0',
    is_active: item ? item.is_active : true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const title = form.title.trim();
    if (!title) {
      setError('Title is required');
      return;
    }

    const customerCharge = parseFloat(form.customer_charge_amount);
    const technicianIncentive = parseFloat(form.technician_incentive);

    if (isNaN(customerCharge) || customerCharge < 0) {
      setError('Customer charge amount must be a non-negative number');
      return;
    }
    if (isNaN(technicianIncentive) || technicianIncentive < 0) {
      setError('Technician incentive must be a non-negative number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        customer_charge_amount: customerCharge,
        technician_incentive: technicianIncentive,
        is_active: form.is_active,
      };

      if (item) {
        const { error: err } = await supabase
          .from('job_types')
          .update(payload)
          .eq('id', item.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase
          .from('job_types')
          .insert(payload);
        if (err) throw new Error(err.message);
      }

      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save Job Type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/70 backdrop-blur-sm">
      <div className="bg-admin-bg-surface border border-admin-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border bg-admin-bg-subtle">
          <div className="flex items-center gap-2 text-admin-text-primary font-bold text-lg">
            <Tag size={20} className="text-admin-accent" />
            <span>{item ? 'Edit Job Type' : 'Add New Job Type'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-admin-text-muted hover:text-admin-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-admin-danger-dim border border-admin-danger/20 text-admin-danger rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Title / Service Name *
            </label>
            <Input
              type="text"
              placeholder="e.g. Screen Replacement, OS Formatting"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Base Customer Charge (₹) *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.customer_charge_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, customer_charge_amount: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">
              Technician Incentive (₹)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.technician_incentive}
              onChange={(e) => setForm((prev) => ({ ...prev, technician_incentive: e.target.value }))}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-admin-border text-admin-accent focus:ring-admin-accent h-4 w-4"
            />
            <label htmlFor="is_active" className="text-sm text-admin-text-primary select-none cursor-pointer">
              Active (Available in job intake dropdowns)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-admin-border">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : item ? 'Update Job Type' : 'Create Job Type'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
