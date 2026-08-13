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
