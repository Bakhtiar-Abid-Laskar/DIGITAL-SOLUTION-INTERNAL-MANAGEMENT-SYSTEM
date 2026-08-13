import React from 'react';
import { Card } from "@/components/common/Card";
import { Select } from "@/components/common/Select";
import { Tag } from "lucide-react";
import { JobTypeCatalogItem } from '@repairshop/shared';
import { formatCurrency } from '@repairshop/shared';
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';

interface ServiceCatalogCardProps {
  form: CreateJobFormState;
  catalogItems: JobTypeCatalogItem[];
  catalogLoading: boolean;
  onSelectServiceCatalog: (catalogId: string) => void;
}

export function ServiceCatalogCard({ form, catalogItems, catalogLoading, onSelectServiceCatalog }: ServiceCatalogCardProps) {
  return (
    <Card className="border border-admin-border">
      <div className="p-4 border-b border-admin-border flex items-center gap-2 bg-admin-bg-subtle/50 rounded-t-2xl">
        <Tag size={18} className="text-admin-accent" />
        <h3 className="text-base font-semibold text-admin-text-primary">Service Catalog & Type</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Type Catalog</label>
          <Select 
            value={form.job_type_ref_id}
            onChange={(e) => onSelectServiceCatalog(e.target.value)}
            disabled={catalogLoading}
          >
            <option value="">-- Custom / Generic Service Repair --</option>
            {catalogItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.title} ({formatCurrency(item.customer_charge_amount)})
              </option>
            ))}
          </Select>
        </div>

        {form.job_type_title ? (
          <div className="bg-admin-completed-bg/40 border border-admin-completed-fg/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-admin-text-secondary font-medium">Selected Service:</span>
              <span className="font-bold text-admin-text-primary">{form.job_type_title}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-admin-text-secondary font-medium">Base Service Charge:</span>
              <span className="font-bold text-admin-completed-fg">{formatCurrency(form.customer_charge_amount)}</span>
            </div>
            <div className="border-t border-admin-border/50 pt-2 flex items-center justify-between text-xs text-admin-text-muted">
              <span>Tech Incentive</span>
              <span>{formatCurrency(form.snap_technician_incentive)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-admin-bg-subtle/60 border border-admin-border rounded-xl p-4 text-xs text-admin-text-muted">
            Select a pre-configured service catalog item to automatically record standard customer pricing and staff incentives.
          </div>
        )}
      </div>
    </Card>
  );
}
