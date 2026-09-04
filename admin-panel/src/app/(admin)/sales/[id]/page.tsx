"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { formatCurrency } from '@repairshop/shared';
import { formatDate } from "@/utils/formatDate";
import { ArrowLeft, Receipt, CreditCard, Printer } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { PaymentRecordingBox } from "@/components/billing/PaymentRecordingBox";
import { openInvoicePrint } from "@/lib/invoiceClient";
import { PrintProgressModal, PrintProgressState } from "@/components/common/PrintProgressModal";
import { useToast } from "@/components/common/ToastProvider";

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [printState, setPrintState] = useState<PrintProgressState | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("invoices")
          .select(`*, invoice_items(*)`)
          .eq("id", id)
          .single();
        if (fetchError) throw fetchError;
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice details.");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-admin-text-muted">Loading invoice...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          Back
        </Button>
        <ErrorState message={error || "Invoice not found"} />
      </div>
    );
  }

  const isJob = !!invoice.job_id;
  const balanceDue = Number(invoice.grand_total) - Number(invoice.amount_paid);

  const handlePrint = async () => {
    setPrintState({ isOpen: true, percent: 15, message: 'Preparing invoice document...' });
    try {
      await openInvoicePrint(
        { docType: 'final', invoiceId: invoice.id },
        (percent, message) => setPrintState({ isOpen: true, percent, message })
      );
      setPrintState({ isOpen: true, percent: 100, message: 'Print dialog opened', isComplete: true });
      setTimeout(() => setPrintState(null), 1200);
    } catch (e: any) {
      setPrintState(null);
      showToast(e.message || 'Failed to print invoice', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-admin-text-muted">
            <ArrowLeft size={16} />
          </Button>
          <PageHeader 
            title={isJob ? "Job Invoice Detail" : "Sale Detail"} 
            description={invoice.invoice_code}
          />
        </div>
        <Button
          variant="outline"
          leftIcon={<Printer size={16} />}
          onClick={handlePrint}
        >
          Print Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Col */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Receipt size={18} className="text-admin-accent" />
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4 p-4 text-sm">
              <div className="text-admin-text-muted">Name</div>
              <div className="font-medium text-admin-text-primary text-right">{invoice.customer_name}</div>
              <div className="text-admin-text-muted">Contact</div>
              <div className="font-medium text-admin-text-primary text-right">{invoice.customer_contact || "—"}</div>
              <div className="text-admin-text-muted">Email</div>
              <div className="font-medium text-admin-text-primary text-right">{invoice.customer_email || "—"}</div>
              <div className="text-admin-text-muted">GSTIN</div>
              <div className="font-medium text-admin-text-primary text-right">{invoice.customer_gstin || "—"}</div>
            </div>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <Receipt size={18} className="text-admin-accent" />
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4 p-4 text-sm">
              <div className="text-admin-text-muted">Status</div>
              <div className="text-right">
                <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'cancelled' ? 'danger' : 'warning'}>
                  {(invoice.status || '').toUpperCase()}
                </Badge>
              </div>
              <div className="text-admin-text-muted">Date</div>
              <div className="font-medium text-admin-text-primary text-right">{formatDate(invoice.created_at)}</div>
              <div className="text-admin-text-muted">Tax Regime</div>
              <div className="font-medium text-admin-text-primary text-right">{invoice.tax_regime === 'inter_state' ? 'IGST' : 'CGST+SGST'}</div>
            </div>
          </Card>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <PaymentRecordingBox
            invoiceId={invoice.id}
            grandTotal={Number(invoice.grand_total) || 0}
            amountPaid={Number(invoice.amount_paid) || 0}
            paymentMethod={invoice.payment_method || "Cash"}
            status={invoice.status}
            onPaymentRecorded={(data) => {
              setInvoice((prev: any) => ({
                ...prev,
                amount_paid: data.amount_paid,
                status: data.status,
                paid_at: data.paid_at,
                payment_method: data.payment_method,
                grand_total: data.grand_total,
              }));
            }}
          />
        </div>
      </div>


      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-6 py-3.5">Item</th>
                <th scope="col" className="px-4 py-3.5">HSN/SAC</th>
                <th scope="col" className="px-4 py-3.5 text-center">Qty</th>
                <th scope="col" className="px-4 py-3.5 text-right">Price</th>
                <th scope="col" className="px-4 py-3.5 text-right">Tax (%)</th>
                <th scope="col" className="px-4 py-3.5 text-right">Tax Amt</th>
                <th scope="col" className="px-6 py-3.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
              {(invoice.invoice_items || []).map((item: any, idx: number) => {
                const taxPct = item.tax_percent !== undefined && item.tax_percent !== null
                  ? Number(item.tax_percent)
                  : (Number(item.cgst_rate || 0) + Number(item.sgst_rate || 0) || Number(item.igst_rate || 0) || 18);
                const taxAmt = Number(item.cgst_amount || 0) + Number(item.sgst_amount || 0) + Number(item.igst_amount || 0);

                return (
                  <tr key={item.id || idx}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-admin-text-primary">{item.item_name}</div>
                      {item.serial_number && <div className="text-xs text-admin-text-muted">SN: {item.serial_number}</div>}
                    </td>
                    <td className="px-4 py-4 text-admin-text-muted font-mono text-xs">
                      {item.hsn_code || "—"}
                    </td>
                    <td className="px-4 py-4 text-center">{item.quantity}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(item.selling_rate)}</td>
                    <td className="px-4 py-4 text-right font-medium text-admin-text-secondary">{taxPct}%</td>
                    <td className="px-4 py-4 text-right text-admin-text-primary">
                      {formatCurrency(taxAmt)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-admin-text-primary">{formatCurrency(item.line_total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-admin-bg-subtle border-t border-admin-border">
              <tr>
                <td colSpan={6} className="px-6 py-3 text-right text-admin-text-muted">Subtotal (Pre-Tax)</td>
                <td className="px-6 py-3 text-right font-medium text-admin-text-primary">{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="px-6 py-3 text-right text-admin-text-muted">Total Tax</td>
                <td className="px-6 py-3 text-right font-medium text-admin-text-primary">{formatCurrency(invoice.total_tax)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="px-6 py-3 text-right font-bold text-admin-text-primary">TOTAL</td>
                <td className="px-6 py-3 text-right font-extrabold text-admin-accent-text text-base">{formatCurrency(invoice.grand_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

      </Card>

      <PrintProgressModal state={printState} onClose={() => setPrintState(null)} />
    </div>
  );
}
