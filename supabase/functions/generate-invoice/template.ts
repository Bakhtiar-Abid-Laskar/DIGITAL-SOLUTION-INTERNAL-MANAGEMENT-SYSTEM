// template.ts — Single HTML/CSS template for all 3 docTypes.
// Images are referenced via absolute URL (set LETTERHEAD_URL and QR_URL env vars,
// or pass letterheadUrl / qrUrl at render time).

import { InvoiceTotals, LineItem, fmt } from './calc.ts';
import { DocType } from './schema.ts';

export type RenderInput = {
  docType: DocType;
  invoiceNo?: string;
  jobId?: string;
  date: string;
  customer: { name: string; gst?: string; phone: string; address: string };
  items: LineItem[];
  totals: InvoiceTotals;
  letterheadUrl: string;  // absolute URL or data: URI
  qrUrl: string;          // absolute URL or data: URI
};

const BANK = {
  name: 'Punjab National Bank',
  accountNo: '0313050408714',
  ifsc: 'PUNB0031320',
  branch: 'MEHERPUR',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderItemRows(items: LineItem[]): string {
  return items.map(item => `
    <tr>
      <td class="center">${item.sn}</td>
      <td>${esc(item.description)}</td>
      <td class="center">${esc(item.hsn)}</td>
      <td class="right">&#8377;${fmt(item.price)}</td>
      <td class="center">${item.unit}</td>
      <td class="right">&#8377;${fmt(item.price * item.unit)}</td>
    </tr>`).join('');
}

function renderDocMeta(docType: DocType, invoiceNo?: string, jobId?: string, date?: string): string {
  const rows: string[] = [];
  if (docType !== 'receipt') {
    rows.push(`<div class="meta-label">INVOICE</div>`);
    rows.push(`<div class="meta-row-item"><span class="meta-key">INVOICE NO.:</span> <span class="meta-val">${esc(invoiceNo || '')}</span></div>`);
  }
  if (docType !== 'sale') {
    rows.push(`<div class="meta-row-item"><span class="meta-key">JOB ID:</span> <span class="meta-val">${esc(jobId || '')}</span></div>`);
  }
  rows.push(`<div class="meta-row-item"><span class="meta-key">DATE:</span> <span class="meta-val">${esc(formatDate(date || ''))}</span></div>`);
  return rows.join('\n');
}

export function renderHtml(input: RenderInput): string {
  const { docType, invoiceNo, jobId, date, customer, items, totals, letterheadUrl, qrUrl } = input;
  const showTotals = docType !== 'receipt';
  const showBank = docType !== 'receipt';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docType === 'receipt' ? 'Job Receipt' : 'Invoice'} — Digital Solution</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4 portrait;
    margin: 0;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
    color: #112435;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    background-image: url('${letterheadUrl}');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    overflow: hidden;
    page-break-after: always;
  }

  /* ── CONTENT WRAPPER ── sits in the white canvas 39mm → 257mm */
  .content {
    position: absolute;
    top: 39mm;
    left: 14mm;
    right: 14mm;
    bottom: 42mm;
  }

  /* ── SECTION 1: CUSTOMER + DOC META ── */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 5mm;
  }

  .bill-to {
    max-width: 100mm;
  }

  .bill-to h3 {
    font-size: 8pt;
    font-weight: bold;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    margin-bottom: 2mm;
    border-bottom: 1px solid #ddd;
    padding-bottom: 1mm;
  }

  .bill-to p {
    font-size: 8.5pt;
    line-height: 1.5;
    color: #112435;
  }

  .bill-to .cust-name {
    font-size: 10pt;
    font-weight: bold;
    color: #112435;
  }

  .doc-meta {
    text-align: right;
    min-width: 65mm;
  }

  .meta-label {
    font-size: 14pt;
    font-weight: bold;
    color: #D81035;
    letter-spacing: 2pt;
    margin-bottom: 2mm;
  }

  .meta-row-item {
    font-size: 8pt;
    line-height: 1.6;
  }

  .meta-key {
    color: #666;
    font-weight: normal;
  }

  .meta-val {
    font-weight: bold;
    color: #112435;
  }

  /* ── SECTION 2: ITEMS TABLE ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4mm;
    font-size: 8.5pt;
  }

  .items-table thead tr {
    background-color: #112435;
    color: #fff;
  }

  .items-table th {
    padding: 2mm 2.5mm;
    text-align: left;
    font-weight: bold;
    font-size: 8pt;
    letter-spacing: 0.3pt;
  }

  .items-table th.center, .items-table td.center { text-align: center; }
  .items-table th.right,  .items-table td.right  { text-align: right; }

  .items-table th:nth-child(1) { width: 7%; }
  .items-table th:nth-child(2) { width: 38%; }
  .items-table th:nth-child(3) { width: 13%; }
  .items-table th:nth-child(4) { width: 14%; }
  .items-table th:nth-child(5) { width: 10%; }
  .items-table th:nth-child(6) { width: 18%; }

  .items-table tbody tr:nth-child(even) { background-color: #f7f8fa; }
  .items-table tbody tr:nth-child(odd)  { background-color: #fff; }

  .items-table td {
    padding: 1.8mm 2.5mm;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: middle;
  }

  .items-table tbody tr:last-child td {
    border-bottom: 2px solid #112435;
  }

  /* ── SECTION 3: TERMS + TOTALS ── */
  .bottom-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 3mm;
    gap: 4mm;
  }

  .terms {
    flex: 1;
    font-size: 7.5pt;
    color: #555;
  }

  .terms h4 {
    font-size: 8pt;
    font-weight: bold;
    color: #112435;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    margin-bottom: 2mm;
    border-bottom: 1px solid #ddd;
    padding-bottom: 1mm;
  }

  .terms ul {
    padding-left: 3.5mm;
    line-height: 1.7;
  }

  .totals-box {
    min-width: 68mm;
    border: 1px solid #ddd;
    border-radius: 2mm;
    overflow: hidden;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 1.5mm 3mm;
    font-size: 8.5pt;
    border-bottom: 1px solid #eee;
  }

  .totals-row:last-child {
    border-bottom: none;
    background: #112435;
    color: #fff;
    font-weight: bold;
    font-size: 9.5pt;
  }

  .totals-row .t-label { color: inherit; }
  .totals-row .t-val   { font-weight: bold; }

  /* ── SECTION 4: BANK + QR + SIGNATURE ── */
  .bank-qr-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 5mm;
    padding-top: 3mm;
    border-top: 1px solid #ddd;
  }

  .bank-details {
    flex: 1;
    font-size: 7.5pt;
    line-height: 1.7;
  }

  .bank-details h4 {
    font-size: 8pt;
    font-weight: bold;
    color: #112435;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    margin-bottom: 1.5mm;
  }

  .bank-details p { color: #333; }
  .bank-details strong { color: #112435; }

  .qr-block {
    text-align: center;
    font-size: 7pt;
    color: #555;
  }

  .qr-block img {
    width: 26mm;
    height: 26mm;
    display: block;
    margin: 0 auto 1mm;
    border: 1px solid #ddd;
    border-radius: 1mm;
  }

  .signature {
    min-width: 55mm;
    text-align: center;
    padding-top: 10mm;
    font-size: 8pt;
    color: #555;
  }

  .signature .sig-line {
    border-top: 1px solid #112435;
    margin-bottom: 2mm;
  }

  .signature strong {
    display: block;
    color: #112435;
    font-size: 8.5pt;
  }



  /* ── PRINT BUTTON (hidden in print) ── */
  .print-btn {
    display: block;
    margin: 8mm auto;
    padding: 3mm 12mm;
    background: #112435;
    color: #fff;
    border: none;
    border-radius: 2mm;
    font-size: 11pt;
    cursor: pointer;
    font-family: Arial, sans-serif;
  }

  @media print {
    .print-btn { display: none !important; }
    body { background: #fff; }
  }
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">&#128438; Print / Save PDF</button>

<div class="page">

  <div class="content">

    <!-- SECTION 1: Customer + Doc Meta -->
    <div class="header-row">
      <div class="bill-to">
        <h3>Bill To</h3>
        <p class="cust-name">${esc(customer.name)}</p>
        ${customer.gst ? `<p>GST: ${esc(customer.gst)}</p>` : ''}
        <p>PHN: ${esc(customer.phone)}</p>
        <p>ADD: ${esc(customer.address)}</p>
      </div>
      <div class="doc-meta">
        ${renderDocMeta(docType, invoiceNo, jobId, date)}
      </div>
    </div>

    <!-- SECTION 2: Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="center">S/N</th>
          <th>DESCRIPTION</th>
          <th class="center">HSN</th>
          <th class="right">PRICE</th>
          <th class="center">QTY</th>
          <th class="right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${renderItemRows(items)}
      </tbody>
    </table>

    ${showTotals ? `
    <!-- SECTION 3: Terms + Totals -->
    <div class="bottom-section">
      <div class="terms">
        <h4>Terms &amp; Conditions</h4>
        <ul>
          <li>Goods once sold will not be taken back.</li>
          <li>Warranty as per respective Manufacturer's Policy.</li>
          <li>Prices are inclusive of all Taxes.</li>
          <li>Service has no warranty.</li>
        </ul>
      </div>
      <div class="totals-box">
        <div class="totals-row">
          <span class="t-label">Sub Total</span>
          <span class="t-val">&#8377;${fmt(totals.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span class="t-label">GST ${totals.taxRatePct}% (incl.)</span>
          <span class="t-val">&#8377;${fmt(totals.tax)}</span>
        </div>
        ${totals.discount > 0 ? `
        <div class="totals-row">
          <span class="t-label">Discount</span>
          <span class="t-val">-&#8377;${fmt(totals.discount)}</span>
        </div>` : ''}
        <div class="totals-row">
          <span class="t-label">GRAND TOTAL</span>
          <span class="t-val">&#8377;${fmt(totals.total)}</span>
        </div>
      </div>
    </div>` : ''}

    ${showBank ? `
    <!-- SECTION 4: Bank + QR + Signature -->
    <div class="bank-qr-row">
      <div class="bank-details">
        <h4>Bank Details</h4>
        <p>NAME&nbsp;&nbsp;: <strong>${BANK.name}</strong></p>
        <p>A/C No.: <strong>${BANK.accountNo}</strong></p>
        <p>IFSC&nbsp;&nbsp;: <strong>${BANK.ifsc}</strong></p>
        <p>BRANCH: <strong>${BANK.branch}</strong></p>
      </div>
      <div class="qr-block">
        <img src="${qrUrl}" alt="UPI QR Code">
        <span>Scan to Pay</span>
      </div>
      <div class="signature">
        <div class="sig-line"></div>
        <strong>For DIGITAL SOLUTION</strong>
        <span>Authorised Signatory</span>
        <br><br>
        <em style="font-size:7pt;color:#888">Thank you for your Business!</em>
      </div>
    </div>` : `
    <!-- Receipt: signature only -->
    <div style="margin-top:8mm; text-align:right;">
      <div style="display:inline-block; min-width:55mm; text-align:center;">
        <div style="border-top:1px solid #112435; margin-bottom:2mm;"></div>
        <strong style="font-size:8.5pt;color:#112435;">For DIGITAL SOLUTION</strong><br>
        <span style="font-size:8pt;color:#555;">Authorised Signatory</span>
      </div>
    </div>`}

  </div><!-- /content -->



</div><!-- /page -->

<button class="print-btn" onclick="window.print()">&#128438; Print / Save PDF</button>

<script>
  // Auto-trigger print dialog when this page opens in a popup
  if (window.opener) {
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  }
</script>

</body>
</html>`;
}
