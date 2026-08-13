"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Button } from "@/components/common/Button";
import { Textarea } from "@/components/common/Textarea";
import { useToast } from "@/components/common/ToastProvider";
import { formatCurrency } from "@repairshop/shared";
import { openInvoicePrint } from '@/lib/invoiceClient';
import { useAppConfig } from "@/context/AppConfigContext";
import { 
  ArrowLeft, CheckCircle2, Plus, PlusCircle, Printer, Receipt, Trash2, 
  User as UserIcon, ShoppingBag, CreditCard, Package, Search 
} from "lucide-react";

// Types matching the RPC signatures
type InvoiceLineParams = {
  product_id?: string | null;
  item_name?: string | null;
  quantity: number;
  selling_rate?: number | null;
  selling_amount?: number | null;
  cgst_rate?: number | null;
  sgst_rate?: number | null;
  igst_rate?: number | null;
  tax_mode?: 'inclusive' | 'exclusive' | null;
};

type PreviewInvoiceResponse = {
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  discount: number;
  round_off: number;
  grand_total: number;
  items: Array<{
    item_name: string;
    quantity: number;
    selling_rate: number;
    taxable_amount: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    line_total: number;
  }>;
};

// Form state line
interface InvoiceLineForm {
  inventory_id: string; // Used to pick from catalog, not sent to RPC directly
  product_id: string | null;
  item_name: string;
  quantity: number;
  rate_input: string; // string for input typing
  amount_input: string; // string for input typing
  // custom service tax rates if no product
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  tax_mode: 'exclusive' | 'inclusive';
}

const emptyItem: InvoiceLineForm = {
  inventory_id: "",
  product_id: null,
  item_name: "",
  quantity: 1,
  rate_input: "",
  amount_input: "",
  cgst_rate: 9,
  sgst_rate: 9,
  igst_rate: 18,
  tax_mode: "exclusive"
};

