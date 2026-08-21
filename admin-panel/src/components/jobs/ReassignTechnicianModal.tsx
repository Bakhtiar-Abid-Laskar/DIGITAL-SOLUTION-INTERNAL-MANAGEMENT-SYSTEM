import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Job, User } from '@repairshop/shared';
import { X, Check } from 'lucide-react';
import { Button } from '../common/Button';

export default function ReassignTechnicianModal({ 
  job, 
  technicians, 
  onClose, 
  onSuccess 
}: { 
  job: Job; 
  technicians: User[]; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const initialTechs = job.job_technicians?.filter(jt => !jt.removed_at).map(jt => jt.technician_id) || (job.technician_id ? [job.technician_id] : []);
  const [selectedTechs, setSelectedTechs] = useState<string[]>(initialTechs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCompleted = job.status === 'Completed';

  const toggleTech = (techId: string) => {
    // If completed, cannot remove originally assigned technicians
    if (isCompleted && initialTechs.includes(techId) && selectedTechs.includes(techId)) {
      setError('Cannot remove technicians from a completed job.');
      return;
    }
    setError('');

    if (selectedTechs.includes(techId)) {
      setSelectedTechs(prev => prev.filter(id => id !== techId));
    } else {
      setSelectedTechs(prev => [...prev, techId]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const toAdd = selectedTechs.filter(id => !initialTechs.includes(id));
      const toRemove = initialTechs.filter(id => !selectedTechs.includes(id));

      if (toAdd.length > 0) {
        const { error: addErr } = await supabase
          .from('job_technicians')
          .insert(toAdd.map(id => ({ job_id: job.id, technician_id: id })));
        if (addErr) throw new Error(addErr.message);
      }

      if (toRemove.length > 0) {
        const { error: removeErr } = await supabase
          .from('job_technicians')
          .update({ removed_at: new Date().toISOString() })
          .in('technician_id', toRemove)
          .eq('job_id', job.id)
          .is('removed_at', null);
        if (removeErr) throw new Error(removeErr.message);
      }

      // Also update the legacy technician_id for backward compatibility
      if (toAdd.length > 0 || toRemove.length > 0) {
        const primaryTech = selectedTechs.length > 0 ? selectedTechs[0] : null;
        await supabase.from('jobs').update({ technician_id: primaryTech }).eq('id', job.id);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update technicians');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-admin-bg-dark/80 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-admin-bg-surface sm:rounded-xl rounded-t-2xl shadow-modal w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-admin-border flex justify-between items-center bg-admin-bg-subtle shrink-0">
          <h3 className="font-bold text-admin-text-primary">Assign Technicians</h3>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-admin-text-muted mb-4">
            Assigning to Job <strong>{job.job_code}</strong> ({job.device_type})
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-admin-urgent-bg text-admin-urgent-fg rounded border border-admin-urgent-fg/20 text-sm">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium text-admin-text-secondary mb-3">Select Technicians</label>
          <div className="space-y-2">
            {technicians.map(t => {
              const isSelected = selectedTechs.includes(t.id);
              const isLocked = isCompleted && initialTechs.includes(t.id);
              
              return (
                <div 
                  key={t.id}
                  onClick={() => !isLocked && toggleTech(t.id)}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                    isLocked 
                      ? 'bg-admin-bg-subtle border-admin-border opacity-70 cursor-not-allowed'
                      : isSelected 
                        ? 'bg-admin-primary/10 border-admin-primary/30 cursor-pointer' 
                        : 'bg-admin-bg-surface border-admin-border hover:border-admin-border-hover cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="font-medium text-admin-text-primary">{t.name}</div>
                    {isLocked && <div className="text-xs text-admin-text-muted mt-1">Locked (Job Completed)</div>}
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-admin-primary flex items-center justify-center">
                      <Check size={12} color="white" />
                    </div>
                  )}
                </div>
              );
            })}
            
            {technicians.length === 0 && (
              <div className="text-sm text-admin-text-muted py-4 text-center border border-dashed border-admin-border rounded-lg">
                No active technicians found.
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-admin-border bg-admin-bg-subtle flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="min-h-[44px]">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
            isLoading={loading}
          >
            Save Assignments
          </Button>
        </div>
      </div>
    </div>
  );
}
