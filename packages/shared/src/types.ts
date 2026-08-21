export type Role = 'admin' | 'receptionist' | 'technician';
export type JobStatus = 'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed';
export type JobPriority = 'Normal' | 'High' | 'Urgent';
export type JobType = 'Inhouse' | 'Onsite';
export type AttendanceStatus = 'Present' | 'Halfday' | 'Leave' | 'Absent';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  expo_push_token?: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  job_code: string;
  customer_name: string;
  customer_contact: string;
  customer_email?: string | null;
  customer_gstin?: string | null;
  device_type: 'Laptop' | 'PC' | 'Other';
  reported_issue: string;
  remarks?: string | null;
  work_notes?: string | null;
  job_type: JobType;
  priority: JobPriority;
  status: JobStatus;
  receptionist_id?: string | null;
  technician_id?: string | null;
  created_at: string;
  completed_at?: string | null;
  technician?: { name: string } | null;
  job_technicians?: { technician_id: string; removed_at?: string | null; technician?: { name: string } }[];
}

export interface JobMaterial {
  id: string;
  job_id: string;
  material_name: string;
  quantity: number;
  added_qty?: number;
  used_qty?: number;
  remaining_qty?: number;
  qty_taken?: number | null;
  unit_cost: number;
  total_cost: number;
  technician_id?: string | null;
  product_id?: string | null;
  inventory_id?: string | null;
  status?: string;
  checkout_status?: 'checked_out' | 'confirmed';
  usage_confirmed_at?: string | null;
  returned_at?: string | null;
  created_at?: string;
  technician?: { name: string } | null;
}

export interface MaterialAllotment {
  id: string;
  job_id: string;
  inventory_id?: string | null;
  product_id?: string | null;
  technician_id?: string | null;
  allotted_by?: string | null;
  quantity: number;
  status: 'allotted' | 'returned' | 'used';
  allotted_at: string;
  returned_at?: string | null;
  returned_by?: string | null;
  source_job_material_id?: string | null;
  notes?: string | null;
  technician?: { name: string; id: string } | null;
  inventory?: { item_name: string; unit?: string | null; cost_price?: number } | null;
  product?: { name: string; unit?: string | null } | null;
  job?: { job_code: string; customer_name: string } | null;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  phone_clean?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  created_via?: 'job' | 'sale' | 'manual' | 'import' | 'backfill';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  total_jobs?: number;
  total_sales?: number;
}

export interface CustomerAuditLog {
  id: string;
  customer_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_by?: string | null;
  old_data?: Partial<Customer> | null;
  new_data?: Partial<Customer> | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  selfie_url?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  ot_hours: number;
  early_hours: number;
  status: AttendanceStatus;
  approved_by?: string | null;
}

/** @deprecated Legacy flat-table type. Use InventoryWithProduct for new code. */
export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  unit?: string | null;
  low_stock_threshold: number;
  last_updated: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// New normalized schema types (Phase 1 migration)
// ──────────────────────────────────────────────────────────────────────────────

export type TaxMode   = 'inclusive' | 'exclusive';
export type TaxRegime = 'intra_state' | 'inter_state' | 'legacy';
export type InvoiceStatus = 'draft' | 'paid' | 'cancelled';
export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

/** mirrors public.products */
export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  hsn_sac?: string | null;
  unit: string;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  tax_mode: TaxMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** mirrors public.inventory (new normalized table) */
export interface InventoryRow {
  id: string;
  product_id: string;
  quantity_cached: number;
  purchase_rate: number;
  selling_rate: number;
  low_stock_threshold: number;
  minimum_stock_level: number;
  location?: string | null;
  last_updated: string;
}

/** Flattened JOIN of inventory + products — used in all admin list/form UIs */
export interface InventoryWithProduct {
  // inventory fields
  id: string;            // inventory.id
  product_id: string;
  quantity_cached: number;
  purchase_rate: number;
  selling_rate: number;
  low_stock_threshold: number;
  minimum_stock_level: number;
  location?: string | null;
  last_updated: string;
  // products fields (joined)
  products: Product;
}

/** mirrors public.invoice_items */
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  item_name: string;
  serial_number?: string | null;
  quantity: number;
  selling_rate: number;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  discount_amount: number;
  line_total: number;
}

/** mirrors public.invoices */
export interface Invoice {
  id: string;
  invoice_code: string;
  sale_code?: string;
  invoice_number?: string;
  customer_name: string;
  customer_contact?: string | null;
  customer_email?: string | null;
  customer_gstin?: string | null;
  tax_regime: TaxRegime;
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  discount: number;
  round_off: number;
  grand_total: number;
  payment_method?: PaymentMethod | null;
  status: InvoiceStatus;
  notes?: string | null;
  job_id?: string | null;
  created_by?: string | null;
  created_at: string;
  paid_at?: string | null;
  // optional join
  invoice_items?: InvoiceItem[];
  created_by_user?: { name: string } | null;
}

export interface JobTypeCatalogItem {
  id: string;
  title: string;
  customer_charge_amount: number;
  technician_incentive: number;
  is_active: boolean;
  created_at?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  created_at?: string;
}

export interface CustomerReview {
  id: string;
  user_id: string;
  job_id?: string | null;
  score: number;
  comments?: string | null;
  created_at: string;
}
export interface GeofenceSettings {
  id: string;
  center_lat?: number;
  center_lng?: number;
  radius_meters?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  phone_clean?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  purchase_code: string;
  supplier_id?: string | null;
  product_id: string;
  inventory_id?: string | null;
  purchase_date: string;
  supplier_invoice_number?: string | null;
  invoice_image_url?: string | null;
  quantity: number;
  purchase_rate: number;
  selling_rate?: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  logged_by?: string | null;
  created_at: string;
}

export interface PurchaseWithDetails {
  purchase_id: string;
  purchase_code: string;
  purchase_date: string;
  supplier_invoice_number?: string | null;
  invoice_image_url?: string | null;
  quantity: number;
  purchase_rate: number;
  selling_rate?: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  supplier_id?: string | null;
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_gstin?: string | null;
  supplier_address?: string | null;
  product_id: string;
  product_name: string;
  product_sku?: string | null;
  product_unit: string;
  logged_by_id?: string | null;
  logged_by_name: string;
}

export interface LogPurchasePayload {
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  supplier_email?: string | null;
  supplier_gstin?: string | null;
  supplier_address?: string | null;
  purchase_date?: string;
  supplier_invoice_id?: string | null;
  invoice_image_url?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  sku?: string | null;
  unit?: string;
  hsn_sac?: string | null;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  tax_mode?: 'inclusive' | 'exclusive';
  quantity: number;
  purchase_rate: number;
  selling_rate?: number;
  low_stock_threshold?: number;
  minimum_stock_level?: number;
  location?: string | null;
  notes?: string | null;
}
