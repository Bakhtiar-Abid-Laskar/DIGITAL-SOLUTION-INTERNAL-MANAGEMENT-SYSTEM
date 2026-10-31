import React, { useState } from 'react';
import { JobMaterial, validateJobMaterial, formatCurrency } from '@repairshop/shared';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Trash2, Plus, ScanLine, AlertCircle, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";
import { CameraBarcodeScannerModal } from "@/components/common/CameraBarcodeScannerModal";

interface JobMaterialsCardProps {
  jobId: string;
  job?: any;
  materials: JobMaterial[];
  newMaterial: { name: string; serialNumber: string; qty: number; unitCost: number; serialId?: string | null };
  addingMaterial: boolean;
  onUpdateMaterials: (materials: JobMaterial[]) => void;
  onUpdateNewMaterial: (payload: Partial<{ name: string; serialNumber: string; qty: number; unitCost: number; serialId?: string | null }>) => void;
  onResetNewMaterial: () => void;
  onSetAddingMaterial: (adding: boolean) => void;
  setConfirmModal: (modal: any) => void;
}

export function JobMaterialsCard({
  jobId, job, materials, newMaterial, addingMaterial,
  onUpdateMaterials, onUpdateNewMaterial, onResetNewMaterial, onSetAddingMaterial, setConfirmModal
}: JobMaterialsCardProps) {
  const { showToast } = useToast();
  const [serialError, setSerialError] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleAddMaterial = async () => {
    const trimmedSerial = (newMaterial.serialNumber || '').trim();
    if (!trimmedSerial) {
      setSerialError(true);
      showToast("Serial number is compulsory for all job materials.", "error");
      return;
    }

    const validation = validateJobMaterial({
      material_name: newMaterial.name,
      serial_number: trimmedSerial,
      quantity: newMaterial.qty,
      unit_cost: newMaterial.unitCost,
    });

    if (!validation.valid) {
      if (!trimmedSerial) setSerialError(true);
      showToast(validation.error || "Invalid material details.", "error");
      return;
    }

    setSerialError(false);
    onSetAddingMaterial(true);
    try {
      const techId = job?.technician_id || null;
      const { error } = await supabase.from('job_materials').insert({
        job_id: jobId,
        material_name: newMaterial.name.trim(),
        serial_number: trimmedSerial,
        serial_id: newMaterial.serialId || null,
        quantity: newMaterial.qty,
        added_qty: newMaterial.qty,
        used_qty: newMaterial.qty,
        remaining_qty: 0,
        unit_cost: newMaterial.unitCost,
        technician_id: techId,
        checkout_status: 'checked_out',
      });
      if (error) throw error;
      
      onResetNewMaterial();
      const { data } = await supabase.from('job_materials').select('*').eq('job_id', jobId);
      if (data) onUpdateMaterials(data);
      showToast('Material added with serial number successfully', 'success');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      onSetAddingMaterial(false);
    }
  };

  const handleDeleteMaterial = (matId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Material',
      message: 'Are you sure you want to delete this material? This will affect the billing parts total.',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from('job_materials').delete().eq('id', matId);
        if (error) {
          showToast(error.message, "error");
        } else {
          onUpdateMaterials(materials.filter(m => m.id !== matId));
          showToast("Material deleted", "success");
        }
        setConfirmModal(null);
      }
    });
  };

  return (
    <Card>
      <div className="p-6 border-b border-admin-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold leading-none tracking-tight">Materials & Parts Logged</h3>
          <p className="text-xs text-admin-text-secondary mt-1">Every part used on this job must have a verified serial number.</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-admin-bg-subtle text-admin-text-secondary border border-admin-border">
          {materials.length} {materials.length === 1 ? 'part' : 'parts'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
            <tr>
              <th scope="col" className="px-6 py-4 font-medium">Material Name</th>
              <th scope="col" className="px-6 py-4 font-medium">Serial Number</th>
              <th scope="col" className="px-6 py-4 font-medium text-center">Qty</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Unit Price</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Total</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {materials.map(mat => (
              <tr key={mat.id} className="hover:bg-admin-bg-hover transition-colors">
                <td className="px-6 py-4 font-medium text-admin-text-primary">
                  {mat.material_name}
                </td>
                <td className="px-6 py-4">
                  {mat.serial_number && mat.serial_number.trim() ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-admin-bg-subtle border border-admin-border/60">
                      <Hash size={12} className="text-admin-accent-text shrink-0" />
                      <code className="font-mono text-xs font-semibold text-admin-text-primary">
                        {mat.serial_number}
                      </code>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-admin-danger font-medium">
                      <AlertCircle size={13} />
                      Missing Serial
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-admin-text-secondary text-center">{mat.quantity}</td>
                <td className="px-6 py-4 text-admin-text-secondary text-right">{formatCurrency(mat.unit_cost)}</td>
                <td className="px-6 py-4 font-bold text-admin-text-primary text-right">{formatCurrency(mat.total_cost)}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteMaterial(mat.id)} className="text-admin-danger p-1 hover:bg-admin-danger/10 hover:text-admin-danger rounded transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-admin-text-secondary">
                  No materials logged for this job. Add parts below with compulsory serial numbers.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-admin-bg-surface border-t border-admin-border">
            <tr>
              <td className="px-4 py-3">
                <Input 
                  placeholder="Material / Part name *" 
                  value={newMaterial.name} 
                  onChange={e => onUpdateNewMaterial({ name: e.target.value })} 
                  className="h-9 text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <div className="relative flex items-center">
                  <Input 
                    placeholder="Serial Number * (compulsory)" 
                    value={newMaterial.serialNumber || ''} 
                    onChange={e => {
                      setSerialError(false);
                      onUpdateNewMaterial({ serialNumber: e.target.value });
                    }} 
                    className={`h-9 text-sm font-mono pr-8 ${serialError ? 'border-admin-danger focus:ring-admin-danger' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-2 p-1 text-admin-text-muted hover:text-admin-text-primary focus:outline-none"
                    title="Scan Barcode / Serial"
                  >
                    <ScanLine size={15} />
                  </button>
                </div>
                {serialError && (
                  <p className="text-[11px] text-admin-danger font-medium mt-1">
                    Serial number is compulsory for all job materials
                  </p>
                )}
              </td>
              <td className="px-2 py-3 w-20">
                <Input 
                  type="number" min="1" 
                  value={newMaterial.qty.toString()} 
                  onChange={e => onUpdateNewMaterial({ qty: parseInt(e.target.value) || 0 })} 
                  className="h-9 text-sm text-center"
                />
              </td>
              <td className="px-2 py-3 w-28">
                <Input 
                  type="number" min="0" 
                  placeholder="Price"
                  value={newMaterial.unitCost.toString()} 
                  onChange={e => onUpdateNewMaterial({ unitCost: parseFloat(e.target.value) || 0 })} 
                  className="h-9 text-sm text-right"
                />
              </td>
              <td className="px-4 py-3 font-bold text-admin-text-primary text-right">
                {formatCurrency(newMaterial.qty * newMaterial.unitCost)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button onClick={handleAddMaterial} isLoading={addingMaterial} size="sm" leftIcon={<Plus size={14} />}>
                  Add
                </Button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <CameraBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scanned) => {
          onUpdateNewMaterial({ serialNumber: scanned });
          setSerialError(false);
          setIsScannerOpen(false);
          showToast(`Scanned serial: ${scanned}`, 'info');
        }}
      />
    </Card>
  );
}
