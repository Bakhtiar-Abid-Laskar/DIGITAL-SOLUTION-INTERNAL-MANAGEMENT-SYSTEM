import React from 'react';
import { Card } from "@/components/common/Card";
import { Select } from "@/components/common/Select";
import { Textarea } from "@/components/common/Textarea";
import { Laptop } from "lucide-react";
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';

interface DeviceIssueCardProps {
  form: CreateJobFormState;
  errors: Record<string, string>;
  onChange: (field: keyof CreateJobFormState, value: any) => void;
}

export function DeviceIssueCard({ form, errors, onChange }: DeviceIssueCardProps) {
  return (
    <Card className="border border-admin-border md:col-span-2">
      <div className="p-4 border-b border-admin-border flex items-center gap-2 bg-admin-bg-subtle/50 rounded-t-2xl">
        <Laptop size={18} className="text-admin-accent" />
        <h3 className="text-base font-semibold text-admin-text-primary">Device & Problem Description</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Device Category *</label>
          <Select 
            value={form.device_type}
            onChange={(e) => onChange('device_type', e.target.value)}
          >
            <option value="Laptop">Laptop</option>
            <option value="PC">Desktop PC</option>
            <option value="Other">Other Electronic Device</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Reported Issue *</label>
          <Textarea 
            value={form.reported_issue}
            onChange={(e) => onChange('reported_issue', e.target.value)}
            className={errors.reported_issue ? 'border-admin-urgent-fg' : ''}
            rows={3}
            placeholder="Describe the problem reported by the customer..."
          />
          {errors.reported_issue && <p className="text-xs text-admin-urgent-fg mt-1">{errors.reported_issue}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Remarks & Physical Condition</label>
          <Textarea 
            value={form.remarks}
            onChange={(e) => onChange('remarks', e.target.value)}
            rows={2}
            placeholder="Scratches, missing screws, included charger, serial numbers..."
          />
        </div>
      </div>
    </Card>
  );
}
