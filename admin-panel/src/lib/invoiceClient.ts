// invoiceClient.ts — Web Admin Panel invoice client (SVG / Direct Print edition)
// Calls the generate-invoice Edge Function and prints the returned SVG-based HTML
// directly via an in-page hidden iframe. This invokes the native browser print dialog
// (the same dialog triggered by pressing Ctrl+P) directly on top of the current screen
// without opening a new tab or popup window.

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
  hsnCode?: string;
  taxPercent?: number;
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
  deviceSerialNumber?: string;
  items: InlineLineItem[];
  totals: { subtotal: number; discount: number; tax: number; total: number };
};

export type AdminInvoiceRequest =
  | { docType: 'final';   invoiceId: string }
  | { docType: 'receipt'; jobId: string }
  | { docType: 'sale';    saleId: string }
  | { docType: AdminDocType; inline: InlineInvoiceData };

export type PrintProgressCallback = (percent: number, message: string) => void;

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the SVG-rendered invoice HTML from the Edge Function,
 * and triggers direct in-page native printing (equivalent to Ctrl+P)
 * using a hidden iframe — NO new tabs opened.
 */
export async function openInvoicePrint(
  req: AdminInvoiceRequest,
  onProgress?: PrintProgressCallback
): Promise<InvoiceResult> {
  onProgress?.(15, 'Preparing invoice...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  onProgress?.(40, 'Calculating taxes and totals...');

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
    throw new Error(err.error || `Invoice generation failed (${response.status})`);
  }

  onProgress?.(75, 'Rendering invoice layout...');
  const { html, driveLink } = await response.json() as { html: string; driveLink: string | null };

  onProgress?.(95, 'Preparing print preview...');

  // Print directly via hidden iframe without opening a new tab
  let iframe = document.getElementById('admin-invoice-print-frame') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'admin-invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) throw new Error('Unable to access browser print engine');

  doc.open();
  doc.write(html);
  doc.close();

  // Allow SVG and font assets inside the iframe to render
  await new Promise(resolve => setTimeout(resolve, 400));
  onProgress?.(100, 'Opening print dialog...');

  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } catch (e: any) {
    console.error('Print trigger notice:', e);
  }

  return { driveLink };
}

/**
 * Downloads the invoice as an HTML file directly.
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
