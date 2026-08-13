// ── Legacy types (kept for backward compat during transition) ────────────────
export type SaleStatus = 'Draft' | 'Paid' | 'Cancelled';
export type SalePaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

export interface SaleItem {
  id?: string;
  sale_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
}

export interface Sale {
  id: string;
  sale_code: string;
  customer_name: string;
  customer_contact: string;
  customer_email?: string | null;
  customer_gstin?: string | null;
  status: SaleStatus;
  payment_method: SalePaymentMethod;
  subtotal: number;
  discount: number;
  tax_percent: number;
  total_amount: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  paid_at?: string | null;
  created_by_user?: { name: string } | null;
  sale_items?: SaleItem[];
}

// ── New invoice types (Phase 1 schema) ───────────────────────────────────────
export type { Invoice, InvoiceItem, InvoiceStatus, TaxRegime, PaymentMethod } from '@repairshop/shared';

// ── Form line item used by the Create Invoice form ───────────────────────────
export interface InvoiceLineForm {
  // product catalog fields (null for service/labour items)
  product_id: string | null;
  item_name: string;            // auto-populated from product, editable for service
  // pricing (mutual: fill one, other is derived)
  quantity: number;
  selling_rate: number;
  selling_amount: number;
  // optional per-line discount
  discount_amount: number;
  // read-only preview (populated by preview_invoice() RPC)
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  tax_mode: 'exclusive' | 'inclusive';
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  line_total: number;
}
