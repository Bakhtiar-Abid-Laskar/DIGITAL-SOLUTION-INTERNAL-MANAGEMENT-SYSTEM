"use client";
import React, { useState } from 'react';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Save, Printer } from "lucide-react";
import { formatCurrency } from '@repairshop/shared';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";

interface JobBillingCardProps {
  jobId: string;
  job: any;
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

type PrintStep = { label: string; done: boolean };

export function JobBillingCard({
  jobId, job, jobCode, materials, billing, billingForm, billingSaving,
  onUpdateBillingForm, onSetBillingSaving, onUpdateBilling, setConfirmModal
}: JobBillingCardProps) {
  const { showToast } = useToast();
  const [printSteps, setPrintSteps] = useState<PrintStep[] | null>(null);
  const [printProgress, setPrintProgress] = useState(0);

  // Service charge comes from the job's linked job_type
  const jobTypeRef = job?.job_type_ref;
  const serviceCharge = Number(jobTypeRef?.customer_charge_amount) || 0;
  const serviceTitle = jobTypeRef?.title || null;

  const partsTotal = materials.reduce((acc, m) => acc + (Number(m.total_cost) || 0), 0);
  const subtotal = partsTotal + serviceCharge;
  const taxAmount = subtotal * (billingForm.tax_percent / 100);
  const grandTotalPreview = Math.max(0, Math.round((subtotal + taxAmount - billingForm.discount) * 100) / 100);

  const executeSaveBilling = async () => {
    onSetBillingSaving(true);
    try {
      const itemsToBill = materials.map(m => {
        const qty = Number(m.quantity) || 1;
        const rate = Number(m.unit_cost) || 0;
        return {
          product_id: m.product_id || null,
          item_name: m.material_name,
          quantity: qty,
          unit_price: rate,
          selling_rate: rate,
          selling_amount: qty * rate,
        };
      });

      if (serviceCharge > 0) {
        itemsToBill.push({
          product_id: null,
          item_name: serviceTitle || 'Service Charge',
          quantity: 1,
          unit_price: serviceCharge,
          selling_rate: serviceCharge,
          selling_amount: serviceCharge,
        });
      }

      if (!billing?.id) {
        const { data, error } = await supabase.rpc('create_invoice', {
          p_customer_name: job?.customer_name || 'Walk-in',
          p_customer_contact: job?.customer_contact,
          p_customer_email: job?.customer_email,
          p_customer_gstin: job?.customer_gstin,
          p_items: itemsToBill,
          p_discount: billingForm.discount,
          p_payment_method: 'Cash',
          p_status: billingForm.is_paid ? 'paid' : 'draft',
          p_job_id: jobId
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('invoices').update({
          customer_name: job?.customer_name || 'Walk-in',
          customer_contact: job?.customer_contact,
          customer_email: job?.customer_email,
          customer_gstin: job?.customer_gstin,
          subtotal: subtotal,
          total_tax: taxAmount,
          discount: billingForm.discount,
          grand_total: grandTotalPreview,
          status: billingForm.is_paid ? 'paid' : 'draft',
          paid_at: billingForm.is_paid ? new Date().toISOString() : null,
        }).eq('id', billing.id);
        if (error) throw new Error(error.message);

        // Synchronize invoice items
        await supabase.from('invoice_items').delete().eq('invoice_id', billing.id);
        const newInvoiceItems = itemsToBill.map(it => ({
          invoice_id: billing.id,
          product_id: it.product_id,
          item_name: it.item_name,
          quantity: it.quantity,
          selling_rate: it.selling_rate,
          taxable_amount: it.selling_amount,
          line_total: it.selling_amount,
          discount_amount: 0,
        }));
        await supabase.from('invoice_items').insert(newInvoiceItems);
      }

      const { data } = await supabase.from('invoices').select('*, invoice_items(*)').eq('job_id', jobId).single();
      if (data) onUpdateBilling(data);
      showToast('Billing saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      onSetBillingSaving(false);
    }
  };

  const handleSaveBilling = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Billing Statement',
      message: `Save billing for job ${jobCode}? Grand Total: ₹${grandTotalPreview.toFixed(2)}.`,
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal(null);
        await executeSaveBilling();
      }
    });
  };

