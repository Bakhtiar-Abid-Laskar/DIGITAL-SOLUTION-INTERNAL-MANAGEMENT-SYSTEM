import React from 'react';
import { Card } from "@/components/common/Card";
import { Select } from "@/components/common/Select";
import { Button } from "@/components/common/Button";
import { Wrench, PlusCircle } from "lucide-react";
import { User } from '@repairshop/shared';
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';

interface AssignmentCardProps {
  form: CreateJobFormState;
  technicians: User[];
  loading: boolean;
  onChange: (field: keyof CreateJobFormState, value: any) => void;
}

export function AssignmentCard({ form, technicians, loading, onChange }: AssignmentCardProps) {
  return (
    <Card className="border border-admin-border md:col-span-2">
      <div className="p-4 border-b border-admin-border flex items-center gap-2 bg-admin-bg-subtle/50 rounded-t-2xl">
        <Wrench size={18} className="text-admin-accent" />
        <h3 className="text-base font-semibold text-admin-text-primary">Assignment & Logistics</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Service Location</label>
          <Select 
            value={form.job_type}
            onChange={(e) => onChange('job_type', e.target.value)}
          >
            <option value="Inhouse">Inhouse (Workshop)</option>
            <option value="Onsite">Onsite Visit</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Priority Level</label>
          <Select 
            value={form.priority}
            onChange={(e) => onChange('priority', e.target.value)}
          >
            <option value="Normal">Normal Priority</option>
            <option value="High">High Priority</option>
            <option value="Urgent">Urgent Priority</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-text-secondary mb-1">Assign Technicians</label>
          <div className="border border-admin-border rounded-lg bg-admin-bg p-2 max-h-40 overflow-y-auto space-y-1">
            {technicians.length === 0 && (
              <div className="text-sm text-admin-text-muted p-2">No active technicians available.</div>
            )}
            {technicians.map(tech => {
              const isSelected = form.technician_ids?.includes(tech.id);
              return (
                <label key={tech.id} className="flex items-center gap-2 p-2 rounded hover:bg-admin-bg-subtle cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-admin-border text-admin-accent focus:ring-admin-accent bg-admin-bg"
                    checked={isSelected}
                    onChange={(e) => {
                      const newIds = e.target.checked 
                        ? [...(form.technician_ids || []), tech.id]
                        : (form.technician_ids || []).filter(id => id !== tech.id);
                      onChange('technician_ids', newIds);
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-admin-text-primary">{tech.name}</span>
                    {(tech.phone || tech.email) && (
                      <span className="text-xs text-admin-text-secondary">{tech.phone || tech.email}</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-admin-bg-subtle border-t border-admin-border flex items-center justify-between p-6 rounded-b-2xl">
        <span className="text-xs text-admin-text-muted">
          Initial status will be set to <span className="font-semibold text-admin-text-primary">Received</span>.
        </span>
        <Button type="submit" leftIcon={<PlusCircle size={18} />} isLoading={loading}>
          Register & Create Job
        </Button>
      </div>
    </Card>
  );
}
