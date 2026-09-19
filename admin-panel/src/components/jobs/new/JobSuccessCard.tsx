"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { CheckCircle2, Printer, Eye, FileText } from "lucide-react";
import { Job } from '@repairshop/shared';
import { formatCurrency } from '@repairshop/shared';
import { openJobCardPrint } from '@/lib/jobCardClient';
import { useToast } from "@/components/common/ToastProvider";
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';
import { PrintProgressModal, PrintProgressState } from "@/components/common/PrintProgressModal";

interface JobSuccessCardProps {
  createdJob: Job;
  form: CreateJobFormState;
  onCreateAnother: () => void;
}

export function JobSuccessCard({ createdJob, form, onCreateAnother }: JobSuccessCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [printState, setPrintState] = useState<PrintProgressState | null>(null);

  const handlePrintJobCard = async () => {
    if (!createdJob) return;
    setPrintState({ isOpen: true, percent: 15, message: 'Preparing operational Job Card...' });
    try {
      await openJobCardPrint({
        jobId: createdJob.id,
        preloadedJob: createdJob,
        onProgress: (percent, message) => setPrintState({ isOpen: true, percent, message })
      });
      setPrintState({ isOpen: true, percent: 100, message: 'Print dialog opened', isComplete: true });
      setTimeout(() => setPrintState(null), 1200);
    } catch (e: any) {
      setPrintState(null);
      showToast(e.message || 'Failed to print Job Card', 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto mt-10">
      <Card className="text-center py-10 border border-admin-border">
        <div className="p-4 pt-0 space-y-4 mt-4">
          <div className="mx-auto w-20 h-20 bg-admin-completed-bg rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={44} className="text-admin-completed-fg" />
          </div>
          <h2 className="text-3xl font-bold text-admin-text-primary">Job Created Successfully!</h2>
          <p className="text-admin-text-secondary text-sm">
            Job has been registered and assigned to status <span className="font-semibold text-admin-text-primary">Received</span>.
          </p>
          <div className="inline-block bg-admin-bg-subtle border border-admin-border px-8 py-3 rounded-2xl text-2xl font-mono font-bold text-admin-text-primary">
            {createdJob.job_code}
          </div>

          {form.job_type_title ? (
            <div className="bg-admin-accent-dim/30 border border-admin-accent/20 rounded-xl p-4 text-sm text-admin-text-secondary max-w-md mx-auto">
              <span className="font-semibold text-admin-text-primary">Service:</span> {form.job_type_title} • Base Charge: {formatCurrency(form.customer_charge_amount)}
            </div>
          ) : null}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button
              onClick={handlePrintJobCard}
              leftIcon={<Printer size={18} />}
            >
              Print Job Card
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/jobs/${createdJob.id}`)}
              leftIcon={<FileText size={18} />}
            >
              Generate Bill
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/jobs/${createdJob.id}`)} leftIcon={<Eye size={18} />}>
              View Details
            </Button>
            <Button variant="ghost" onClick={onCreateAnother}>
              Create Another
            </Button>
          </div>
        </div>
      </Card>

      {/* Modern Print Progress Modal */}
      <PrintProgressModal state={printState} onClose={() => setPrintState(null)} />
    </div>
  );
}
