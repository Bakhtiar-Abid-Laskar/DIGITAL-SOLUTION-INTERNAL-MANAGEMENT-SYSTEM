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
import { ArrowLeft, Receipt, CreditCard } from "lucide-react";
import { Badge } from "@/components/common/Badge";

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-admin-text-muted">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title={isJob ? "Job Invoice Detail" : "Sale Detail"} 
          description={invoice.invoice_code}
        />
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
          <Card>
            <CardHeader className="flex items-center gap-2">
              <CreditCard size={18} className="text-admin-accent" />
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-4 text-sm">
              <div className="flex justify-between pb-4 border-b border-admin-border">
                <span className="text-admin-text-muted">Payment Method</span>
                <span className="font-medium text-admin-text-primary">{invoice.payment_method || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-muted">Grand Total</span>
                <span className="font-medium text-admin-text-primary">{formatCurrency(invoice.grand_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-muted">Amount Paid</span>
                <span className="font-bold text-admin-success-fg">{formatCurrency(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-admin-border">
                <span className="font-bold text-admin-text-primary">Balance Due</span>
                <span className={`font-bold ${balanceDue > 0 ? "text-admin-urgent-fg" : "text-admin-text-primary"}`}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>
          </Card>
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
                <th scope="col" className="px-6 py-3.5 text-right">Qty</th>
                <th scope="col" className="px-6 py-3.5 text-right">Rate</th>
                <th scope="col" className="px-6 py-3.5 text-right">Tax</th>
                <th scope="col" className="px-6 py-3.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
              {(invoice.invoice_items || []).map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-admin-text-primary">{item.item_name}</div>
                    {item.serial_number && <div className="text-xs text-admin-text-muted">SN: {item.serial_number}</div>}
                  </td>
                  <td className="px-6 py-4 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(item.selling_rate)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-admin-text-primary">
                      {formatCurrency(Number(item.cgst_amount) + Number(item.sgst_amount) + Number(item.igst_amount))}
                    </div>
                    <div className="text-xs text-admin-text-muted">
                      {invoice.tax_regime === 'inter_state' ? `IGST ${item.igst_rate}%` : `C${item.cgst_rate}% S${item.sgst_rate}%`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-admin-text-primary">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-admin-bg-subtle border-t border-admin-border">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right text-admin-text-muted">Subtotal</td>
                <td className="px-6 py-3 text-right font-medium text-admin-text-primary">{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right text-admin-text-muted">Total Tax</td>
                <td className="px-6 py-3 text-right font-medium text-admin-text-primary">{formatCurrency(invoice.total_tax)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right text-admin-text-muted">Discount</td>
                <td className="px-6 py-3 text-right font-medium text-admin-text-primary">-{formatCurrency(invoice.discount)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right font-bold text-admin-text-primary">Grand Total</td>
                <td className="px-6 py-3 text-right font-bold text-admin-text-primary">{formatCurrency(invoice.grand_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
