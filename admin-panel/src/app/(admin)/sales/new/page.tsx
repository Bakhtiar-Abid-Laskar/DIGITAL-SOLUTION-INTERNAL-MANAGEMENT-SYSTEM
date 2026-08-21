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
import { formatCurrency, Customer } from "@repairshop/shared";
import { openInvoicePrint } from '@/lib/invoiceClient';
import { CustomerTypeahead } from "@/components/customers/CustomerTypeahead";
import { 
  ArrowLeft, CheckCircle2, Plus, PlusCircle, Printer, Trash2, 
  User as UserIcon, ShoppingBag, CreditCard, Package, Search 
} from "lucide-react";

// Types matching the RPC signatures
type InvoiceLineParams = {
  product_id?: string | null;
  item_name?: string | null;
  quantity: number;
  selling_rate?: number | null;
  selling_amount?: number | null;
  serial_number?: string | null;
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
  serial_number: string;
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
  serial_number: "",
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
      // Don't preview if empty
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
            cgst_rate: i.product_id ? null : Number(i.cgst_rate) || 0,
            sgst_rate: i.product_id ? null : Number(i.sgst_rate) || 0,
            igst_rate: i.product_id ? null : Number(i.igst_rate) || 0,
            tax_mode: i.product_id ? null : (i.tax_mode || 'exclusive')
          }));

        if (payloadItems.length === 0) {
          setPreview(null);
          return;
        }

        const { data, error } = await supabase.rpc('preview_invoice', {
          p_items: payloadItems,
          p_tax_regime: form.tax_regime,
          p_discount: Math.max(0, Number(form.discount) || 0)
        });

        if (error) {
          console.warn("Preview RPC notice:", error.message || error);
          // Safe fallback preview calculation for non-RPC or custom items
          let subtotal = 0;
          let totalTax = 0;
          const calculatedItems = payloadItems.map(item => {
            const rate = item.selling_rate || (item.selling_amount ? item.selling_amount / item.quantity : 0);
            const lineSub = rate * item.quantity;
            subtotal += lineSub;
            const taxPct = form.tax_regime === 'intra_state' 
              ? ((item.cgst_rate || 0) + (item.sgst_rate || 0))
              : (item.igst_rate || 0);
            const lineTax = (lineSub * taxPct) / 100;
            totalTax += lineTax;
            return {
              item_name: item.item_name || 'Item',
              quantity: item.quantity,
              selling_rate: rate,
              taxable_amount: lineSub,
              cgst_rate: item.cgst_rate || 0,
              cgst_amount: form.tax_regime === 'intra_state' ? lineTax / 2 : 0,
              sgst_rate: item.sgst_rate || 0,
              sgst_amount: form.tax_regime === 'intra_state' ? lineTax / 2 : 0,
              igst_rate: item.igst_rate || 0,
              igst_amount: form.tax_regime === 'inter_state' ? lineTax : 0,
              line_total: lineSub + lineTax
            };
          });
          const discount = Math.max(0, Number(form.discount) || 0);
          const grandTotal = Math.max(0, subtotal + totalTax - discount);
          setPreview({
            subtotal,
            total_cgst: form.tax_regime === 'intra_state' ? totalTax / 2 : 0,
            total_sgst: form.tax_regime === 'intra_state' ? totalTax / 2 : 0,
            total_igst: form.tax_regime === 'inter_state' ? totalTax : 0,
            total_tax: totalTax,
            discount,
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

    // Debounce the preview slightly
    const timeout = setTimeout(runPreview, 300);
    return () => clearTimeout(timeout);
  }, [items, form.tax_regime, form.discount]);

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
      if (!item.rate_input && !item.amount_input) newErrors[`rate_${index}`] = "Rate or Amount required";
    });

    if (Number(form.discount) < 0) newErrors.discount = "Cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateItem = (index: number, updates: Partial<InvoiceLineForm>) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleProductSelect = (index: number, inv: any) => {
    if (!inv) {
      updateItem(index, { inventory_id: "", product_id: null, item_name: "", rate_input: "", amount_input: "", serial_number: "" });
      return;
    }
    const productName = getProductName(inv);
    const prod = Array.isArray(inv.products) ? inv.products[0] : inv.products;
    const rate = inv.selling_rate ? Number(inv.selling_rate) : 0;
    const qty = items[index].quantity || 1;
    
    updateItem(index, {
      inventory_id: inv.id,
      product_id: inv.product_id,
      item_name: productName,
      rate_input: rate ? String(rate) : "",
      amount_input: rate ? String(rate * qty) : "",
      serial_number: "",
      cgst_rate: prod?.cgst_rate || 0,
      sgst_rate: prod?.sgst_rate || 0,
      igst_rate: prod?.igst_rate || 0,
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
          cgst_rate: i.product_id ? null : i.cgst_rate,
          sgst_rate: i.product_id ? null : i.sgst_rate,
          igst_rate: i.product_id ? null : i.igst_rate,
          tax_mode: i.product_id ? null : i.tax_mode
        }));

      // Central Customer Directory: Upsert or link customer
      let customerId = form.customer_id;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: custData, error: custErr } = await supabase.rpc('find_or_create_customer', {
          p_customer_id: customerId,
          p_name: form.customer_name.trim(),
          p_phone: form.customer_contact.trim() || null,
          p_email: form.customer_email.trim() || null,
          p_gstin: form.customer_gstin.trim() || null,
          p_address: form.customer_address.trim() || null,
          p_created_via: 'sale',
          p_user_id: user?.id,
        });
        if (!custErr && custData) {
          customerId = custData.id;
        }
      } catch (e) {
        console.warn('Customer upsert warning:', e);
      }

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
        p_job_id: null,
        // amount_paid is now written atomically inside create_invoice().
        // Pass explicit value only when the user typed one; otherwise pass null
        // so the RPC auto-derives: status='paid' → grand_total, 'draft' → 0.
        p_amount_paid: form.amount_paid !== "" ? Number(form.amount_paid) : null
      });

      if (error) throw new Error(error.message);

      // Link invoice to central customer record
      if (data?.invoice_id && customerId) {
        await supabase
          .from('invoices')
          .update({
            customer_id: customerId,
            customer_address: form.customer_address || null,
          })
          .eq('id', data.invoice_id);
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
          <Button leftIcon={<Printer size={16} />} onClick={() => {
            if (createdInvoiceId && preview) {
              openInvoicePrint({
                docType: 'final',
                invoiceId: createdInvoiceId,
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
              <label className="block text-sm font-medium text-admin-text-secondary mb-1">Customer Name *</label>
              <CustomerTypeahead
                name={form.customer_name}
                selectedCustomerId={form.customer_id}
                onChangeName={(val) => setForm({ ...form, customer_name: val, customer_id: null })}
                onSelectCustomer={(cust) => setForm({
                  ...form,
                  customer_id: cust.id,
                  customer_name: cust.name,
                  customer_contact: cust.phone || form.customer_contact,
                  customer_email: cust.email || form.customer_email,
                  customer_gstin: cust.gstin || form.customer_gstin,
                  customer_address: cust.address || form.customer_address,
                })}
                onClearCustomer={() => setForm({ ...form, customer_id: null })}
                error={errors.customer_name}
                placeholder="Search existing customer or enter name..."
              />
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
            <div className="col-span-1 md:col-span-2 lg:col-span-4">
              <label htmlFor="field-address" className="block text-sm font-medium text-admin-text-secondary mb-1">Billing & Delivery Address (Optional)</label>
              <Textarea
                id="field-address"
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
          <CardContent className="p-0 overflow-visible">
            <div className="w-full overflow-visible table-scroll-shadow pr-2">
              <table className="w-full text-left text-sm">
                <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/3">Item / Service</th>
                    <th className="px-4 py-3 font-medium w-40">Serial No.</th>
                    <th className="px-4 py-3 font-medium w-24">Qty</th>
                    <th className="px-4 py-3 font-medium w-32">Rate (₹)</th>
                    <th className="px-4 py-3 font-medium w-32">Amount (₹)</th>
                    <th className="px-4 py-3 font-medium w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {items.map((item, index) => {
                    const isSelectedFromCatalog = Boolean(item.inventory_id && item.product_id);

                    return (
                      <tr key={index} className="bg-admin-bg-surface">
                        <td className="px-4 py-3 align-top relative">
                          <div className="relative">
                            <div className="flex items-center gap-1">
                              <div className="relative flex-1">
                                <Input
                                  aria-label="Item / Service Name"
                                  placeholder="Type to search catalog or enter custom item..."
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
                                  className="w-full pr-8 text-sm"
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
                                  ✕
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

                            <div className="text-xs text-admin-text-muted mt-1">
                              {(() => {
                                const itemTax = preview?.items?.[index];
                                if (!itemTax) return null;
                                const taxSum = (itemTax.cgst_amount || 0) + (itemTax.sgst_amount || 0) + (itemTax.igst_amount || 0);
                                return <span>Tax: {formatCurrency(taxSum)}</span>;
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Input aria-label="Serial Number" 
                            type="text" placeholder="S/N (Optional)"
                            value={item.serial_number}
                            onChange={(e) => updateItem(index, { serial_number: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Input aria-label="Field" 
                            type="number" min="1" 
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              const rate = Number(item.rate_input);
                              updateItem(index, { 
                                quantity: qty, 
                                amount_input: rate && qty ? String(rate * qty) : item.amount_input 
                              });
                            }}
                            error={!!errors[`qty_${index}`]}
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Input aria-label="Rate" 
                            type="number" step="0.01" min="0" placeholder="Rate"
                            value={item.rate_input}
                            onChange={(e) => {
                              const rate = Number(e.target.value);
                              const qty = item.quantity;
                              updateItem(index, { 
                                rate_input: e.target.value, 
                                amount_input: rate && qty ? String(rate * qty) : "" 
                              });
                            }}
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

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium text-admin-text-secondary">Amount Paid (₹):</span>
                  <div className="w-24">
                    <Input 
                      type="number" min="0" step="0.01" 
                      placeholder={(form.status === 'paid' ? preview?.grand_total || 0 : 0).toString()}
                      value={form.amount_paid} 
                      onChange={(e) => setForm({...form, amount_paid: e.target.value})} 
                      className="text-right h-8 py-1"
                    />
                  </div>
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
