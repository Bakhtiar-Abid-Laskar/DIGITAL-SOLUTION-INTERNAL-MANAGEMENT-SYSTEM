// invoiceService.ts — Mobile App Invoice Service (SVG edition)
// Calls the generate-invoice Edge Function which now returns SVG-based HTML.
// The HTML is rendered via expo-print (WebKit) to produce a pixel-perfect PDF
// matching the digitalsolution_bill_templete.svg design.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MobileDocType = 'final' | 'receipt' | 'sale';

export type MobileInvoiceRequest =
  | { docType: 'final';   invoiceId: string }
  | { docType: 'receipt'; jobId: string }
  | { docType: 'sale';    saleId: string }
  | { docType: MobileDocType; inline: InlineInvoiceData };

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

// ─── Core edge function call ──────────────────────────────────────────────────

async function callEdgeFunction(
  req: MobileInvoiceRequest
): Promise<{ html: string; driveLink: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-invoice`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Invoice generation failed (${response.status})`);
  }

  const { html, driveLink } = await response.json() as { html: string; driveLink: string | null };
  return { html, driveLink };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Opens the system print dialog (iOS/Android).
 * The SVG invoice HTML is rendered to PDF on-device via WebKit.
 * Returns driveLink if the invoice was backed up to Google Drive.
 */
export async function printInvoice(
  req: MobileInvoiceRequest
): Promise<{ driveLink: string | null }> {
  const { html, driveLink } = await callEdgeFunction(req);
  await Print.printAsync({ html, useMarkupFormatter: false });
  return { driveLink };
}

/**
 * Saves the invoice as a PDF file and opens the native share sheet
 * (WhatsApp, Drive, Email, etc.).
 */
export async function shareInvoice(
  req: MobileInvoiceRequest,
  filename?: string
): Promise<{ driveLink: string | null }> {
  const { html, driveLink } = await callEdgeFunction(req);

  const { uri } = await Print.printToFileAsync({ html });

  const docLabel = 'docType' in req
    ? `Invoice-${req.docType}`
    : 'Invoice';

  const destUri = uri.replace(/[^/]+$/, `${filename || docLabel}.pdf`);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${docLabel}`,
    });
  } else {
    await Print.printAsync({ html });
  }

  return { driveLink };
}
