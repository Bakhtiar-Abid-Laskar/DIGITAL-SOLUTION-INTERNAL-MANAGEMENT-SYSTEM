"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Save, Printer, Wrench, Package, Hash, Tag, MessageCircle } from "lucide-react";
import { formatCurrency, calculateBillingTotals } from '@repairshop/shared';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";
import { PaymentRecordingBox } from "@/components/billing/PaymentRecordingBox";
import { openInvoicePrint } from "@/lib/invoiceClient";
import { PrintProgressModal, PrintProgressState } from "@/components/common/PrintProgressModal";

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

interface AdminItemizedLine {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  hsn_code?: string | null;
  serial_number?: string | null;
  product_id?: string | null;
  is_labour?: boolean;
}

export function JobBillingCard({
  jobId, job, jobCode, materials, billing, billingForm, billingSaving,
  onUpdateBillingForm, onSetBillingSaving, onUpdateBilling, setConfirmModal
}: JobBillingCardProps) {
  const { showToast } = useToast();
  const [printState, setPrintState] = useState<PrintProgressState | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Line items state
  const [lines, setLines] = useState<AdminItemizedLine[]>([]);

  // Initialize or synchronize line items
  useEffect(() => {
    if (billing?.invoice_items && billing.invoice_items.length > 0) {
      const loaded: AdminItemizedLine[] = billing.invoice_items.map((it: any) => ({
        id: it.id,
        item_name: it.item_name,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.selling_rate) || 0,
        tax_percent: it.tax_percent !== undefined && it.tax_percent !== null
          ? Number(it.tax_percent)
          : (Number(it.cgst_rate || 0) + Number(it.sgst_rate || 0) || Number(it.igst_rate || 0) || 18),
        hsn_code: it.hsn_code || null,
        serial_number: it.serial_number || null,
        product_id: it.product_id || null,
        is_labour: it.item_name === 'Labour Charge' || it.item_name === 'Service Charge' || it.item_name === job?.job_type_ref?.title,
      }));
      setLines(loaded);
    } else {
      // Build default lines from materials + linked service charge
      const defLines: AdminItemizedLine[] = materials.map(m => ({
        id: m.id,
        item_name: m.material_name,
        quantity: Number(m.quantity) || 1,
        unit_price: Number(m.unit_cost) || 0,
        tax_percent: 18,
        hsn_code: m.product?.hsn_sac || null,
        serial_number: null,
        product_id: m.product_id || null,
        is_labour: false,
      }));

      const serviceCharge = Number(job?.job_type_ref?.customer_charge_amount) || 0;
      const serviceTitle = job?.job_type_ref?.title || 'Service / Labour Charge';
      if (serviceCharge > 0 || defLines.length === 0) {
        defLines.push({
          id: 'admin-service-line',
          item_name: serviceTitle,
          quantity: 1,
          unit_price: serviceCharge,
          tax_percent: 18,
          is_labour: true,
        });
      }
      setLines(defLines);
    }
  }, [billing, materials, job]);

  const updateLine = (id: string, updates: Partial<AdminItemizedLine>) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  };

  const billingTotals = useMemo(() => calculateBillingTotals({ items: lines }), [lines]);
  const subtotal = billingTotals.subtotal;
  const totalTax = billingTotals.taxAmount;
  const grandTotalPreview = billingTotals.grandTotal;

  const executeSaveBilling = async () => {
    onSetBillingSaving(true);
    try {
      const itemsToBill = lines.map(line => ({
        product_id: line.product_id || null,
        item_name: line.item_name,
        quantity: Number(line.quantity) || 1,
        unit_price: Number(line.unit_price) || 0,
        selling_rate: Number(line.unit_price) || 0,
        selling_amount: (Number(line.quantity) || 1) * (Number(line.unit_price) || 0),
        tax_percent: Number(line.tax_percent) || 18,
        hsn_code: line.hsn_code || null,
        serial_number: line.serial_number || null,
      }));

      if (!billing?.id) {
        const { data, error } = await supabase.rpc('create_invoice', {
          p_customer_name: job?.customer_name || 'Walk-in',
          p_customer_contact: job?.customer_contact || null,
          p_customer_email: job?.customer_email || null,
          p_customer_gstin: job?.customer_gstin || null,
          p_items: itemsToBill,
          p_discount: 0,
          p_payment_method: 'Cash',
          p_status: billingForm.is_paid ? 'paid' : 'draft',
          p_job_id: jobId,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('invoices').update({
          customer_name: job?.customer_name || 'Walk-in',
          customer_contact: job?.customer_contact || null,
          customer_email: job?.customer_email || null,
          customer_gstin: job?.customer_gstin || null,
          subtotal: subtotal,
          total_tax: totalTax,
          discount: 0,
          grand_total: grandTotalPreview,
          status: billingForm.is_paid ? 'paid' : (billing.status || 'draft'),
          paid_at: billingForm.is_paid ? new Date().toISOString() : billing.paid_at,
        }).eq('id', billing.id);
        if (error) throw new Error(error.message);

        // Synchronize invoice items
        await supabase.from('invoice_items').delete().eq('invoice_id', billing.id);
        const newInvoiceItems = itemsToBill.map(it => {
          const taxable = it.selling_amount;
          const taxPct = it.tax_percent || 18;
          const cgstRate = Math.round((taxPct / 2) * 100) / 100;
          const sgstRate = Math.round((taxPct / 2) * 100) / 100;
          const cgstAmt = Math.round((taxable * cgstRate / 100) * 100) / 100;
          const sgstAmt = Math.round((taxable * sgstRate / 100) * 100) / 100;
          return {
            invoice_id: billing.id,
            product_id: it.product_id,
            item_name: it.item_name,
            quantity: it.quantity,
            selling_rate: it.selling_rate,
            hsn_code: it.hsn_code,
            tax_percent: taxPct,
            cgst_rate: cgstRate,
            sgst_rate: sgstRate,
            igst_rate: 0,
            taxable_amount: taxable,
            cgst_amount: cgstAmt,
            sgst_amount: sgstAmt,
            igst_amount: 0,
            line_total: taxable + cgstAmt + sgstAmt,
            discount_amount: 0,
            serial_number: it.serial_number,
          };
        });
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
      message: `Save itemized billing for job ${jobCode}? Grand Total: ₹${grandTotalPreview.toFixed(2)}.`,
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal(null);
        await executeSaveBilling();
      }
    });
  };

  const handlePrint = async () => {
    setPrintState({ isOpen: true, percent: 15, message: 'Preparing invoice...' });

    try {
      const inlineItems = lines.map((line, idx) => {
        const qty = Number(line.quantity) || 1;
        const rate = Number(line.unit_price) || 0;
        return {
          sn: idx + 1,
          description: line.item_name || 'Item',
          hsnCode: line.hsn_code || undefined,
          taxPercent: Number(line.tax_percent) || 18,
          serialNumber: line.serial_number || undefined,
          qty,
          rate,
          amount: qty * rate,
        };
      });

      const inlineInvoiceData = {
        invoiceNo: billing?.invoice_code || jobCode || 'INV',
        invoiceDate: billing?.created_at || job?.created_at || new Date().toISOString(),
        customerName: job?.customer_name || 'Walk-in Customer',
        customerAddress: job?.customer_address || '—',
        customerPhone: job?.customer_contact || '—',
        customerEmail: job?.customer_email || '',
        customerGstin: job?.customer_gstin || undefined,
        deviceSerialNumber: job?.serial_number || undefined,
        items: inlineItems,
        totals: {
          subtotal: subtotal,
          discount: 0,
          tax: totalTax,
          total: grandTotalPreview,
        },
      };

      await openInvoicePrint(
        {
          docType: (billing?.id ? 'final' : 'receipt') as 'final' | 'receipt',
          jobId: jobId,
          invoiceId: billing?.id || undefined,
          inline: inlineInvoiceData,
        },
        (percent, message) => {
          setPrintState({ isOpen: true, percent, message });
        }
      );

      setPrintState({ isOpen: true, percent: 100, message: 'Print dialog opened', isComplete: true });
      setTimeout(() => setPrintState(null), 1200);
    } catch (e: any) {
      setPrintState(null);
      showToast(e.message || 'Failed to generate invoice', 'error');
    }
  };

  const handleSendWhatsAppInvoice = async () => {
    if (!job?.customer_contact) {
      showToast('No customer contact number available', 'error');
      return;
    }
    setSendingWhatsApp(true);
    try {
      showToast('Sending WhatsApp invoice...', 'info');
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_INVOICE_PDF',
          phone: job.customer_contact,
          customerName: job.customer_name,
          invoiceCode: billing?.invoice_code || job.job_code,
          grandTotal: grandTotalPreview,
          jobId: jobId,
        }
      });
      if (!error && data?.success) {
        showToast('WhatsApp invoice sent successfully!', 'success');
      } else {
        const msg = `Hello ${job.customer_name}, your Digital Solution invoice for Job ${job.job_code} is ready.\n\nGrand Total: ${formatCurrency(grandTotalPreview)}\n\nThank you for choosing Digital Solution!`;
        window.open(`https://wa.me/${job.customer_contact.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        showToast('Opened WhatsApp chat draft', 'info');
      }
    } catch {
      const msg = `Hello ${job.customer_name}, your Digital Solution invoice for Job ${job.job_code} is ready.\n\nGrand Total: ${formatCurrency(grandTotalPreview)}\n\nThank you for choosing Digital Solution!`;
      window.open(`https://wa.me/${job.customer_contact.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <>
      <Card>
        <div className="p-6 border-b border-admin-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold leading-none tracking-tight">Itemized Billing</h3>
            {job?.serial_number && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
                <Hash size={12} />
                S/N: {job.serial_number}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Itemized Line Items Table */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
              Line Items & Charges
            </div>

            <div className="space-y-2">
              {lines.map((line) => {
                const qty = Number(line.quantity) || 1;
                const price = Number(line.unit_price) || 0;
                const taxRate = Number(line.tax_percent) || 18;
                const lineSubtotal = qty * price;
                const lineTax = lineSubtotal * (taxRate / 100);
                const lineTotal = lineSubtotal + lineTax;

                return (
                  <div
                    key={line.id}
                    className="p-3.5 rounded-xl bg-admin-bg-subtle border border-admin-border space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {line.is_labour ? (
                          <Wrench size={15} className="text-indigo-400" />
                        ) : (
                          <Package size={15} className="text-admin-text-muted" />
                        )}
                        <span className="text-sm font-semibold text-admin-text-primary">
                          {line.item_name}
                        </span>
                        {line.is_labour && (
                          <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                            SERVICE
                          </span>
                        )}
                        {line.hsn_code && (
                          <span className="text-[10px] font-medium text-admin-text-muted bg-admin-surface px-1.5 py-0.5 rounded border border-admin-border flex items-center gap-1">
                            <Tag size={10} /> HSN: {line.hsn_code}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-admin-text-primary">
                          {formatCurrency(lineTotal)}
                        </span>
                        <span className="block text-[10px] text-admin-text-muted">
                          (Tax: {formatCurrency(lineTax)})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-admin-border/50">
                      <div>
                        <label className="block text-[10px] font-medium text-admin-text-muted mb-1">
                          Qty
                        </label>
                        <Input
                          type="number"
                          min="1"
                          disabled={line.is_labour}
                          value={String(qty)}
                          onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 1 })}
                          className="h-7 text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-admin-text-muted mb-1">
                          Price (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(price)}
                          onChange={e => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-admin-text-muted mb-1">
                          Tax (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={String(taxRate)}
                          onChange={e => updateLine(line.id, { tax_percent: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs text-right"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="p-4 rounded-xl bg-admin-surface border border-admin-border space-y-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-admin-text-secondary">Subtotal</span>
              <span className="font-medium text-admin-text-primary">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-admin-text-secondary">Total Tax</span>
              <span className="font-medium text-admin-text-primary">{formatCurrency(totalTax)}</span>
            </div>
            <div className="pt-2.5 border-t border-admin-border flex justify-between items-center">
              <span className="font-bold text-admin-text-primary text-base">TOTAL</span>
              <span className="text-xl font-extrabold text-admin-accent">{formatCurrency(grandTotalPreview)}</span>
            </div>
          </div>

          {/* Unified Payment Recording Box */}
          <div className="pt-1">
            <PaymentRecordingBox
              invoiceId={billing?.id}
              grandTotal={billing?.grand_total ?? grandTotalPreview}
              amountPaid={billing?.amount_paid ?? 0}
              paymentMethod={billing?.payment_method || "Cash"}
              status={billing?.status}
              onPaymentRecorded={(data) => {
                onUpdateBilling({
                  ...(billing || {}),
                  id: data.invoice_id || billing?.id,
                  amount_paid: data.amount_paid,
                  status: data.status,
                  paid_at: data.paid_at,
                  payment_method: data.payment_method,
                  grand_total: data.grand_total,
                });
              }}
            />
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center gap-2 border-t border-admin-border p-4 bg-admin-bg-subtle rounded-b-xl">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!!printState}
            leftIcon={<Printer size={16} />}
            className="flex-1"
          >
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleSendWhatsAppInvoice}
            isLoading={sendingWhatsApp}
            leftIcon={<MessageCircle size={16} />}
            className="flex-1 text-emerald-500 hover:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            WhatsApp
          </Button>
          <Button
            onClick={handleSaveBilling}
            isLoading={billingSaving}
            leftIcon={<Save size={16} />}
            className="flex-1"
          >
            {billing?.id ? 'Update' : 'Save'}
          </Button>
        </div>
      </Card>

      {/* Modern Print Progress Modal with Animated Percentage Bar */}
      <PrintProgressModal state={printState} onClose={() => setPrintState(null)} />
    </>
  );
}
