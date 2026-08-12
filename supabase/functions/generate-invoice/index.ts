// index.ts — Supabase Edge Function: generate-invoice
// Accepts POST with InvoiceDoc, returns { html, totals, driveLink? }
// Both web admin and mobile app call this same endpoint.
//
// Drive behaviour:
//   - When jobId is present → renders HTML, uploads it to Google Drive under
//     Invoices/{YYYY}/{Month}/, writes drive_link + drive_file_id to billing row.
//   - On Drive/DB failure → queues a row in pending_uploads so the retry worker
//     can finish the job. The HTML response is always returned regardless.
//   - When jobId is absent (preview-only) → Drive upload is skipped silently.

import { validateInvoiceDoc } from './schema.ts';
import { calculateTotals } from './calc.ts';
import { renderHtml } from './template.ts';
import { LETTERHEAD_B64 } from './assets.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getAccessToken } from '../_shared/googleAuth.ts';
import { ensureFolderPath } from '../_shared/driveFolders.ts';
import { uploadFileToDrive, sanitizeFilenameSegment, monthName } from '../_shared/driveUpload.ts';

declare const Deno: any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Validate
  const validation = validateInvoiceDoc(raw);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: 'Validation failed', details: validation.errors }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const doc = validation.value;

  // Compute item totals (price * unit) for display
  const itemsWithTotals = doc.items.map(item => ({
    ...item,
    total: item.price * item.unit,
  }));

  // Server-side calculation — client-submitted totals are never trusted
  const totals = calculateTotals(itemsWithTotals, doc.taxRatePct, doc.discount);

  // Use Base64 inline image for guaranteed rendering on mobile expo-print
  const letterheadUrl = LETTERHEAD_B64;

  // QR code is lightweight — client handles resolution
  const qrUrl = '/upi-qr.png';

  const html = renderHtml({
    docType: doc.docType,
    invoiceNo: doc.invoiceNo,
    jobId: doc.jobId,
    date: doc.date,
    customer: doc.customer,
    items: itemsWithTotals,
    totals,
    letterheadUrl,
    qrUrl,
  });

  // ─── Google Drive Upload ──────────────────────────────────────────────────
  // Only runs when jobId is supplied (real billing, not preview-only).
  // A failure here NEVER breaks the response — we always return the HTML.
  let driveLink: string | null = null;

  if (doc.jobId) {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    try {
      const token = await getAccessToken();

      // Build Drive folder: Invoices/{YYYY}/{Month}/
      const invoiceDate = new Date(doc.date);
      const year = String(invoiceDate.getFullYear());
      const month = monthName(invoiceDate.getMonth() + 1);
      const folderId = await ensureFolderPath(token, ['Invoices', year, month]);

      // Filename: e.g. "invoice-rs-2026-0001.html" or "receipt-rs-2026-0001.html"
      const safeRef = doc.invoiceNo
        ? sanitizeFilenameSegment(doc.invoiceNo)
        : sanitizeFilenameSegment(doc.jobId);
      const filename = `${doc.docType}-${safeRef}.html`;

      const htmlBytes = new TextEncoder().encode(html);
      const { fileId, webViewLink } = await uploadFileToDrive(token, {
        name: filename,
        mimeType: 'text/html',
        parentId: folderId,
        data: htmlBytes,
      });

      driveLink = webViewLink;

      // Write drive link back to the billing row for this job.
      // Uses job_id lookup (UUID) — idempotent if called multiple times.
      // .select('id') lets us detect a 0-row match (billing row not yet created).
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('billing')
        .update({ drive_link: webViewLink, drive_file_id: fileId })
        .eq('job_id', doc.jobId)
        .select('id');

      if (updateError || !updatedRows || updatedRows.length === 0) {
        // Either a DB error or the billing row doesn't exist yet.
        // Queue the drive link so the retry worker can write it later.
        const reason = updateError?.message ?? '0 billing rows matched for job_id';
        console.error('[generate-invoice] billing update failed:', reason);
        await supabaseAdmin.from('pending_uploads').insert({
          type: doc.docType === 'receipt' ? 'receipt' : 'invoice',
          reference_id: doc.jobId,   // job UUID; retry matches by jobId
          reference_table: 'billing',
          payload_json: {
            jobId: doc.jobId,
            driveFileId: fileId,
            driveLink: webViewLink,
            driveAlreadyUploaded: true,   // Drive upload succeeded — only DB write needed
          },
        });
      }
    } catch (driveErr: any) {
      // Drive upload itself failed — queue the HTML so the retry worker can
      // re-upload and then write drive_link to billing.
      console.error('[generate-invoice] Drive upload failed:', driveErr.message);
      try {
        const invoiceDate = new Date(doc.date);
        const safeRef = doc.invoiceNo
          ? sanitizeFilenameSegment(doc.invoiceNo)
          : sanitizeFilenameSegment(doc.jobId);
        await supabaseAdmin.from('pending_uploads').insert({
          type: doc.docType === 'receipt' ? 'receipt' : 'invoice',
          reference_id: doc.jobId,
          reference_table: 'billing',
          payload_json: {
            jobId: doc.jobId,
            docType: doc.docType,
            filename: `${doc.docType}-${safeRef}.html`,
            htmlContent: html,                        // stored for retry re-upload
            year: invoiceDate.getFullYear(),
            month: invoiceDate.getMonth() + 1,        // 1-indexed
          },
        });
      } catch (queueErr: any) {
        // Last resort — log and continue. The invoice print still works.
        console.error('[generate-invoice] failed to queue pending upload:', queueErr.message);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  return new Response(JSON.stringify({ html, totals, driveLink }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
