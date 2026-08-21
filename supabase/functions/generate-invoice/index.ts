// index.ts — Supabase Edge Function: generate-invoice (SVG edition)
// Replaces the old HTML template system entirely.
// Renders invoices using digitalsolution_bill_templete.svg as the visual source of truth.
//
// Supported sources (all 3 doc types):
//   docType = 'final'   → job completion invoice (invoices + invoice_items tables)
//   docType = 'receipt' → job receipt (billing_legacy / jobs tables)
//   docType = 'sale'    → counter sale (sales + sale_items tables)
//
// Returns { html: string, driveLink: string | null }
//   html      → complete SVG-in-HTML string; client passes to expo-print or window.print()
//   driveLink → Google Drive webViewLink for the stored HTML file (if jobId/saleId provided)
//
// Drive folder structure: Invoices/{YYYY}/{Month}/
// Drive filename: invoice-RS-2026-0001.html  or  sale-SALE-2026-0001.html

import { renderSvgInvoice } from './svgTemplate.ts';
import type { SvgLineItem, SvgTotals, SvgInvoiceInput } from './svgTemplate.ts';
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

// ─── Request payload types ────────────────────────────────────────────────────

type DocType = 'final' | 'receipt' | 'sale';

type InvoiceRequest = {
  docType: DocType;
  // For 'final' and 'receipt': provide invoiceId or jobId to fetch from DB.
  // For 'sale': provide saleId to fetch from DB.
  // Alternatively, provide inline data (for preview/ad-hoc calls):
  invoiceId?: string;    // invoices.id (UUID)
  jobId?: string;        // jobs.id (UUID) — used for 'receipt' and Drive naming
  saleId?: string;       // sales.id (UUID)
  // Optional inline override — if provided, DB fetch is skipped and these are used directly
  inline?: SvgInvoiceInput;
};

// ─── DB fetch helpers ─────────────────────────────────────────────────────────

async function fetchInvoiceData(
  supabase: any,
  invoiceId: string
): Promise<SvgInvoiceInput> {
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), customer:customers(address, name, phone, email, gstin)')
    .eq('id', invoiceId)
    .single();

  if (invErr || !inv) throw new Error(`Invoice not found: ${invErr?.message}`);

  const items: SvgLineItem[] = (inv.invoice_items || []).map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.selling_rate) || 0;
    return {
      sn: idx + 1,
      description: it.item_name || '—',
      serialNumber: it.serial_number || undefined,
      qty,
      rate,
      amount: qty * rate,
    };
  });

  const totals: SvgTotals = {
    subtotal: Number(inv.subtotal) || 0,
    discount: Number(inv.discount) || 0,
    tax: Number(inv.total_tax) || 0,
    total: Number(inv.grand_total) || 0,
  };

  return {
    invoiceNo: inv.invoice_code || '—',
    invoiceDate: inv.created_at || new Date().toISOString(),
    customerName: inv.customer_name || inv.customer?.name || 'Walk-in Customer',
    customerAddress: inv.customer_address || inv.customer?.address || '—',
    customerPhone: inv.customer_contact || inv.customer?.phone || '—',
    customerEmail: inv.customer_email || inv.customer?.email || '',
    customerGstin: inv.customer_gstin || inv.customer?.gstin || undefined,
    items,
    totals,
  };
}

