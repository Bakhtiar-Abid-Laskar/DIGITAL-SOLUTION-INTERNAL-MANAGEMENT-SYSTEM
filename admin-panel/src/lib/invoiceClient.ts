// invoiceClient.ts — Web Admin Panel invoice client
// Calls the generate-invoice Edge Function and opens the returned HTML in a print popup.
// The letterhead and QR images are served from /public which resolves to the Next.js origin.
// Returns { driveLink } so the caller can show a "View in Drive" button after printing.

import { supabase } from '@/lib/supabase';
import DOMPurify from 'dompurify';

export type DocType = 'sale' | 'final' | 'receipt';

export type InvoiceLineItem = {
  description: string;
  hsn?: string;
  price: number;
  unit: number;
};

export type InvoiceRequest = {
  docType: DocType;
  invoiceNo?: string;
  jobId?: string;
  date: string;
  customer: {
    name: string;
    gst?: string;
    phone: string;
    address: string;
  };
  items: InvoiceLineItem[];
  taxRatePct?: number;
  discount?: number;
};

export type InvoiceResult = {
  /** Google Drive webViewLink for the stored HTML, or null if Drive upload failed/skipped */
  driveLink: string | null;
};

export async function openInvoicePrint(req: InvoiceRequest): Promise<InvoiceResult> {
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
    throw new Error(err.error || `Edge Function error: ${response.status}`);
  }

  const { html, driveLink } = await response.json() as { html: string; driveLink: string | null };

  // Replace relative image paths with absolute URLs so they load in the popup
  const origin = window.location.origin;
  const finalHtml = html
    .replace(/src="\/upi-qr\.png"/g, `src="${origin}/upi-qr.png"`);

  // Open in popup for native print dialog
  const popup = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
  if (!popup) {
    // Fallback: blob URL if popup is blocked
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { driveLink };
  }

  popup.document.open();
  const cleanHtml = DOMPurify.sanitize(finalHtml);
  popup.document.write(cleanHtml);
  popup.document.close();

  return { driveLink };
}
