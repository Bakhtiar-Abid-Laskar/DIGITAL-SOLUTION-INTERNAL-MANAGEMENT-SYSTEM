export interface Billing {
  id: string;
  job_id: string;
  parts_total: number;
  labour_charge: number;
  tax_percent: number;
  discount: number;
  grand_total: number;
  is_paid: boolean;
  invoice_url: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_code: string;
  job_id: string;
  customer_name: string;
  customer_contact: string;
  grand_total: number;
  discount: number;
  status: 'draft' | 'paid' | 'cancelled';
  paid_at: string | null;
  created_at: string;
  invoice_items?: any[];
}