async function fetchJobReceiptData(
  supabase: any,
  jobId: string
): Promise<SvgInvoiceInput> {
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('*, billing_legacy(*), job_materials(*), customer:customers(address, name, phone, email, gstin), job_type_ref:job_types!jobs_job_type_ref_id_fkey(id, title, customer_charge_amount)')
    .eq('id', jobId)
    .single();

  if (jobErr || !job) throw new Error(`Job not found: ${jobErr?.message}`);

  const billing = job.billing_legacy?.[0] || {};
  const materials: SvgLineItem[] = (job.job_materials || []).map((m: any, idx: number) => {
    const qty = Number(m.quantity) || 1;
    const rate = Number(m.unit_cost) || 0;
    return {
      sn: idx + 1,
      description: m.material_name || '—',
      qty,
      rate,
      amount: qty * rate,
    };
  });

  // Add service / job-type charge as a line item if the job has a linked service type
  const serviceCharge = Number(job.job_type_ref?.customer_charge_amount) || 0;
  const serviceTitle = job.job_type_ref?.title || null;
  if (serviceCharge > 0) {
    materials.push({
      sn: materials.length + 1,
      description: serviceTitle || 'Service Charge',
      qty: 1,
      rate: serviceCharge,
      amount: serviceCharge,
    });
  }

  const partsTotal = (job.job_materials || []).reduce((s: number, m: any) => s + (Number(m.quantity) || 1) * (Number(m.unit_cost) || 0), 0);
  const subtotal = partsTotal + serviceCharge;
  const taxPct = Number(billing.tax_percent) || 0;
  const tax = subtotal * taxPct / 100;
  const discount = Number(billing.discount) || 0;
  const total = Number(billing.grand_total) || (subtotal + tax - discount);

  return {
    invoiceNo: job.job_code || jobId.slice(0, 8).toUpperCase(),
    invoiceDate: job.created_at || new Date().toISOString(),
    customerName: job.customer_name || job.customer?.name || 'Walk-in Customer',
    customerAddress: job.customer_address || job.customer?.address || '—',
    customerPhone: job.customer_contact || job.customer?.phone || '—',
    customerEmail: job.customer_email || job.customer?.email || '',
    customerGstin: job.customer_gstin || job.customer?.gstin || undefined,
    items: materials.length > 0 ? materials : [{
      sn: 1, description: serviceTitle || 'Service / Repair', qty: 1,
      rate: subtotal, amount: subtotal,
    }],
    totals: { subtotal, discount, tax, total },
  };
}

async function fetchSaleData(
  supabase: any,
  saleId: string
): Promise<SvgInvoiceInput> {
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('*, sale_items(*), customer:customers(address, name, phone, email, gstin)')
    .eq('id', saleId)
    .single();

  if (saleErr || !sale) throw new Error(`Sale not found: ${saleErr?.message}`);

  const items: SvgLineItem[] = (sale.sale_items || []).map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.unit_price) || 0;
    return {
      sn: idx + 1,
      description: it.item_name || '—',
      serialNumber: it.serial_number || undefined,
      qty,
      rate,
      amount: qty * rate,
    };
  });

  const subtotal = Number(sale.subtotal) || items.reduce((s, i) => s + i.amount, 0);
  const tax = subtotal * (Number(sale.tax_percent) || 0) / 100;
  const discount = Number(sale.discount) || 0;
  const total = Number(sale.grand_total) || (subtotal + tax - discount);

  return {
    invoiceNo: sale.invoice_number || sale.sale_code || '—',
    invoiceDate: sale.created_at || new Date().toISOString(),
    customerName: sale.customer_name || sale.customer?.name || 'Walk-in Customer',
    customerAddress: sale.customer_address || sale.customer?.address || '—',
    customerPhone: sale.customer_contact || sale.customer?.phone || '—',
    customerEmail: sale.customer_email || sale.customer?.email || '',
    customerGstin: sale.customer_gstin || sale.customer?.gstin || undefined,
    items,
    totals: { subtotal, discount, tax, total },
  };
}

// ─── Drive upload helper ──────────────────────────────────────────────────────

async function uploadToDrive(
  html: string,
  invoiceDate: string,
  docType: DocType,
  refCode: string
): Promise<{ driveLink: string; fileId: string }> {
  const token = await getAccessToken();

  const invoiceDateObj = new Date(invoiceDate);
  const year = String(invoiceDateObj.getFullYear());
  const month = String(invoiceDateObj.getMonth() + 1).padStart(2, '0');
  
  const folderName = docType === 'sale' ? 'SALE BILL' : 'JOBS BILL';
  const folderId = await ensureFolderPath(token, [folderName, year, month]);

  const safeRef = sanitizeFilenameSegment(refCode);
  const filename = `${docType}-${safeRef}.html`;

  const htmlBytes = new TextEncoder().encode(html);
  const { fileId, webViewLink } = await uploadFileToDrive(token, {
    name: filename,
    mimeType: 'text/html',
    parentId: folderId,
    data: htmlBytes,
  });

  return { driveLink: webViewLink, fileId };
}

