import React from 'react';
import { JobMaterial } from '@repairshop/shared';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from '@repairshop/shared';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";

interface JobMaterialsCardProps {
  jobId: string;
  materials: JobMaterial[];
  newMaterial: { name: string; qty: number; unitCost: number };
  addingMaterial: boolean;
  onUpdateMaterials: (materials: JobMaterial[]) => void;
  onUpdateNewMaterial: (payload: Partial<{ name: string; qty: number; unitCost: number }>) => void;
  onResetNewMaterial: () => void;
  onSetAddingMaterial: (adding: boolean) => void;
  setConfirmModal: (modal: any) => void;
}

export function JobMaterialsCard({
  jobId, materials, newMaterial, addingMaterial,
  onUpdateMaterials, onUpdateNewMaterial, onResetNewMaterial, onSetAddingMaterial, setConfirmModal
}: JobMaterialsCardProps) {
  const { showToast } = useToast();

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim() || newMaterial.qty <= 0 || newMaterial.unitCost < 0) {
      showToast("Invalid material details.", "error");
      return;
    }
    onSetAddingMaterial(true);
    try {
      const { error } = await supabase.from('job_materials').insert({
        job_id: jobId,
        material_name: newMaterial.name.trim(),
        quantity: newMaterial.qty,
        unit_cost: newMaterial.unitCost
      });
      if (error) throw error;
      
      onResetNewMaterial();
      const { data } = await supabase.from('job_materials').select('*').eq('job_id', jobId);
      if (data) onUpdateMaterials(data);
      showToast('Material added successfully', 'success');
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
      <div className="p-6 border-b border-admin-border">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Materials Logged</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
            <tr>
              <th scope="col" className="px-6 py-4 font-medium">Material Name</th>
              <th scope="col" className="px-6 py-4 font-medium text-center">Qty</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Unit Cost</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Total Cost</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {materials.map(mat => (
              <tr key={mat.id} className="hover:bg-admin-bg-hover transition-colors">
                <td className="px-6 py-4 font-medium text-admin-text-primary">{mat.material_name}</td>
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
                <td colSpan={5} className="px-6 py-8 text-center text-admin-text-secondary">No materials logged for this job.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-admin-bg-surface border-t border-admin-border">
            <tr>
              <td className="px-4 py-3">
                <Input 
                  placeholder="New material name..." 
                  value={newMaterial.name} 
                  onChange={e => onUpdateNewMaterial({ name: e.target.value })} 
                  className="h-9 text-sm"
                />
              </td>
              <td className="px-2 py-3 w-24">
                <Input 
                  type="number" min="1" 
                  value={newMaterial.qty.toString()} 
                  onChange={e => onUpdateNewMaterial({ qty: parseInt(e.target.value) || 0 })} 
                  className="h-9 text-sm text-center"
                />
              </td>
              <td className="px-2 py-3 w-32">
                <Input 
                  type="number" min="0" 
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
    </Card>
  );
}
