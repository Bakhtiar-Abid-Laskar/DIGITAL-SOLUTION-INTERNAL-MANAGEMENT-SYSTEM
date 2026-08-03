// index.ts — Supabase Edge Function: generate-invoice
// Accepts POST with InvoiceDoc, returns { html: string }
// Both web admin and mobile app call this same endpoint.

import { validateInvoiceDoc } from './schema.ts';
import { calculateTotals } from './calc.ts';
import { renderHtml } from './template.ts';
import { LETTERHEAD_B64 } from './assets.ts';

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

  // Determine asset URLs
  // When called from admin web: use the admin panel's public URL
  // When called from mobile: same — the HTML is rendered in expo-print which has internet access
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  
  // Use Base64 inline image for guaranteed rendering on mobile expo-print
  const letterheadUrl = LETTERHEAD_B64;
  
  // QR code is lightweight and usually works via relative, but can also be absolute if needed.
  // We'll let the client handle QR code resolution.
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

  return new Response(JSON.stringify({ html, totals }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