// ─── Write drive link back to DB ──────────────────────────────────────────────

async function persistDriveLink(
  supabase: any,
  docType: DocType,
  jobId: string | undefined,
  saleId: string | undefined,
  invoiceId: string | undefined,
  driveLink: string,
  fileId: string
): Promise<void> {
  if ((docType === 'final' || docType === 'receipt') && invoiceId) {
    await supabase
      .from('invoices')
      .update({ drive_link: driveLink, drive_file_id: fileId })
      .eq('id', invoiceId);
  } else if (docType === 'sale' && saleId) {
    await supabase
      .from('sales')
      .update({ drive_link: driveLink, drive_file_id: fileId })
      .eq('id', saleId);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body: InvoiceRequest;
  try {
    body = await req.json() as InvoiceRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!body.docType || !['final', 'receipt', 'sale'].includes(body.docType)) {
    return new Response(JSON.stringify({ error: 'docType must be final | receipt | sale' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── Fetch invoice data ────────────────────────────────────────────────────
  let invoiceInput: SvgInvoiceInput;
  try {
    if (body.inline) {
      invoiceInput = body.inline;
    } else if (body.docType === 'final' && body.invoiceId) {
      invoiceInput = await fetchInvoiceData(supabase, body.invoiceId);
    } else if (body.docType === 'receipt' && body.jobId) {
      invoiceInput = await fetchJobReceiptData(supabase, body.jobId);
    } else if (body.docType === 'sale' && body.saleId) {
      invoiceInput = await fetchSaleData(supabase, body.saleId);
    } else {
      return new Response(JSON.stringify({
        error: 'Provide invoiceId (final), jobId (receipt), saleId (sale), or inline data',
      }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  } catch (fetchErr: any) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 422,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Render SVG invoice ────────────────────────────────────────────────────
  let html: string;
  try {
    html = renderSvgInvoice(invoiceInput);
  } catch (renderErr: any) {
    console.error('[generate-invoice] Render failed:', renderErr.message);
    return new Response(JSON.stringify({ error: `Render failed: ${renderErr.message}` }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Google Drive upload ───────────────────────────────────────────────────
  // Only runs when a reference ID is supplied. Failures never break the response.
  let driveLink: string | null = null;
  const hasRef = body.jobId || body.saleId || body.invoiceId;

  if (hasRef) {
    try {
      const refCode = invoiceInput.invoiceNo;
      const { driveLink: dl, fileId } = await uploadToDrive(
        html,
        invoiceInput.invoiceDate,
        body.docType,
        refCode
      );
      driveLink = dl;

      await persistDriveLink(
        supabase,
        body.docType,
        body.jobId,
        body.saleId,
        body.invoiceId,
        dl,
        fileId
      ).catch((e: any) => {
        console.warn('[generate-invoice] DB persist failed (non-fatal):', e.message);
      });
    } catch (driveErr: any) {
      console.error('[generate-invoice] Drive upload failed (non-fatal):', driveErr.message);
      // Queue for retry
      const refId = body.invoiceId || body.saleId || body.jobId;
      const refTable = body.saleId ? 'sales' : 'invoices';
      
      if (refId) {
        try {
          await supabase.from('pending_uploads').insert({
            type: body.docType,
            reference_id: refId,
            reference_table: refTable,
            payload_json: {
              jobId: body.jobId,
              invoiceId: body.invoiceId,
              saleId: body.saleId,
              docType: body.docType,
              filename: `${body.docType}-${sanitizeFilenameSegment(invoiceInput.invoiceNo)}.html`,
              htmlContent: html,
              year: new Date(invoiceInput.invoiceDate).getFullYear(),
              month: new Date(invoiceInput.invoiceDate).getMonth() + 1,
            },
          });
        } catch (queueErr: any) {
          console.error('[generate-invoice] Failed to queue pending upload:', queueErr.message);
        }
      }
    }
  }

  return new Response(JSON.stringify({ html, driveLink }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
