import React from 'react';
import { useRouter } from "next/navigation";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { CheckCircle2, Printer, Eye } from "lucide-react";
import { Job } from '@repairshop/shared';
import { formatCurrency } from '@repairshop/shared';
import { openInvoicePrint } from '@/lib/invoiceClient';
import { useToast } from "@/components/common/ToastProvider";
import { CreateJobFormState } from '@/app/(admin)/jobs/new/reducer';

interface JobSuccessCardProps {
  createdJob: Job;
  form: CreateJobFormState;
  onCreateAnother: () => void;
}

export function JobSuccessCard({ createdJob, form, onCreateAnother }: JobSuccessCardProps) {
  const router = useRouter();
  const { showToast } = useToast();

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
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              onClick={async () => {
                if (!createdJob) return;
                try {
                  await openInvoicePrint({
                    docType: 'receipt',
                    jobId: createdJob.id,
                  });
                } catch (e: any) {
                  showToast(e.message || 'Failed to open receipt', 'error');
                }
              }}
              leftIcon={<Printer size={18} />}
            >
              Print Receipt
            </Button>
            <Button variant="outline" onClick={() => router.push(`/jobs/${createdJob.id}`)} leftIcon={<Eye size={18} />}>
              View Job Details
            </Button>
            <Button variant="ghost" onClick={onCreateAnother}>
              Create Another Job
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
