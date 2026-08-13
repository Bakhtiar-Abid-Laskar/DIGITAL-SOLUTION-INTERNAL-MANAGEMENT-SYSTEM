import React from 'react';
import { Job, User } from '@repairshop/shared';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Select } from "@/components/common/Select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Edit, Save } from "lucide-react";
import { useAppConfig } from "@/context/AppConfigContext";

interface JobConfigCardProps {
  job: Job;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  editForm: Partial<Job>;
  setEditForm: (form: Partial<Job>) => void;
  technicians: User[];
  onSaveJob: () => void;
  onManageTechnicians: () => void;
}

export function JobConfigCard({
  job, isEditing, setIsEditing, editForm, setEditForm, technicians, onSaveJob, onManageTechnicians
}: JobConfigCardProps) {
  const { config } = useAppConfig();

  if (isEditing) {
    return (
      <Card>
        <div className="p-6 border-b border-admin-border">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Edit Config</h3>
        </div>
        <div className="p-6 pt-0 space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
            <Select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
              {config.jobStatuses.map(s => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">Priority</label>
            <Select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value as any})}>
              {config.priorities.map(p => (
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-text-secondary mb-1">Job Type</label>
            <Select value={editForm.job_type} onChange={e => setEditForm({...editForm, job_type: e.target.value as any})}>
              {config.serviceLocations.map(l => (
                <option key={l.id} value={l.id}>{l.id}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-admin-border p-4 bg-admin-bg-subtle rounded-b-xl">
          <Button variant="ghost" onClick={() => { setIsEditing(false); setEditForm(job); }} size="sm">Cancel</Button>
          <Button onClick={onSaveJob} leftIcon={<Save size={16} />} size="sm">Save</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-row justify-between items-center p-6 border-b border-admin-border">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Job Config</h3>
        <Button variant="ghost" onClick={() => setIsEditing(true)} leftIcon={<Edit size={16} />} size="sm">Edit</Button>
      </div>
      <div className="p-6 pt-0 space-y-4 text-sm mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Status</div>
            <StatusBadge status={job.status} />
          </div>
          <div>
            <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Priority</div>
            <PriorityBadge priority={job.priority} />
          </div>
          <div>
            <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Job Type</div>
            <div className="font-medium text-admin-text-primary">{job.job_type}</div>
          </div>
          <div>
            <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Created At</div>
            <div className="font-medium text-admin-text-primary">{new Date(job.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="bg-admin-bg-subtle p-4 rounded-lg border border-admin-border mt-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-admin-text-muted text-xs uppercase tracking-wider">Assigned Technicians</div>
            <Button variant="ghost" size="sm" onClick={onManageTechnicians} className="h-6 text-xs px-2">Manage</Button>
          </div>
          
          <div className="space-y-2">
            {job.job_technicians && job.job_technicians.filter(jt => !(jt as any).removed_at).length > 0 ? (
              job.job_technicians.filter(jt => !(jt as any).removed_at).map(jt => (
                <div key={jt.technician_id}>
                  <div className="font-bold text-admin-text-primary text-base">{jt.technician?.name || 'Unknown'}</div>
                  {(jt.technician as any)?.phone && (
                    <div className="text-admin-text-secondary text-xs mt-0.5">
                      <a href={`tel:${(jt.technician as any).phone}`} className="hover:text-admin-text-primary transition-colors">
                        {(jt.technician as any).phone}
                      </a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="font-bold text-admin-text-primary text-base">Unassigned</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
