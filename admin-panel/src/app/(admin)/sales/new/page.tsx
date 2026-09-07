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
import { formatCurrency, Customer, forwardCalcLine, reverseCalcLineFromTotal, recalcBill, reverseCalcBillFromGrandTotal, roundMoney, LineItem } from "@repairshop/shared";
import { openInvoicePrint } from '@/lib/invoiceClient';
import { CustomerTypeahead } from "@/components/customers/CustomerTypeahead";
import { PrintProgressModal, PrintProgressState } from "@/components/common/PrintProgressModal";
import { SerialSelectionDropdown } from "@/components/inventory/SerialSelectionDropdown";
import { 
  ArrowLeft, CheckCircle2, Plus, PlusCircle, Printer, Trash2, 
  User as UserIcon, ShoppingBag, CreditCard, Package, Search, Tag, Hash, X 
} from "lucide-react";

// Types matching the RPC signatures
type InvoiceLineParams = {
  product_id?: string | null;
  item_name?: string | null;
  quantity: number;
  selling_rate?: number | null;
  selling_amount?: number | null;
  serial_number?: string | null;
  hsn_code?: string | null;
  tax_percent?: number | null;
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
    hsn_code?: string;
    tax_percent?: number;
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
  line_total_input?: string; // string for line total input typing
  serial_number: string;
  selected_serial_ids?: string[];
  selected_serial_numbers?: string[];
  hsn_code: string;
  tax_percent: number; // defaults to 18
  tax_mode: 'exclusive' | 'inclusive';
  is_rate_auto_derived?: boolean;
}

const emptyItem: InvoiceLineForm = {
  inventory_id: "",
  product_id: null,
  item_name: "",
  quantity: 1,
  rate_input: "",
  amount_input: "",
  line_total_input: undefined,
  serial_number: "",
  selected_serial_ids: [],
  selected_serial_numbers: [],
  hsn_code: "",
  tax_percent: 18,
  tax_mode: "exclusive",
  is_rate_auto_derived: false,
};

