-- MIGRATION: Add missing tax columns to invoice_items and sale_items
-- Safely adds columns required by the create_invoice and create_sale RPCs.

ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS tax_mode text DEFAULT 'exclusive',
ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 18,
ADD COLUMN IF NOT EXISTS cgst_rate numeric DEFAULT 9,
ADD COLUMN IF NOT EXISTS sgst_rate numeric DEFAULT 9,
ADD COLUMN IF NOT EXISTS igst_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS hsn_code text;

ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS tax_mode text DEFAULT 'exclusive',
ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 18,
ADD COLUMN IF NOT EXISTS cgst_rate numeric DEFAULT 9,
ADD COLUMN IF NOT EXISTS sgst_rate numeric DEFAULT 9,
ADD COLUMN IF NOT EXISTS igst_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS hsn_code text;
