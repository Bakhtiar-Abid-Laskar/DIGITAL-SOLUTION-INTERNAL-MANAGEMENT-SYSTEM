import React from 'react';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Save } from "lucide-react";
import { formatCurrency } from '@repairshop/shared';
import { calculatePartsTotal, calculateGrandTotal } from '@repairshop/shared';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";

interface JobBillingCardProps {
  jobId: string;
  jobCode: string;
  materials: any[];
  billing: any;
  billingForm: {
    labour_charge: number;
    tax_percent: number;
    discount: number;
    is_paid: boolean;
  };
  billingSaving: boolean;
  onUpdateBillingForm: (payload: Partial<JobBillingCardProps['billingForm']>) => void;
  onSetBillingSaving: (saving: boolean) => void;
  onUpdateBilling: (billing: any) => void;
  setConfirmModal: (modal: any) => void;
}

export function JobBillingCard({
  jobId, jobCode, materials, billing, billingForm, billingSaving,
  onUpdateBillingForm, onSetBillingSaving, onUpdateBilling, setConfirmModal
}: JobBillingCardProps) {
  const { showToast } = useToast();

  const partsTotal = calculatePartsTotal(materials);
  const grandTotalPreview = calculateGrandTotal(partsTotal, billingForm.labour_charge, billingForm.tax_percent, billingForm.discount);

  const executeSaveBilling = async () => {
    onSetBillingSaving(true);
    try {
      const grandTotal = calculateGrandTotal(partsTotal, billingForm.labour_charge, billingForm.tax_percent, billingForm.discount);

      const payload = {
        job_id: jobId,
        parts_total: partsTotal,
        labour_charge: billingForm.labour_charge,
        tax_percent: billingForm.tax_percent,
        discount: billingForm.discount,
        grand_total: grandTotal,
        is_paid: billingForm.is_paid
      };

      if (billing?.id) {
        const { error } = await supabase.from('billing').update(payload).eq('id', billing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('billing').insert(payload);
        if (error) throw error;
      }

      const { data } = await supabase.from('billing').select('*').eq('job_id', jobId).single();
      if (data) onUpdateBilling(data);
      showToast('Billing saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      onSetBillingSaving(false);
    }
  };

  const handleSaveBilling = () => {
    const grandTotal = calculateGrandTotal(partsTotal, billingForm.labour_charge, billingForm.tax_percent, billingForm.discount);

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Billing Statement',
      message: `Are you sure you want to save the billing statement for job ${jobCode}? Calculated Grand Total: ₹${grandTotal.toFixed(2)}.`,
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal(null);
        await executeSaveBilling();
      }
    });
  };

  return (
    <Card>
      <div className="p-6 border-b border-admin-border">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Billing & Status</h3>
      </div>
      <div className="p-6 pt-0 space-y-5 mt-4">
        
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-admin-text-secondary">Parts Total</span>
            <span className="font-medium text-admin-text-primary">{formatCurrency(partsTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-admin-text-secondary">Labour Charges</span>
            <Input 
              type="number" 
              min="0" 
              value={billingForm.labour_charge.toString()} 
              onChange={e => onUpdateBillingForm({ labour_charge: parseFloat(e.target.value) || 0 })} 
              className="h-8 text-sm text-right w-24"
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-admin-text-secondary">Tax (%)</span>
            <Input 
              type="number" 
              min="0" 
              value={billingForm.tax_percent.toString()} 
              onChange={e => onUpdateBillingForm({ tax_percent: parseFloat(e.target.value) || 0 })} 
              className="h-8 text-sm text-right w-24"
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-admin-text-secondary">Discount</span>
            <Input 
              type="number" 
              min="0" 
              value={billingForm.discount.toString()} 
              onChange={e => onUpdateBillingForm({ discount: parseFloat(e.target.value) || 0 })} 
              className="h-8 text-sm text-right w-24"
            />
          </div>
          <div className="pt-3 border-t border-admin-border flex justify-between items-center">
            <span className="font-semibold text-admin-text-primary">Grand Total</span>
            <span className="text-xl font-bold text-admin-accent">{formatCurrency(grandTotalPreview)}</span>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer bg-admin-bg-subtle p-3 rounded-lg border border-admin-border hover:bg-admin-bg-hover transition-colors">
            <input 
              type="checkbox" 
              checked={billingForm.is_paid}
              onChange={e => onUpdateBillingForm({ is_paid: e.target.checked })}
              className="w-4 h-4 rounded text-admin-accent bg-admin-bg-surface border-admin-border focus:ring-admin-accent"
            />
            <span className="text-sm font-medium text-admin-text-primary">Mark as Paid</span>
          </label>
        </div>

      </div>
      <div className="flex justify-end border-t border-admin-border p-4 bg-admin-bg-subtle rounded-b-xl">
        <Button onClick={handleSaveBilling} isLoading={billingSaving} leftIcon={<Save size={16} />} className="w-full">
          Save Billing
        </Button>
      </div>
    </Card>
  );
}