  const handlePrint = async () => {
    // ⚠️ MUST open the popup window SYNCHRONOUSLY (before any await) or browsers will block it
    const printWindow = window.open(
      '',
      '_blank',
      'width=950,height=1150,scrollbars=yes,toolbar=yes,menubar=yes'
    );

    if (!printWindow) {
      showToast('Popup blocked — please allow popups for this site and try again.', 'error');
      return;
    }

    // Show a loading placeholder in the popup immediately
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Generating Invoice…</title>
<style>body{margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a2e;color:#fff}
.box{text-align:center}.spinner{width:48px;height:48px;border:5px solid #ffffff33;border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
@keyframes spin{to{transform:rotate(360deg)}}h2{font-size:1.4rem;margin:0 0 8px}p{color:#aaa;margin:0}</style></head>
<body><div class="box"><div class="spinner"></div><h2>Generating Invoice…</h2><p>Please wait while we prepare your document.</p></div></body></html>`);

    const steps: PrintStep[] = [
      { label: 'Preparing invoice data', done: false },
      { label: 'Generating invoice layout', done: false },
      { label: 'Rendering PDF', done: false },
      { label: 'Opening invoice', done: false },
    ];
    setPrintSteps([...steps]);
    setPrintProgress(0);

    const advance = (idx: number) => {
      setPrintSteps(prev => prev!.map((s, i) => i <= idx ? { ...s, done: true } : s));
      setPrintProgress(Math.round(((idx + 1) / steps.length) * 100));
    };

    try {
      advance(0);

      // Build items strictly from current jobs page state
      const inlineItems = [
        ...materials.map((m, idx) => {
          const qty = Number(m.quantity) || 1;
          const rate = Number(m.unit_cost) || 0;
          return {
            sn: idx + 1,
            description: m.material_name || 'Material',
            qty,
            rate,
            amount: qty * rate,
          };
        }),
        ...(serviceCharge > 0 ? [{
          sn: materials.length + 1,
          description: serviceTitle || 'Service / Job Charge',
          qty: 1,
          rate: serviceCharge,
          amount: serviceCharge,
        }] : [])
      ];

      const inlineInvoiceData = {
        invoiceNo: billing?.invoice_code || jobCode || 'INV',
        invoiceDate: billing?.created_at || job?.created_at || new Date().toISOString(),
        customerName: job?.customer_name || 'Walk-in Customer',
        customerAddress: job?.customer_address || '—',
        customerPhone: job?.customer_contact || '—',
        customerEmail: job?.customer_email || '',
        customerGstin: job?.customer_gstin || undefined,
        items: inlineItems.length > 0 ? inlineItems : [{
          sn: 1,
          description: serviceTitle || 'Service / Repair',
          qty: 1,
          rate: subtotal,
          amount: subtotal,
        }],
        totals: {
          subtotal: subtotal,
          discount: Number(billingForm.discount) || 0,
          tax: taxAmount,
          total: grandTotalPreview,
        },
      };

      const req = {
        docType: (billing?.id ? 'final' : 'receipt') as 'final' | 'receipt',
        jobId: jobId,
        invoiceId: billing?.id || undefined,
        inline: inlineInvoiceData,
      };

      advance(1);

      // Fetch the rendered SVG invoice HTML from Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-invoice`;
      const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errJson.error || `Invoice generation failed (${response.status})`);
      }

      advance(2);
      const { html } = await response.json() as { html: string; driveLink: string | null };

      // Write final HTML to the already-open popup
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      advance(3);
      await new Promise(r => setTimeout(r, 600));
    } catch (e: any) {
      printWindow.close();
      showToast(e.message || 'Failed to generate invoice', 'error');
    } finally {
      setTimeout(() => {
        setPrintSteps(null);
        setPrintProgress(0);
      }, 600);
    }
  };

  return (
    <>
      <Card>
        <div className="p-6 border-b border-admin-border">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Billing & Status</h3>
        </div>
        <div className="p-6 pt-0 space-y-5 mt-4">

          <div className="space-y-3">
            {/* Parts Total */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-admin-text-secondary">Parts Total</span>
              <span className="font-medium text-admin-text-primary">{formatCurrency(partsTotal)}</span>
            </div>

            {/* Service / Job Type Charge */}
            {serviceTitle ? (
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-admin-text-secondary">Service Charge</span>
                  <span className="ml-2 text-xs text-admin-text-muted bg-admin-bg-subtle px-2 py-0.5 rounded-full border border-admin-border">
                    {serviceTitle}
                  </span>
                </div>
                <span className="font-medium text-admin-text-primary">{formatCurrency(serviceCharge)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm">
                <span className="text-admin-text-secondary text-xs italic">No service type linked</span>
                <span className="font-medium text-admin-text-muted">₹0.00</span>
              </div>
            )}

            {/* Tax */}
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

            {/* Discount */}
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

            {/* Grand Total */}
            <div className="pt-3 border-t border-admin-border flex justify-between items-center">
              <span className="font-semibold text-admin-text-primary">Grand Total</span>
              <span className="text-xl font-bold text-admin-accent">{formatCurrency(grandTotalPreview)}</span>
            </div>
          </div>

          {/* Mark as Paid */}
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

        {/* Footer buttons */}
        <div className="flex items-center gap-2 border-t border-admin-border p-4 bg-admin-bg-subtle rounded-b-xl">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!!printSteps}
            leftIcon={<Printer size={16} />}
            className="flex-1"
          >
            Print Invoice
          </Button>
          <Button
            onClick={handleSaveBilling}
            isLoading={billingSaving}
            leftIcon={<Save size={16} />}
            className="flex-1"
          >
            Save Billing
          </Button>
        </div>
      </Card>

      {/* Print Progress Overlay */}
      {printSteps && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-7 space-y-5" style={{ background: 'var(--admin-surface, #1e2030)', border: '1px solid rgba(255,255,255,0.08)' }}>
            
            {/* Header with spinner */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}>
                <svg className="animate-spin w-5 h-5" style={{ color: '#6366f1' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-white text-base">Generating Invoice</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Please wait…</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>Progress</span>
                <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>{printProgress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${printProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {printSteps.map((step, i) => {
                const isActive = !step.done && (i === 0 || printSteps[i - 1]?.done);
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {step.done ? (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#22c55e' }}>
                        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="white" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full shrink-0 border-2 border-indigo-400 animate-pulse" style={{ background: 'rgba(99,102,241,0.2)' }} />
                    ) : (
                      <div className="w-5 h-5 rounded-full shrink-0 border-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                    )}
                    <span style={{ color: step.done ? '#ffffff' : isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', fontWeight: step.done ? 500 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
