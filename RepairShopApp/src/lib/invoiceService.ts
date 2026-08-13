// invoiceService.ts — Mobile App Invoice Service
// Calls the generate-invoice Edge Function and renders the result via expo-print.
// Both the receptionist and admin dashboards use this shared service.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export type MobileDocType = 'sale' | 'final' | 'receipt';

export type MobileLineItem = {
  description: string;
  hsn?: string;
  price: number;
  unit: number;
};

export type MobileInvoiceRequest = {
  docType: MobileDocType;
  invoiceNo?: string;
  jobId?: string;
  date: string;
  customer: {
    name: string;
    gst?: string;
    phone: string;
    address: string;
  };
  items: MobileLineItem[];
  taxRatePct?: number;
  discount?: number;
};

async function callEdgeFunction(req: MobileInvoiceRequest): Promise<{ html: string; driveLink: string | null }> {
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

  // Replace relative image paths with absolute admin-panel URLs
  const adminOrigin = (process.env.EXPO_PUBLIC_ADMIN_ORIGIN || 'https://your-admin-domain.vercel.app');
  const finalHtml = html
    .replace(/src="\/upi-qr\.png"/g, `src="${adminOrigin}/upi-qr.png"`);

  return { html: finalHtml, driveLink };
}

/**
 * Print a document on-device via expo-print.
 * Opens the system print dialog (PDF save or physical print).
 * Returns driveLink if the invoice was saved to Google Drive.
 */
export async function printInvoice(req: MobileInvoiceRequest): Promise<{ driveLink: string | null }> {
  const { html, driveLink } = await callEdgeFunction(req);
  await Print.printAsync({ html, useMarkupFormatter: false });
  return { driveLink };
}

/**
 * Share a document (WhatsApp, Drive, etc.) via expo-sharing.
 * Renders to PDF first using expo-print, then shares the file.
 * Returns driveLink if the invoice was saved to Google Drive.
 */
async function shareInvoice(req: MobileInvoiceRequest, filename?: string): Promise<{ driveLink: string | null }> {
  const { html, driveLink } = await callEdgeFunction(req);

  const { uri } = await Print.printToFileAsync({ html });

  const docLabel = req.docType === 'receipt'
    ? `Receipt-${req.jobId || 'JOB'}`
    : req.docType === 'sale'
    ? `Invoice-${req.invoiceNo || 'SALE'}`
    : `Invoice-${req.jobId || 'JOB'}`;

  const destUri = uri.replace(/[^/]+$/, `${filename || docLabel}.pdf`);

  // expo-sharing handles opening the native share sheet
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${docLabel}`,
    });
  } else {
    // Fallback: just trigger print again
    await Print.printAsync({ html });
  }

  return { driveLink };
}
