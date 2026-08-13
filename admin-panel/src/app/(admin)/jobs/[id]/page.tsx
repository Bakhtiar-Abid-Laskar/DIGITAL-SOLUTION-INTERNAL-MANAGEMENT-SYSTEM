"use client";

import { useEffect, use, useCallback, useReducer } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Job } from '@repairshop/shared';
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";
import { openInvoicePrint } from '@/lib/invoiceClient';
import { ArrowLeft, Printer, MapPin } from "lucide-react";

import { jobDetailReducer, initialState } from './reducer';
import { JobInfoCard } from '@/components/jobs/detail/JobInfoCard';
import { JobConfigCard } from '@/components/jobs/detail/JobConfigCard';
import { JobMaterialsCard } from '@/components/jobs/detail/JobMaterialsCard';
import { JobBillingCard } from '@/components/jobs/detail/JobBillingCard';
import { JobNotesCard } from '@/components/jobs/detail/JobNotesCard';
import ReassignTechnicianModal from '@/components/jobs/ReassignTechnicianModal';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { showToast } = useToast();

  const [state, dispatch] = useReducer(jobDetailReducer, initialState);

  const fetchData = useCallback(async (cancelled = false) => {
    if (!cancelled) dispatch({ type: 'FETCH_START' });
    try {
      const [jobRes, matRes, billRes, techRes] = await Promise.all([
        supabase.from('jobs').select('*, technician:users!jobs_technician_id_fkey(name, phone), job_technicians(*, technician:users!job_technicians_technician_id_fkey(name, phone))').eq('id', id).single(),
        supabase.from('job_materials').select('*').eq('job_id', id),
        supabase.from('billing').select('*').eq('job_id', id).single(),
        supabase.from('users').select('*').eq('role', 'technician').eq('is_active', true)
      ]);

      if (cancelled) return;
      if (jobRes.error) throw jobRes.error;
      
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        payload: { 
          job: jobRes.data, 
          materials: matRes.data || [], 
          technicians: techRes.data || [], 
          billing: billRes.data 
        } 
      });
    } catch (err: any) {
      if (cancelled) return;
      console.error(err);
      dispatch({ type: 'FETCH_ERROR', error: err.message || 'Failed to load job details' });
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetchData(cancelled);

    const channel = supabase
      .channel(`admin-job-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${id}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_materials', filter: `job_id=eq.${id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  if (state.loading) return <div className="p-10"><LoadingState message="Loading job details..." /></div>;
  if (state.error || !state.job) return <div className="p-10"><ErrorState message={state.error || 'Job not found'} /></div>;

  const handleSaveJob = async () => {
    try {
      if (!state.editForm.customer_name?.trim() || !state.editForm.customer_contact?.trim()) {
        showToast("Name and Contact are required.", "error");
        return;
      }
      
      const updateData: any = {
        customer_name: state.editForm.customer_name,
        customer_contact: state.editForm.customer_contact,
        customer_email: state.editForm.customer_email || null,
        device_type: state.editForm.device_type,
        reported_issue: state.editForm.reported_issue,
        remarks: state.editForm.remarks || null,
        job_type: state.editForm.job_type,
        priority: state.editForm.priority,
        status: state.editForm.status,
        technician_id: state.editForm.technician_id
      };

      if (state.editForm.status === 'Completed' && state.job?.status !== 'Completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('jobs').update(updateData).eq('id', id);
      if (error) throw error;
      
      dispatch({ type: 'SET_EDITING', isEditing: false });
      showToast("Job updated successfully", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-10">
      <PageHeader 
        title={`Job ${state.job.job_code}`} 
        description="Manage customer job details, assignment, and billing."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!state.job) return;
                try {
                  await openInvoicePrint({
                    docType: 'receipt',
                    jobId: state.job.id,           
                    invoiceNo: state.job.job_code, 
                    date: state.job.created_at || new Date().toISOString(),
                    customer: {
                      name: state.job.customer_name,
                      gst: (state.job as any).customer_gstin || undefined,
                      phone: state.job.customer_contact,
                      address: state.job.device_type + ' — ' + state.job.reported_issue,
                    },
                    items: [{ description: state.job.reported_issue || 'Device Repair', hsn: '', price: 0, unit: 1 }],
                  });
                } catch (e: any) { showToast(e.message, 'error'); }
              }}
              leftIcon={<Printer size={16} />}
            >
              Print Receipt
            </Button>
            <Button variant="ghost" onClick={() => router.push('/jobs')} leftIcon={<ArrowLeft size={16} />}>
              Back to Jobs
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* === LEFT COLUMN === */}
        <div className="lg:col-span-8 space-y-6">
          <JobInfoCard 
            job={state.job}
            technicians={state.technicians}
            isEditing={state.isEditing}
            setIsEditing={(val) => dispatch({ type: 'SET_EDITING', isEditing: val })}
            onJobUpdated={(job) => dispatch({ type: 'UPDATE_JOB', job })}
            billing={state.billing}
          />

          <JobMaterialsCard
            jobId={id}
            materials={state.materials}
            newMaterial={state.newMaterial}
            addingMaterial={state.addingMaterial}
            onUpdateMaterials={(materials) => dispatch({ type: 'UPDATE_MATERIALS', materials })}
            onUpdateNewMaterial={(payload) => dispatch({ type: 'UPDATE_NEW_MATERIAL', payload })}
            onResetNewMaterial={() => dispatch({ type: 'RESET_NEW_MATERIAL' })}
            onSetAddingMaterial={(adding) => dispatch({ type: 'SET_ADDING_MATERIAL', adding })}
            setConfirmModal={(modal) => dispatch({ type: 'SET_CONFIRM_MODAL', modal })}
          />

          <JobNotesCard
            jobId={id}
            notes={state.notes}
            notesSaving={state.notesSaving}
            onUpdateNotes={(notes) => dispatch({ type: 'UPDATE_NOTES', notes })}
            onSetNotesSaving={(saving) => dispatch({ type: 'SET_NOTES_SAVING', saving })}
            onJobNotesSaved={(notes) => dispatch({ type: 'UPDATE_NOTES', notes })}
          />

          {state.job.job_type === 'Onsite' && (
            <Card>
              <div className="p-6 border-b border-admin-border">
                <h3 className="text-lg font-semibold leading-none tracking-tight">Onsite Visit Details</h3>
              </div>
              <div className="p-6 pt-0 mt-4">
                <EmptyState icon={<MapPin size={32} />} heading="Onsite Tracking" subtext="Onsite check-ins and selfies will appear here if logged by the technician." asCard={false} />
              </div>
            </Card>
          )}

        </div>

        {/* === RIGHT COLUMN (Sticky) === */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-6 space-y-6">
            
            <JobConfigCard
              job={state.job}
              isEditing={state.isEditing}
              setIsEditing={(val) => dispatch({ type: 'SET_EDITING', isEditing: val })}
              editForm={state.editForm}
              setEditForm={(form) => dispatch({ type: 'UPDATE_EDIT_FORM', payload: form })}
              technicians={state.technicians}
              onSaveJob={handleSaveJob}
              onManageTechnicians={() => dispatch({ type: 'SET_REASSIGN_MODAL', isOpen: true })}
            />

            <JobBillingCard
              jobId={id}
              jobCode={state.job.job_code}
              materials={state.materials}
              billing={state.billing}
              billingForm={state.billingForm}
              billingSaving={state.billingSaving}
              onUpdateBillingForm={(payload) => dispatch({ type: 'UPDATE_BILLING_FORM', payload })}
              onSetBillingSaving={(saving) => dispatch({ type: 'SET_BILLING_SAVING', saving })}
              onUpdateBilling={(billing) => dispatch({ type: 'UPDATE_BILLING', billing })}
              setConfirmModal={(modal) => dispatch({ type: 'SET_CONFIRM_MODAL', modal })}
            />

          </div>
        </div>

      </div>

      {state.confirmModal && (
        <ConfirmationModal
          title={state.confirmModal.title}
          message={state.confirmModal.message}
          onConfirm={state.confirmModal.onConfirm}
          onCancel={() => dispatch({ type: 'SET_CONFIRM_MODAL', modal: null })}
          isDestructive={!!state.confirmModal.isDestructive}
        />
      )}

      {state.isReassignModalOpen && state.job && (
        <ReassignTechnicianModal
          job={state.job}
          technicians={state.technicians}
          onClose={() => dispatch({ type: 'SET_REASSIGN_MODAL', isOpen: false })}
          onSuccess={() => {
            dispatch({ type: 'SET_REASSIGN_MODAL', isOpen: false });
            fetchData();
          }}
        />
      )}
    </div>
  );
}
