import React, { useState } from 'react';
import { Job, User } from '@repairshop/shared';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Textarea } from "@/components/common/Textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Save, X, Edit, MessageCircle, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";

import { MaterialReconciliationModal } from './MaterialReconciliationModal';
import { JobMaterial } from '@repairshop/shared';

interface JobInfoCardProps {
  job: Job;
  technicians: User[];
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onJobUpdated: (job: Job) => void;
  billing: any;
  deviceTypes: string[];
  materials?: JobMaterial[];
  onUpdateMaterials?: (materials: JobMaterial[]) => void;
}

export function JobInfoCard({
  job, technicians, isEditing, setIsEditing, onJobUpdated, billing, deviceTypes,
  materials = [], onUpdateMaterials
}: JobInfoCardProps) {
  const { showToast } = useToast();
  const [editForm, setEditForm] = useState<Partial<Job>>({
    ...job,
    device_type: job?.device_type || (job as any)?.device_type_id || '',
    remarks: job?.remarks || '',
  });
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  React.useEffect(() => {
    if (job) {
      setEditForm({
        ...job,
        device_type: job.device_type || (job as any).device_type_id || '',
        remarks: job.remarks || '',
      });
    }
  }, [job]);

  const handleSaveJob = async () => {
    try {
      if (!editForm.customer_name?.trim() || !editForm.customer_contact?.trim()) {
        showToast("Name and Contact are required.", "error");
        return;
      }
      
      // If marking as Completed and there are materials, prompt reconciliation
      if (editForm.status === 'Completed' && job?.status !== 'Completed' && materials.length > 0) {
        setIsEditing(false);
        setShowReconcileModal(true);
        return;
      }

      const deviceVal = editForm.device_type?.trim() || null;
      const updateData: any = {
        customer_name: editForm.customer_name,
        customer_contact: editForm.customer_contact,
        customer_email: editForm.customer_email || null,
        device_type_id: deviceVal,
        reported_issue: editForm.reported_issue,
        remarks: editForm.remarks?.trim() || null,
        job_type: editForm.job_type,
        priority: editForm.priority,
        status: editForm.status
      };

      if (editForm.status === 'Completed' && job?.status !== 'Completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('jobs').update(updateData).eq('id', job.id);
      if (error) throw new Error(error.message);
      
      setIsEditing(false);
      showToast("Job updated successfully", "success");
      onJobUpdated({ ...job, ...updateData, device_type: deviceVal });
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSendWhatsApp = () => {
    if (!job) return;
    const phone = job.customer_contact.replace(/\D/g, '');
    const number = phone.length === 10 ? `91${phone}` : phone;
    
    let text = `Hello ${job.customer_name}, this is regarding your job ${job.job_code} at RepairShop. `;
    if (billing) {
      text += `Your total bill is ₹${billing.grand_total.toFixed(2)}. Status: ${billing.is_paid ? 'Paid' : 'Unpaid'}.`;
    }
    
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isEditing) {
    return (
      <Card>
        <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle">
          <h3 className="text-lg font-semibold">Edit Job Details</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} leftIcon={<X size={16} />}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveJob} leftIcon={<Save size={16} />}>Save Changes</Button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-admin-text-primary border-b border-admin-border pb-2">Customer Details</h4>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Name</label><Input  value={editForm.customer_name || ''} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Contact Number</label><Input  value={editForm.customer_contact || ''} onChange={(e) => setEditForm({ ...editForm, customer_contact: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Email (Optional)</label><Input  type="email" value={editForm.customer_email || ''} onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })} /></div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-admin-text-primary border-b border-admin-border pb-2">Device & Issue</h4>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-admin-text-secondary">Device Type</label>
                <Input list="edit-device-types" value={editForm.device_type || ''} onChange={(e) => setEditForm({ ...editForm, device_type: e.target.value as any })} placeholder="e.g. Laptop, PC..." />
                <datalist id="edit-device-types">
                  {deviceTypes?.map(dt => <option key={dt} value={dt} />)}
                </datalist>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Reported Issue</label><Textarea  rows={3} value={editForm.reported_issue || ''} onChange={(e) => setEditForm({ ...editForm, reported_issue: e.target.value })} /></div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-admin-text-primary border-b border-admin-border pb-2">Job Assignment & Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Status</label><Select  value={editForm.status || 'Received'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}>
                <option value="Received">Received</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Materials">Waiting for Materials</option>
                <option value="Completed">Completed</option>
              </Select></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Priority</label><Select  value={editForm.priority || 'Normal'} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Select></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-admin-text-secondary">Job Type</label><Select  value={editForm.job_type || 'Repair'} onChange={(e) => setEditForm({ ...editForm, job_type: e.target.value as any })}>
                <option value="Repair">Repair</option>
                <option value="Service">Service</option>
                <option value="Inspection">Inspection</option>
              </Select></div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-admin-text-secondary">Remarks & Physical Condition</label>
              <Textarea 
                rows={2} 
                value={editForm.remarks || ''} 
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} 
                placeholder="Scratches, physical condition, accessories received..."
              />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6 border-b border-admin-border flex justify-between items-center">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Customer & Device Info</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(true)} 
            leftIcon={<Edit size={15} />}
            className="text-admin-text-secondary hover:text-admin-text-primary"
          >
            Edit
          </Button>
        </div>
        <div className="p-6 pt-0 space-y-4 text-sm mt-4">
          <div className="grid grid-cols-2 gap-4 bg-admin-bg-subtle p-4 rounded-lg">
            <div>
              <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Customer Name</div>
              <div className="font-medium text-admin-text-primary">{job.customer_name}</div>
            </div>
            <div>
              <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Contact</div>
              <div className="font-medium">
                <a href={`tel:${job.customer_contact}`} className="text-admin-accent hover:underline">
                  {job.customer_contact}
                </a>
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Email</div>
              <div className="font-medium text-admin-text-primary">
                {job.customer_email || '—'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-admin-bg-subtle p-4 rounded-lg">
            <div>
              <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Device Type</div>
              <div className="font-medium text-admin-text-primary">
                {job.device_type || (job as any).device_type_id || '—'}
              </div>
            </div>
            <div>
              <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Reported Issue</div>
              <div className="font-medium text-admin-text-primary">{job.reported_issue || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-admin-text-muted mb-1 text-xs uppercase tracking-wider">Remarks & Physical Condition</div>
              <div className="font-medium text-admin-text-primary">
                {job.remarks?.trim() ? (
                  job.remarks
                ) : (
                  <span className="text-admin-text-muted italic text-xs font-normal">No remarks or physical condition recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <MaterialReconciliationModal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        job={job}
        materials={materials}
        onReconciled={(updatedJob, updatedMaterials) => {
          onJobUpdated(updatedJob);
          if (onUpdateMaterials) onUpdateMaterials(updatedMaterials);
        }}
      />
    </>
  );
}