export default function CreateSalePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdInvoiceCode, setCreatedInvoiceCode] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    customer_name: "",
    customer_contact: "",
    customer_email: "",
    customer_gstin: "",
    status: "paid" as const,
    payment_method: "Cash" as const,
    tax_regime: "intra_state" as const,
    discount: "0",
    notes: ""
  });

  const [items, setItems] = useState<InvoiceLineForm[]>([{ ...emptyItem }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Live Preview Data
  const [preview, setPreview] = useState<PreviewInvoiceResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Inventory Catalog State
  const [inventoryCatalog, setInventoryCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Load Inventory Catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, product_id, selling_rate, products(name, tax_mode, cgst_rate, sgst_rate, igst_rate)")
          .eq("products.is_active", true);

        if (!error && data) {
          setInventoryCatalog(data);
        }
      } catch (err) {
        console.error("Error fetching catalog:", err);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // Update preview whenever items or form inputs change
  useEffect(() => {
    const runPreview = async () => {
      // Don't preview if empty
      if (!items.some(i => i.item_name || (i.rate_input && i.quantity))) {
        setPreview(null);
        return;
      }

      setPreviewLoading(true);
      try {
        const payloadItems: InvoiceLineParams[] = items
          .filter(i => i.item_name || i.product_id)
          .map(i => ({
            product_id: i.product_id || null,
            item_name: i.item_name || null,
            quantity: Number(i.quantity) || 0,
            selling_rate: i.rate_input ? Number(i.rate_input) : null,
            selling_amount: i.amount_input ? Number(i.amount_input) : null,
            cgst_rate: i.product_id ? null : i.cgst_rate,
            sgst_rate: i.product_id ? null : i.sgst_rate,
            igst_rate: i.product_id ? null : i.igst_rate,
            tax_mode: i.product_id ? null : i.tax_mode
          }));

        const { data, error } = await supabase.rpc('preview_invoice', {
          p_items: payloadItems,
          p_tax_regime: form.tax_regime,
          p_discount: Number(form.discount) || 0
        });

        if (error) throw error;
        setPreview(data);
      } catch (err) {
        console.error("Preview error:", err);
      } finally {
        setPreviewLoading(false);
      }
    };

    // Debounce the preview slightly
    const timeout = setTimeout(runPreview, 300);
    return () => clearTimeout(timeout);
  }, [items, form.tax_regime, form.discount]);


  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customer_name.trim()) newErrors.customer_name = "Required";
    if (!form.customer_contact.trim()) newErrors.customer_contact = "Required";
    if (items.length === 0 || !items.some((item) => item.item_name.trim() || item.product_id)) {
      newErrors.items = "Add at least one item";
    }

    items.forEach((item, index) => {
      if (!item.item_name.trim() && !item.product_id) newErrors[`item_${index}`] = "Name required";
      if (Number(item.quantity) <= 0) newErrors[`qty_${index}`] = "> 0";
      if (!item.rate_input && !item.amount_input) newErrors[`rate_${index}`] = "Rate or Amount required";
    });

    if (Number(form.discount) < 0) newErrors.discount = "Cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateItem = (index: number, updates: Partial<InvoiceLineForm>) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleProductSelect = (index: number, inventoryId: string) => {
    const selected = inventoryCatalog.find(c => c.id === inventoryId);
    if (!selected) {
      updateItem(index, { inventory_id: "", product_id: null, item_name: "", rate_input: "" });
      return;
    }
    updateItem(index, {
      inventory_id: inventoryId,
      product_id: selected.product_id,
      item_name: selected.products?.name || "",
      rate_input: selected.selling_rate ? String(selected.selling_rate) : "",
      amount_input: "", // Clear amount to let rate take precedence
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payloadItems: InvoiceLineParams[] = items
        .filter(i => i.item_name || i.product_id)
        .map(i => ({
          product_id: i.product_id || null,
          item_name: i.item_name || null,
          quantity: Number(i.quantity) || 0,
          selling_rate: i.rate_input ? Number(i.rate_input) : null,
          selling_amount: i.amount_input ? Number(i.amount_input) : null,
          cgst_rate: i.product_id ? null : i.cgst_rate,
          sgst_rate: i.product_id ? null : i.sgst_rate,
          igst_rate: i.product_id ? null : i.igst_rate,
          tax_mode: i.product_id ? null : i.tax_mode
        }));

      const { data, error } = await supabase.rpc('create_invoice', {
        p_customer_name: form.customer_name,
        p_customer_contact: form.customer_contact || null,
        p_customer_email: form.customer_email || null,
        p_customer_gstin: form.customer_gstin || null,
        p_tax_regime: form.tax_regime,
        p_items: payloadItems,
        p_discount: Number(form.discount) || 0,
        p_payment_method: form.payment_method,
        p_status: form.status,
        p_notes: form.notes || null,
        p_job_id: null
      });

      if (error) throw error;
      
      setCreatedInvoiceCode(data.invoice_code);
      setCreatedInvoiceId(data.invoice_id);
      showToast("Invoice created successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to create invoice", "error");
    } finally {
      setLoading(false);
    }
  };

  if (createdInvoiceCode) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in h-full">
        <div className="w-20 h-20 bg-admin-completed-bg rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-admin-completed-fg" />
        </div>
        <h2 className="text-3xl font-bold text-admin-text-primary mb-2">Invoice Created!</h2>
        <p className="text-admin-text-secondary mb-8">Invoice Code: <span className="font-semibold text-admin-text-primary">{createdInvoiceCode}</span></p>
        
        <div className="flex gap-4">
          <Button variant="outline" leftIcon={<ArrowLeft size={16} />} onClick={() => router.push("/sales")}>
            Back to Invoices
          </Button>
          <Button leftIcon={<Printer size={16} />} onClick={() => {
            if (createdInvoiceId && preview) {
              openInvoicePrint({
                docType: 'sale',
                invoiceNo: createdInvoiceCode || undefined,
                date: new Date().toISOString(),
                customer: {
                  name: form.customer_name,
                  phone: form.customer_contact,
                  address: '',
                  gst: form.customer_gstin
                },
                items: preview.items.map(i => ({
                  description: i.item_name,
                  price: i.selling_rate,
                  unit: i.quantity
                })),
                discount: Number(form.discount) || 0
              });
            }
          }}>
            Print Invoice
          </Button>
          <Button variant="outline" leftIcon={<Plus size={16} />} onClick={() => {
            setCreatedInvoiceCode(null);
            setCreatedInvoiceId(null);
            setForm({...form, customer_name: "", customer_contact: "", discount: "0"});
            setItems([{...emptyItem}]);
          }}>
            New Invoice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">
      <PageHeader
        title="Create Invoice"
        description="Generate a new invoice or cash receipt."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3 border-b border-admin-border">
            <div className="flex items-center gap-2">
              <UserIcon size={18} className="text-admin-accent" />
              <CardTitle>Customer Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1 lg:col-span-2">
              <label htmlFor="field-d3hsx6" className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
              <Input id="field-d3hsx6" value={form.customer_name} onChange={(e) => setForm({...form, customer_name: e.target.value})} error={!!errors.customer_name} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label htmlFor="field-ashk0g" className="block text-sm font-medium text-admin-text-secondary mb-1">Contact Number *</label>
              <Input id="field-ashk0g" type="tel" value={form.customer_contact} onChange={(e) => setForm({...form, customer_contact: e.target.value})} error={!!errors.customer_contact} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label htmlFor="field-0mk4rt" className="block text-sm font-medium text-admin-text-secondary mb-1">Email (Optional)</label>
              <Input id="field-0mk4rt" type="email" value={form.customer_email} onChange={(e) => setForm({...form, customer_email: e.target.value})} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label htmlFor="field-g08t2w" className="block text-sm font-medium text-admin-text-secondary mb-1">GSTIN (Optional)</label>
              <Input id="field-g08t2w" value={form.customer_gstin} onChange={(e) => setForm({...form, customer_gstin: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b border-admin-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-admin-accent" />
                <CardTitle>Invoice Items</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                 <label htmlFor="field-7k3zn8" className="text-sm font-medium text-admin-text-secondary">Tax Regime:</label>
                 <Select id="field-7k3zn8" value={form.tax_regime} onChange={(e) => setForm({...form, tax_regime: e.target.value as any})} className="py-1 text-sm h-8">
                   <option value="intra_state">Intra-State (CGST + SGST)</option>
                   <option value="inter_state">Inter-State (IGST)</option>
                 </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto table-scroll-shadow">
              <table className="w-full text-left text-sm">
                <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/3">Item / Service</th>
                    <th className="px-4 py-3 font-medium w-24">Qty</th>
                    <th className="px-4 py-3 font-medium w-32">Rate (₹)</th>
                    <th className="px-4 py-3 font-medium w-32">Amount (₹)</th>
                    <th className="px-4 py-3 font-medium w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {items.map((item, index) => (
                    <tr key={index} className="bg-admin-bg-surface">
                      <td className="px-4 py-3 align-top">
                        <Select aria-label="Field" 
                          value={item.inventory_id} 
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="mb-2"
                        >
                          <option value="">-- Custom Service / Part --</option>
                          {inventoryCatalog.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.products?.name}
                            </option>
                          ))}
                        </Select>
                        {!item.inventory_id && (
                          <Input aria-label="Enter description..." 
                            placeholder="Enter description..." 
                            value={item.item_name}
                            onChange={(e) => updateItem(index, { item_name: e.target.value })}
                            error={!!errors[`item_${index}`]}
                            className="mt-2"
                          />
                        )}
                        <div className="text-xs text-admin-text-muted mt-1">
                          {preview?.items[index] && (
                            <span>Tax: {formatCurrency(preview.items[index].cgst_amount + preview.items[index].sgst_amount + preview.items[index].igst_amount)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Input aria-label="Field" 
                          type="number" min="1" 
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                          error={!!errors[`qty_${index}`]}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Input aria-label="Rate" 
                          type="number" step="0.01" min="0" placeholder="Rate"
                          value={item.rate_input}
                          onChange={(e) => updateItem(index, { rate_input: e.target.value, amount_input: "" })}
                          error={!!errors[`rate_${index}`]}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Input aria-label="Amount" 
                          type="number" step="0.01" min="0" placeholder="Amount"
                          value={item.amount_input}
                          onChange={(e) => updateItem(index, { amount_input: e.target.value, rate_input: "" })}
                        />
                      </td>
                      <td className="px-4 py-3 align-top text-center pt-5">
                        <button 
                          type="button" 
                          onClick={() => setItems(curr => curr.length > 1 ? curr.filter((_, i) => i !== index) : curr)}
                          className="text-admin-text-muted hover:text-admin-danger transition-colors p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-admin-border bg-admin-bg-subtle">
              <Button type="button" variant="outline" leftIcon={<Plus size={16} />} onClick={() => setItems([...items, { ...emptyItem }])}>
                Add Another Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b border-admin-border">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-admin-accent" />
                  <CardTitle>Payment & Notes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field-ys6nct" className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
                  <Select id="field-ys6nct" value={form.status} onChange={(e) => setForm({...form, status: e.target.value as any})}>
                    <option value="paid">Paid</option>
                    <option value="draft">Draft (Unpaid)</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="field-554kq6" className="block text-sm font-medium text-admin-text-secondary mb-1">Payment Method</label>
                  <Select id="field-554kq6" value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value as any})}>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="field-5zssix" className="block text-sm font-medium text-admin-text-secondary mb-1">Internal Notes (Optional)</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-4 border-b border-admin-border bg-admin-bg-subtle">
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Subtotal:</span>
                  <span className="font-medium text-admin-text-primary">
                    {formatCurrency(preview?.subtotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-admin-text-secondary">Discount (₹):</span>
                  <div className="w-24">
                    <Input id="field-5zssix" 
                      type="number" min="0" step="0.01" 
                      value={form.discount} 
                      onChange={(e) => setForm({...form, discount: e.target.value})} 
                      error={!!errors.discount}
                      className="text-right h-8 py-1"
                    />
                  </div>
                </div>
                {form.tax_regime === 'intra_state' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-admin-text-secondary">CGST:</span>
                      <span className="font-medium text-admin-text-primary">
                        {formatCurrency(preview?.total_cgst || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-admin-text-secondary">SGST:</span>
                      <span className="font-medium text-admin-text-primary">
                        {formatCurrency(preview?.total_sgst || 0)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-admin-text-secondary">IGST:</span>
                    <span className="font-medium text-admin-text-primary">
                      {formatCurrency(preview?.total_igst || 0)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Round Off:</span>
                  <span className="font-medium text-admin-text-primary">
                    {formatCurrency(preview?.round_off || 0)}
                  </span>
                </div>
                
                <div className="pt-4 border-t border-admin-border flex justify-between items-center">
                  <span className="text-base font-bold text-admin-text-primary">Grand Total:</span>
                  <span className="text-xl font-bold text-admin-accent">
                    {formatCurrency(preview?.grand_total || 0)}
                  </span>
                </div>
                
                <div className="pt-6">
                  <Button type="submit" className="w-full" disabled={loading} isLoading={loading}>
                    Create Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
