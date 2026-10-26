import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

/**
 * Universal web printing utility that prints only the document HTML via an isolated iframe.
 */
export function printHtmlOnWeb(html: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        document.body.removeChild(iframe);
        window.print();
        resolve();
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('[printHtmlOnWeb] print error:', e);
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
          resolve();
        }, 1200);
      }, 350);
    } catch (err) {
      console.warn('[printHtmlOnWeb] fallback to window.print:', err);
      if (typeof window !== 'undefined') window.print();
      resolve();
    }
  });
}

/**
 * Universal web document share/export utility. Uses navigator.share when available,
 * or opens the document in a dedicated preview tab / downloads as HTML.
 */
export async function exportOrShareHtmlOnWeb(html: string, filename: string, driveUrl?: string | null): Promise<void> {
  if (typeof window === 'undefined') return;

  if (driveUrl && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: filename,
        url: driveUrl,
      });
      return;
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') return;
      console.log('[exportOrShareHtmlOnWeb] navigator.share URL fallback:', shareErr);
    }
  }

  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  const previewWindow = window.open(blobUrl, '_blank');
  if (!previewWindow) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}


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

export type PdfProgressStage = 'init' | 'generating' | 'rendering' | 'complete';

export type PdfProgressCallback = (
  stage: PdfProgressStage,
  percent: number,
  message: string
) => void;

// ─── Core edge function call ──────────────────────────────────────────────────

async function callEdgeFunction(
  req: MobileInvoiceRequest,
  onProgress?: PdfProgressCallback
): Promise<{ html: string; driveLink: string | null }> {
  onProgress?.('init', 20, 'Authenticating and preparing request...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-invoice`;

  onProgress?.('generating', 45, 'Compiling template on server...');

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

  onProgress?.('generating', 70, 'Processing document payload...');

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
  req: MobileInvoiceRequest,
  onProgress?: PdfProgressCallback
): Promise<{ driveLink: string | null }> {
  const { html, driveLink } = await callEdgeFunction(req, onProgress);
  onProgress?.('rendering', 85, 'Rendering document preview...');
  
  if (Platform.OS === 'web') {
    await printHtmlOnWeb(html);
  } else {
    await Print.printAsync({ html, useMarkupFormatter: false });
  }

  onProgress?.('complete', 100, 'Print preview ready');
  return { driveLink };
}

/**
 * Saves the invoice as a PDF file and opens the native share sheet
 * (WhatsApp, Drive, Email, etc.) or web export.
 */
export async function shareInvoice(
  req: MobileInvoiceRequest,
  filename?: string,
  onProgress?: PdfProgressCallback
): Promise<{ driveLink: string | null }> {
  const { html, driveLink } = await callEdgeFunction(req, onProgress);

  const docLabel = 'docType' in req
    ? `Invoice-${req.docType}`
    : 'Invoice';
  const finalFilename = filename || docLabel;

  if (Platform.OS === 'web') {
    onProgress?.('rendering', 85, 'Preparing document...');
    await exportOrShareHtmlOnWeb(html, finalFilename, driveLink);
    onProgress?.('complete', 100, 'Document ready');
    return { driveLink };
  }

  onProgress?.('rendering', 85, 'Rendering PDF file...');
  const { uri } = await Print.printToFileAsync({ html });
  const destUri = uri.replace(/[^/]+$/, `${finalFilename}.pdf`);

  onProgress?.('complete', 95, 'Opening share sheet...');
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${docLabel}`,
    });
  } else {
    await Print.printAsync({ html });
  }

  onProgress?.('complete', 100, 'Document shared');
  return { driveLink };
}

