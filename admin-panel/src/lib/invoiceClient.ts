// invoiceClient.ts — Web Admin Panel invoice client (SVG edition)
// Calls the generate-invoice Edge Function and opens the returned SVG-based HTML
// in a print popup. The SVG renders natively in the browser, producing a
// pixel-perfect PDF matching the digitalsolution_bill_templete.svg design.

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminDocType = 'final' | 'receipt' | 'sale';

export type InvoiceResult = {
  /** Google Drive webViewLink if stored, null if Drive upload failed/skipped */
  driveLink: string | null;
};

export type InlineLineItem = {
  sn: number;
  description: string;
  serialNumber?: string;
  qty: number;
  rate: number;
  amount: number;
};

export type InlineInvoiceData = {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerGstin?: string;
  items: InlineLineItem[];
  totals: { subtotal: number; discount: number; tax: number; total: number };
};

export type AdminInvoiceRequest =
  | { docType: 'final';   invoiceId: string }
  | { docType: 'receipt'; jobId: string }
  | { docType: 'sale';    saleId: string }
  | { docType: AdminDocType; inline: InlineInvoiceData };

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the SVG-rendered invoice HTML from the Edge Function,
 * then opens it in a browser popup for printing/saving as PDF.
 */
export async function openInvoicePrint(req: AdminInvoiceRequest): Promise<InvoiceResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-invoice`;

  const response = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Invoice generation failed: ${response.status}`);
  }

  const { html, driveLink } = await response.json() as { html: string; driveLink: string | null };

  // Open in popup — SVG is already self-contained with base64 images and inline styles.
  // No origin patching needed (no external image references).
  const popup = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
  if (!popup) {
    // Fallback: blob URL if popup is blocked
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { driveLink };
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  return { driveLink };
}

/**
 * Downloads the invoice as an HTML file directly (no popup needed).
 * Useful as a fallback when popup is blocked.
 */
export async function downloadInvoiceHtml(req: AdminInvoiceRequest, filename?: string): Promise<InvoiceResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-invoice`;

  const response = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Invoice generation failed: ${response.status}`);
  }

  const { html, driveLink } = await response.json() as { html: string; driveLink: string | null };

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'invoice.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  return { driveLink };
}