export default function CreateSalePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdInvoiceCode, setCreatedInvoiceCode] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [printState, setPrintState] = useState<PrintProgressState | null>(null);

  // Form State
  const [form, setForm] = useState({
    customer_id: null as string | null,
    customer_name: "",
    customer_contact: "",
    customer_email: "",
    customer_gstin: "",
    customer_address: "",
    status: "paid" as 'paid' | 'draft',
    payment_method: "Cash" as 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other',
    tax_regime: "intra_state" as 'intra_state' | 'inter_state',
    discount: "0",
    notes: "",
    amount_paid: "" // Leave empty for auto-fill based on grand_total
  });

  const [items, setItems] = useState<InvoiceLineForm[]>([{ ...emptyItem }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Live Preview Data
  const [preview, setPreview] = useState<PreviewInvoiceResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [grandTotalInput, setGrandTotalInput] = useState<string | null>(null);

  const handleGrandTotalChange = (newGrandTotal: number, isBlur = false) => {
    const lineItems: LineItem[] = items.map((it, idx) => ({
      id: String(idx),
      qty: Number(it.quantity) || 1,
      rate: Number(it.rate_input) || 0,
      taxPct: Number(it.tax_percent) || 18,
    }));

    const result = reverseCalcBillFromGrandTotal(lineItems, newGrandTotal, form.tax_regime);

    setItems(prev =>
      prev.map((item, idx) => {
        const scaled = result.items[idx];
        if (!scaled) return item;
        return {
          ...item,
          rate_input: String(scaled.rate),
          amount_input: String(scaled.subtotal),
          line_total_input: isBlur ? scaled.lineTotal.toFixed(2) : (item.line_total_input || scaled.lineTotal.toFixed(2)),
          is_rate_auto_derived: true,
        };
      })
    );

    setPreview({
      subtotal: result.billSubtotal,
      total_cgst: result.cgst,
      total_sgst: result.sgst,
      total_igst: result.igst,
      total_tax: result.billTax,
      discount: 0,
      round_off: 0,
      grand_total: result.grandTotal,
      items: result.items.map((it, idx) => ({
        item_name: items[idx]?.item_name || 'Item',
        quantity: it.qty,
        selling_rate: it.rate,
        taxable_amount: it.subtotal,
        hsn_code: items[idx]?.hsn_code || undefined,
        tax_percent: it.taxPct,
        cgst_rate: form.tax_regime === 'intra_state' ? it.taxPct / 2 : 0,
        cgst_amount: form.tax_regime === 'intra_state' ? roundMoney(it.taxAmount / 2) : 0,
        sgst_rate: form.tax_regime === 'intra_state' ? it.taxPct / 2 : 0,
        sgst_amount: form.tax_regime === 'intra_state' ? roundMoney(it.taxAmount / 2) : 0,
        igst_rate: form.tax_regime === 'inter_state' ? it.taxPct : 0,
        igst_amount: form.tax_regime === 'inter_state' ? it.taxAmount : 0,
        line_total: it.lineTotal,
      })),
    });
  };

  // Inventory Catalog State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState<number | null>(null);
  const [focusedResultIndex, setFocusedResultIndex] = useState<number>(-1);

  const activeQuery = activeItemSearchIndex !== null ? items[activeItemSearchIndex]?.item_name : "";

  // Debounced Remote Search
  useEffect(() => {
    if (activeItemSearchIndex === null) {
      setSearchResults([]);
      setIsSearching(false);
      setFocusedResultIndex(-1);
      return;
    }

    const query = (activeQuery || "").trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      setFocusedResultIndex(-1);
      return;
    }

    const searchCatalog = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, product_id, selling_rate, quantity_cached, products!inner(name, sku, hsn_sac, unit, tax_mode, cgst_rate, sgst_rate, igst_rate, is_active)")
          .eq("products.is_active", true)
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { referencedTable: 'products' })
          .limit(15);

        if (!error && data) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        console.error("Error searching catalog:", err?.message || err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
        setFocusedResultIndex(-1);
      }
    };

    const timeout = setTimeout(searchCatalog, 300);
    return () => clearTimeout(timeout);
  }, [activeItemSearchIndex, activeQuery]);

  const getProductName = (inv: any): string => {
    if (!inv) return "";
    if (Array.isArray(inv.products)) return inv.products[0]?.name || "";
    return inv.products?.name || "";
  };

  const getProductSKU = (inv: any): string => {
    if (!inv) return "";
    const p = Array.isArray(inv.products) ? inv.products[0] : inv.products;
    return p?.sku || "";
  };

  const getProductStock = (inv: any): number => {
    return Number(inv?.quantity_cached) || 0;
  };

  // Update preview whenever items or form inputs change
  useEffect(() => {
    const runPreview = async () => {
      if (!items.some(i => i.item_name?.trim() || i.product_id || (i.rate_input && i.quantity))) {
        setPreview(null);
        return;
      }

      setPreviewLoading(true);
      try {
        const payloadItems: InvoiceLineParams[] = items
          .filter(i => (i.item_name?.trim() || i.product_id) && (i.rate_input || i.amount_input))
          .map(i => ({
            product_id: i.product_id || null,
            item_name: i.item_name?.trim() || null,
            quantity: Math.max(1, Number(i.quantity) || 1),
            selling_rate: i.rate_input ? Number(i.rate_input) : null,
            selling_amount: i.amount_input ? Number(i.amount_input) : null,
            serial_number: i.serial_number || null,
            hsn_code: i.hsn_code || null,
            tax_percent: Number(i.tax_percent) || 18,
            tax_mode: i.tax_mode || 'exclusive'
          }));

        if (payloadItems.length === 0) {
          setPreview(null);
          return;
        }

        const { data, error } = await supabase.rpc('preview_invoice', {
          p_items: payloadItems,
          p_tax_regime: form.tax_regime,
          p_discount: 0
        });

        if (error) {
          console.warn("Preview RPC notice:", error.message || error);
          let subtotal = 0;
          let totalTax = 0;
          const calculatedItems = payloadItems.map(item => {
            const rate = item.selling_rate || (item.selling_amount ? item.selling_amount / item.quantity : 0);
            const lineSub = rate * item.quantity;
            subtotal += lineSub;
            const taxPct = Number(item.tax_percent) || 18;
            const lineTax = (lineSub * taxPct) / 100;
            totalTax += lineTax;
            return {
              item_name: item.item_name || 'Item',
              quantity: item.quantity,
              selling_rate: rate,
              taxable_amount: lineSub,
              hsn_code: item.hsn_code || undefined,
              tax_percent: taxPct,
              cgst_rate: form.tax_regime === 'intra_state' ? taxPct / 2 : 0,
              cgst_amount: form.tax_regime === 'intra_state' ? lineTax / 2 : 0,
              sgst_rate: form.tax_regime === 'intra_state' ? taxPct / 2 : 0,
              sgst_amount: form.tax_regime === 'intra_state' ? lineTax / 2 : 0,
              igst_rate: form.tax_regime === 'inter_state' ? taxPct : 0,
              igst_amount: form.tax_regime === 'inter_state' ? lineTax : 0,
              line_total: lineSub + lineTax
            };
          });
          const grandTotal = Math.max(0, subtotal + totalTax);
          setPreview({
            subtotal,
            total_cgst: form.tax_regime === 'intra_state' ? totalTax / 2 : 0,
            total_sgst: form.tax_regime === 'intra_state' ? totalTax / 2 : 0,
            total_igst: form.tax_regime === 'inter_state' ? totalTax : 0,
            total_tax: totalTax,
            discount: 0,
            round_off: 0,
            grand_total: grandTotal,
            items: calculatedItems
          });
          return;
        }

        setPreview(data);
      } catch (err: any) {
        console.error("Preview error:", err?.message || err || "Unknown preview error");
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timeout = setTimeout(runPreview, 300);
    return () => clearTimeout(timeout);
  }, [items, form.tax_regime]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.customer_name.trim()) newErrors.customer_name = "Required";
    if (!form.customer_contact.trim()) newErrors.customer_contact = "Required";
    if (items.length === 0 || !items.some((item) => item.item_name?.trim() || item.product_id)) {
      newErrors.items = "Add at least one item";
    }

    items.forEach((item, index) => {
      if (!item.item_name?.trim() && !item.product_id) newErrors[`item_${index}`] = "Name required";
      if (Number(item.quantity) <= 0) newErrors[`qty_${index}`] = "> 0";
      if (!item.rate_input && !item.amount_input) newErrors[`rate_${index}`] = "Rate required";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateItem = (index: number, updates: Partial<InvoiceLineForm>) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleProductSelect = (index: number, inv: any) => {
    if (!inv) {
      updateItem(index, { inventory_id: "", product_id: null, item_name: "", rate_input: "", amount_input: "", line_total_input: undefined, is_rate_auto_derived: false, serial_number: "", hsn_code: "" });
      return;
    }
    const productName = getProductName(inv);
    const prod = Array.isArray(inv.products) ? inv.products[0] : inv.products;
    const rate = inv.selling_rate ? Number(inv.selling_rate) : 0;
    const qty = items[index].quantity || 1;
    const defaultTax = prod?.cgst_rate ? (Number(prod.cgst_rate) + Number(prod.sgst_rate)) : 18;
    
    updateItem(index, {
      inventory_id: inv.id,
      product_id: inv.product_id,
      item_name: productName,
      hsn_code: prod?.hsn_sac || "",
      tax_percent: defaultTax,
      rate_input: rate ? String(rate) : "",
      amount_input: rate ? String(rate * qty) : "",
      line_total_input: undefined,
      is_rate_auto_derived: false,
      serial_number: "",
      tax_mode: prod?.tax_mode || 'exclusive'
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
          serial_number: i.serial_number || null,
          hsn_code: i.hsn_code || null,
          tax_percent: Number(i.tax_percent) || 18,
          tax_mode: i.tax_mode || 'exclusive'
        }));

      // Central Customer Directory: Upsert or link customer
      let customerId = form.customer_id;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: custData, error: custErr } = await supabase.rpc('find_or_create_customer', {
          p_customer_id: customerId || null,
          p_name: form.customer_name.trim() || 'Walk-in Customer',
          p_phone: form.customer_contact.trim() || null,
          p_email: form.customer_email.trim() || null,
          p_gstin: form.customer_gstin.trim() || null,
          p_address: form.customer_address.trim() || null,
          p_created_via: 'sale',
          p_user_id: user?.id,
        });
        if (!custErr && custData?.id) {
          customerId = custData.id;
        }
      } catch (e) {
        console.warn('Customer upsert warning:', e);
      }

      if (!customerId) {
        throw new Error('Customer could not be resolved. Please enter valid customer details.');
      }

      const { data, error } = await supabase.rpc('create_invoice', {
        p_customer_name: form.customer_name,
        p_customer_id: customerId,
        p_customer_contact: form.customer_contact || null,
        p_customer_email: form.customer_email || null,
        p_customer_gstin: form.customer_gstin || null,
        p_customer_address: form.customer_address || null,
        p_tax_regime: form.tax_regime,
        p_items: payloadItems,
        p_discount: 0,
        p_payment_method: form.payment_method,
        p_status: form.status,
        p_notes: form.notes || null,
        p_job_id: null,
        p_amount_paid: form.amount_paid !== "" ? Number(form.amount_paid) : null
      });

      if (error) throw new Error(error.message);

      // Atomically claim selected serial numbers
      const serialClaims = items
        .map((it, idx) => ({
          line_index: idx,
          product_id: it.product_id || null,
          serial_ids: it.selected_serial_ids || [],
        }))
        .filter((c) => c.serial_ids.length > 0);

      if (serialClaims.length > 0 && data?.invoice_id) {
        const { error: claimErr } = await supabase.rpc('claim_invoice_serials', {
          p_invoice_id: data.invoice_id,
          p_claims: serialClaims,
        });

        if (claimErr) {
          console.error('Serial claim warning:', claimErr);
          showToast(`Invoice created, but serial claim notice: ${claimErr.message}`, 'error');
        }
      }

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
          <Button 
            leftIcon={<Printer size={16} />} 
            onClick={async () => {
              if (!createdInvoiceId) return;
              setPrintState({ isOpen: true, percent: 15, message: 'Preparing invoice document...' });
              try {
                await openInvoicePrint(
                  { docType: 'final', invoiceId: createdInvoiceId },
                  (percent, message) => setPrintState({ isOpen: true, percent, message })
                );
                setPrintState({ isOpen: true, percent: 100, message: 'Print dialog opened', isComplete: true });
                setTimeout(() => setPrintState(null), 1200);
              } catch (e: any) {
                setPrintState(null);
                showToast(e.message || 'Failed to print invoice', 'error');
              }
            }}
          >
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

        <PrintProgressModal state={printState} onClose={() => setPrintState(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-admin-text-muted">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title="New Counter Sale" 
          description="Create an itemized GST invoice with per-line editable tax & prices"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3 border-b border-admin-border">
            <div className="flex items-center gap-2">
              <UserIcon size={18} className="text-admin-accent" />
              <CardTitle>Customer Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
              <CustomerTypeahead
                name={form.customer_name}
                selectedCustomerId={form.customer_id}
                onSelectCustomer={(c: Customer) => {
                  setForm(prev => ({
                    ...prev,
                    customer_id: c.id,
                    customer_name: c.name,
                    customer_contact: c.phone || "",
                    customer_email: c.email || "",
                    customer_gstin: c.gstin || "",
                    customer_address: c.address || "",
                  }));
                }}
                onChangeName={(val: string) => setForm(prev => ({ ...prev, customer_name: val, customer_id: null }))}
                onClearCustomer={() => setForm(prev => ({ ...prev, customer_id: null }))}
                error={errors.customer_name}
                placeholder="Search existing customer or enter name..."
              />
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Contact Number *</label>
              <Input type="tel" value={form.customer_contact} onChange={(e) => setForm({...form, customer_contact: e.target.value})} error={!!errors.customer_contact} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Email (Optional)</label>
              <Input type="email" value={form.customer_email} onChange={(e) => setForm({...form, customer_email: e.target.value})} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">GSTIN (Optional)</label>
              <Input value={form.customer_gstin} onChange={(e) => setForm({...form, customer_gstin: e.target.value})} />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Billing & Delivery Address (Optional)</label>
              <Textarea
                rows={2}
                value={form.customer_address}
                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                placeholder="Enter customer physical address..."
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardHeader className="pb-3 border-b border-admin-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-admin-accent" />
                <CardTitle>Itemized Charges</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-admin-text-secondary">Tax Regime:</label>
                 <Select value={form.tax_regime} onChange={(e) => setForm({...form, tax_regime: e.target.value as any})} className="py-1 text-sm h-8">
                   <option value="intra_state">Intra-State (CGST + SGST)</option>
                   <option value="inter_state">Inter-State (IGST)</option>
                 </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-visible">
            <div className="w-full overflow-visible table-scroll-shadow pr-2">
              <table className="w-full text-left text-sm">
                <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-[200px]">Item / Service</th>
                    <th className="px-3 py-3 font-medium w-24">HSN/SAC</th>
                    <th className="px-3 py-3 font-medium w-32">Serial No.</th>
                    <th className="px-3 py-3 font-medium w-16 text-center">Qty</th>
                    <th className="px-3 py-3 font-medium w-36 text-right">Price (₹)</th>
                    <th className="px-3 py-3 font-medium w-20 text-right">Tax (%)</th>
                    <th className="px-3 py-3 font-medium w-40 text-right">Line Total</th>
                    <th className="px-3 py-3 font-medium w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {items.map((item, index) => {
                    const isSelectedFromCatalog = Boolean(item.inventory_id && item.product_id);
                    const qty = Number(item.quantity) || 1;
                    const price = Number(item.rate_input) || 0;
                    const taxRate = Number(item.tax_percent) || 18;
                    const lineSub = qty * price;
                    const lineTax = lineSub * (taxRate / 100);
                    const lineTotal = lineSub + lineTax;

                    return (
                      <tr key={index} className="bg-admin-bg-surface">
                        <td className="px-4 py-3 align-top relative">
                          <div className="relative">
                            <div className="flex items-center gap-1">
                              <div className="relative flex-1">
                                <Input
                                  aria-label="Item / Service Name"
                                  placeholder="Search catalog or type custom item..."
                                  value={item.item_name}
                                  onChange={(e) => {
                                    updateItem(index, { 
                                      item_name: e.target.value,
                                      inventory_id: "",
                                      product_id: null
                                    });
                                    setActiveItemSearchIndex(index);
                                  }}
                                  onFocus={() => setActiveItemSearchIndex(index)}
                                  onKeyDown={(e) => {
                                    if (activeItemSearchIndex !== index) return;
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      const maxIndex = item.item_name?.trim() ? searchResults.length : searchResults.length - 1;
                                      setFocusedResultIndex(prev => Math.min(prev + 1, maxIndex));
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setFocusedResultIndex(prev => Math.max(prev - 1, -1));
                                    } else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (focusedResultIndex >= 0 && focusedResultIndex < searchResults.length) {
                                        handleProductSelect(index, searchResults[focusedResultIndex]);
                                        setActiveItemSearchIndex(null);
                                      } else if (focusedResultIndex === searchResults.length || item.item_name?.trim()) {
                                        updateItem(index, { inventory_id: "", product_id: null });
                                        setActiveItemSearchIndex(null);
                                      }
                                    }
                                  }}
                                  error={!!errors[`item_${index}`]}
                                  className="w-full pr-8 text-sm h-10"
                                />
                                <Search size={14} className="absolute right-2.5 top-3 text-admin-text-muted pointer-events-none" />
                              </div>

                              {isSelectedFromCatalog && (
                                <button
                                  type="button"
                                  title="Clear linked product"
                                  onClick={() => handleProductSelect(index, null)}
                                  className="text-xs text-admin-text-muted hover:text-admin-danger px-1"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            {/* Search Suggestions Popover */}
                            {activeItemSearchIndex === index && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveItemSearchIndex(null)} 
                                />
                                <div className="absolute left-0 right-0 top-full mt-1 bg-admin-bg-surface border border-admin-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto divide-y divide-admin-border animate-fade-in">
                                  <div className="px-3 py-2 text-xs font-semibold text-admin-text-muted bg-admin-bg-subtle flex justify-between">
                                    <span>Inventory Catalog {isSearching ? "(Searching...)" : `(${searchResults.length} matches)`}</span>
                                    <span>Stock • Price</span>
                                  </div>

                                  {isSearching ? (
                                    <div className="px-3 py-3 text-sm text-admin-text-secondary text-center">
                                      Searching...
                                    </div>
                                  ) : searchResults.length > 0 ? (
                                    searchResults.map((inv, i) => {
                                      const pName = getProductName(inv);
                                      const pSku = getProductSKU(inv);
                                      const stock = getProductStock(inv);
                                      const isFocused = i === focusedResultIndex;
                                      return (
                                        <button
                                          key={inv.id}
                                          type="button"
                                          className={`w-full px-3 py-2.5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm transition-colors ${isFocused ? 'bg-admin-bg-subtle border-l-2 border-admin-accent' : 'hover:bg-admin-bg-subtle'}`}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleProductSelect(index, inv);
                                            setActiveItemSearchIndex(null);
                                          }}
                                          onMouseEnter={() => setFocusedResultIndex(i)}
                                        >
                                          <div className="font-medium text-admin-text-primary truncate flex flex-col">
                                            <span>{pName}</span>
                                            {pSku && <span className="text-xs text-admin-text-muted font-normal mt-0.5">SKU: {pSku}</span>}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                              stock > 0 ? 'bg-admin-completed-bg text-admin-completed-fg' : 'bg-admin-urgent-bg text-admin-urgent-fg'
                                            }`}>
                                              {stock} in stock
                                            </span>
                                            <span className="font-semibold text-admin-text-primary">
                                              {formatCurrency(inv.selling_rate || 0)}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-admin-text-muted">
                                      No inventory matches. You can use &quot;{item.item_name || 'custom item'}&quot; as a custom line item.
                                    </div>
                                  )}

                                  {item.item_name?.trim() && (
                                    <button
                                      type="button"
                                      className={`w-full px-3 py-3 text-left hover:bg-admin-accent/10 text-admin-accent text-sm font-medium border-t border-admin-border flex items-center gap-1.5 ${focusedResultIndex === searchResults.length ? 'bg-admin-accent/10' : ''}`}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        updateItem(index, { inventory_id: "", product_id: null });
                                        setActiveItemSearchIndex(null);
                                      }}
                                      onMouseEnter={() => setFocusedResultIndex(searchResults.length)}
                                    >
                                      <PlusCircle size={16} />
                                      Use custom item &quot;{item.item_name}&quot;
                                    </button>
                                  )}
                                </div>
                              </>
                            )}

                            {isSelectedFromCatalog && (
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-admin-completed-fg font-medium">
                                <Package size={12} />
                                <span>Catalog Product Linked</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* HSN Code */}
                        <td className="px-3 py-3 align-top">
                          <Input
                            aria-label="HSN Code"
                            type="text"
                            placeholder="HSN"
                            value={item.hsn_code || ""}
                            onChange={(e) => updateItem(index, { hsn_code: e.target.value })}
                            className="text-xs h-10 px-2.5"
                          />
                        </td>

                        {/* Serial Number */}
                        <td className="px-3 py-3 align-top min-w-[140px] max-w-[200px]">
                          <SerialSelectionDropdown
                            productId={item.product_id}
                            productName={item.item_name}
                            maxQuantity={item.quantity}
                            selectedSerialIds={item.selected_serial_ids || []}
                            selectedSerialNumbers={item.selected_serial_numbers || []}
                            legacyFreeText={item.serial_number}
                            onChange={(ids, numbers, freeText) => {
                              updateItem(index, {
                                selected_serial_ids: ids,
                                selected_serial_numbers: numbers,
                                serial_number: numbers.length > 0 ? numbers.join(', ') : (freeText || ''),
                              });
                            }}
                          />
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-3 align-top">
                          <Input
                            aria-label="Quantity" 
                            type="number"
                            min="1" 
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              const rate = Number(item.rate_input);
                              const calc = forwardCalcLine({ id: String(index), qty, rate, taxPct: Number(item.tax_percent) || 18 });
                              updateItem(index, { 
                                quantity: qty, 
                                amount_input: rate && qty ? String(calc.subtotal) : item.amount_input,
                                line_total_input: undefined,
                                is_rate_auto_derived: false,
                              });
                            }}
                            error={!!errors[`qty_${index}`]}
                            className="text-xs text-center h-10 px-1 font-semibold"
                          />
                        </td>

                        {/* Price (Rate) */}
                        <td className="px-3 py-3 align-top">
                          <Input
                            aria-label="Rate" 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.rate_input}
                            onChange={(e) => {
                              const rate = Number(e.target.value);
                              const qty = item.quantity;
                              const calc = forwardCalcLine({ id: String(index), qty, rate, taxPct: Number(item.tax_percent) || 18 });
                              updateItem(index, { 
                                rate_input: e.target.value, 
                                amount_input: rate && qty ? String(calc.subtotal) : "",
                                line_total_input: undefined,
                                is_rate_auto_derived: false,
                              });
                            }}
                            error={!!errors[`rate_${index}`]}
                            className="text-xs text-right h-10 px-2.5 font-medium"
                          />
                          <div className="flex justify-end mt-1 min-h-[18px]">
                            {item.is_rate_auto_derived ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                Auto-calc
                              </span>
                            ) : (
                              <span className="text-[10px] text-admin-text-muted">Rate / unit</span>
                            )}
                          </div>
                        </td>

                        {/* Tax % */}
                        <td className="px-3 py-3 align-top">
                          <Input
                            aria-label="Tax %" 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="18"
                            value={String(item.tax_percent ?? 18)}
                            onChange={(e) => {
                              const tax = parseFloat(e.target.value) || 0;
                              updateItem(index, { 
                                tax_percent: tax,
                                line_total_input: undefined,
                                is_rate_auto_derived: false,
                              });
                            }}
                            className="text-xs text-right h-10 px-2"
                          />
                        </td>

                        {/* Line Total (Editable) */}
                        <td className="px-3 py-3 align-top text-right">
                          <Input
                            aria-label="Line Total"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.line_total_input !== undefined ? item.line_total_input : (lineTotal ? lineTotal.toFixed(2) : "")}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              const parsed = parseFloat(valStr);
                              if (valStr === "" || isNaN(parsed)) {
                                updateItem(index, { line_total_input: valStr });
                                return;
                              }
                              const targetTotal = Math.max(0, parsed);
                              const res = reverseCalcLineFromTotal(
                                { id: String(index), qty: item.quantity || 1, rate: Number(item.rate_input) || 0, taxPct: Number(item.tax_percent) || 18 },
                                targetTotal
                              );
                              updateItem(index, {
                                line_total_input: valStr,
                                rate_input: String(res.rate),
                                amount_input: String(res.subtotal),
                                is_rate_auto_derived: true,
                              });
                            }}
                            onBlur={() => {
                              if (item.line_total_input !== undefined) {
                                const parsed = parseFloat(item.line_total_input);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  const res = reverseCalcLineFromTotal(
                                    { id: String(index), qty: item.quantity || 1, rate: Number(item.rate_input) || 0, taxPct: Number(item.tax_percent) || 18 },
                                    parsed
                                  );
                                  updateItem(index, {
                                    line_total_input: res.lineTotal.toFixed(2),
                                    rate_input: String(res.rate),
                                    amount_input: String(res.subtotal),
                                    is_rate_auto_derived: true,
                                  });
                                }
                              }
                            }}
                            className="text-xs text-right font-bold h-10 px-2.5"
                          />
                          <div className="flex justify-end mt-1 min-h-[18px]">
                            <span className="text-[10px] text-admin-text-muted font-medium">
                              Tax: {formatCurrency(lineTax)}
                            </span>
                          </div>
                        </td>

                        {/* Trash */}
                        <td className="px-3 py-3 align-top text-center pt-3.5">
                          <button 
                            type="button" 
                            onClick={() => setItems(curr => curr.length > 1 ? curr.filter((_, i) => i !== index) : curr)}
                            className="text-admin-text-muted hover:text-admin-danger transition-colors p-1.5 rounded-lg hover:bg-admin-danger-dim/30"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Status</label>
                  <Select value={form.status} onChange={(e) => setForm({...form, status: e.target.value as any})}>
                    <option value="paid">Paid</option>
                    <option value="draft">Draft (Unpaid)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Payment Method</label>
                  <Select value={form.payment_method} onChange={(e) => setForm({...form, payment_method: e.target.value as any})}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-admin-text-secondary mb-1">Internal Notes (Optional)</label>
                  <Textarea 
                    rows={3} 
                    placeholder="Add warranty terms, item serials, or special payment notes..." 
                    value={form.notes} 
                    onChange={(e) => setForm({...form, notes: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b border-admin-border">
                <CardTitle>Bill Totals</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Subtotal (Pre-Tax):</span>
                  <span className="font-medium text-admin-text-primary">
                    {formatCurrency(preview?.subtotal || 0)}
                  </span>
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
                  <span className="text-admin-text-secondary">Total Tax:</span>
                  <span className="font-medium text-admin-text-primary">
                    {formatCurrency(preview?.total_tax || 0)}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-admin-border flex justify-between items-center gap-3">
                  <span className="text-base font-bold text-admin-text-primary shrink-0">
                    Grand Total:
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-admin-text-secondary pointer-events-none select-none">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      aria-label="Grand Total"
                      disabled={items.length === 0 || !items.some(i => i.item_name?.trim() || i.product_id)}
                      value={grandTotalInput !== null ? grandTotalInput : (preview?.grand_total !== undefined ? preview.grand_total.toFixed(2) : "")}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setGrandTotalInput(valStr);
                        const parsed = parseFloat(valStr);
                        if (!isNaN(parsed) && parsed >= 0) {
                          handleGrandTotalChange(parsed);
                        }
                      }}
                      onBlur={() => {
                        if (grandTotalInput !== null) {
                          const parsed = parseFloat(grandTotalInput);
                          if (!isNaN(parsed) && parsed >= 0) {
                            handleGrandTotalChange(parsed, true);
                          }
                          setGrandTotalInput(null);
                        }
                      }}
                      className="text-right text-base font-bold text-admin-text-primary pl-7 pr-2.5 h-10 bg-white border-admin-border rounded-md"
                    />
                  </div>
                </div>

                {/* Amount Paid & Fast Cash */}
                <div className="space-y-2.5 pt-2 border-t border-admin-border">
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <span className="text-sm font-medium text-admin-text-secondary">Amount Paid:</span>
                    </div>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-text-muted pointer-events-none select-none">
                        ₹
                      </span>
                      <Input 
                        type="number" min="0" step="0.01" 
                        placeholder={(form.status === 'paid' ? preview?.grand_total || 0 : 0).toString()}
                        value={form.amount_paid} 
                        onChange={(e) => setForm({...form, amount_paid: e.target.value})} 
                        className="text-right h-9 pl-7 pr-2.5 text-xs font-semibold"
                        aria-label="Amount Paid"
                      />
                    </div>
                  </div>

                  {/* Fast Cash Shortcuts */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-admin-text-muted uppercase tracking-wider">
                      Fast Cash
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setForm({
                          ...form, 
                          amount_paid: String(preview?.grand_total || 0),
                          payment_method: 'Cash',
                          status: 'paid'
                        })}
                        className="px-2.5 py-1 text-xs rounded-lg border border-admin-border bg-admin-bg-surface hover:bg-admin-accent/10 hover:border-admin-accent/30 hover:text-admin-accent text-admin-text-secondary font-medium transition-colors shadow-xs"
                      >
                        Exact
                      </button>
                      {[500, 1000, 2000].map((denomination) => (
                        <button
                          key={denomination}
                          type="button"
                          onClick={() => setForm({
                            ...form, 
                            amount_paid: String(denomination),
                            payment_method: 'Cash',
                            status: denomination >= (preview?.grand_total || 0) ? 'paid' : form.status
                          })}
                          className="px-2.5 py-1 text-xs rounded-lg border border-admin-border bg-admin-bg-surface hover:bg-admin-accent/10 hover:border-admin-accent/30 hover:text-admin-accent text-admin-text-secondary font-medium transition-colors shadow-xs"
                        >
                          ₹{denomination}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Due / Balance Due */}
                  {Number(form.amount_paid || 0) > (preview?.grand_total || 0) && (
                    <div className="flex justify-between items-center text-xs p-2 rounded bg-admin-accent-dim border border-admin-accent/20">
                      <span className="font-semibold text-admin-text-primary">Change to Return:</span>
                      <span className="font-extrabold text-admin-accent-text text-sm">
                        {formatCurrency(Number(form.amount_paid) - (preview?.grand_total || 0))}
                      </span>
                    </div>
                  )}
                  {form.amount_paid !== "" && Number(form.amount_paid || 0) < (preview?.grand_total || 0) && (
                    <div className="flex justify-between items-center text-xs p-2 rounded bg-admin-bg-surface border border-admin-border">
                      <span className="text-admin-text-secondary">Balance Remaining:</span>
                      <span className="font-bold text-admin-urgent-fg">
                        {formatCurrency((preview?.grand_total || 0) - Number(form.amount_paid || 0))}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4">
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
