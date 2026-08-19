// svgTemplate.ts — SVG-based invoice renderer.
// Takes the digitalsolution_bill_templete.svg as its immutable visual source of truth.
// Fills tokens, generates dynamic items rows, embeds base64 images, returns
// a complete HTML string (SVG inlined) ready for expo-print or browser.print().
//
// Layout constants verified directly against the SVG file:
//   Items table header bottom border: y=306
//   Items table bottom divider:       y=812
//   Available height for rows:        506px
//   Column X positions (from header text elements):
//     SL:          x=50,  text-anchor=start  → display at x=65 (centre of ~30px col)
//     DESCRIPTION: x=90,  text-anchor=start
//     QTY:         x=480, text-anchor=middle
//     RATE:        x=590, text-anchor=middle
//     AMOUNT:      x=744, text-anchor=end

import { COMPANY, BANK, TERMS } from './companyConfig.ts';
import { LOGO_B64, QR_B64 } from './svgAssets.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SvgLineItem = {
  sn: number;
  description: string;
  serialNumber?: string;
  qty: number;
  rate: number;      // per-unit, inclusive of tax
  amount: number;    // qty * rate
};

export type SvgTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export type SvgInvoiceInput = {
  invoiceNo: string;
  invoiceDate: string;        // ISO date string
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerGstin?: string;
  items: SvgLineItem[];
  totals: SvgTotals;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Indian lakh/crore currency formatting: ₹12,45,678.00 */
function formatINR(n: number): string {
  if (!isFinite(n)) return '₹0.00';
  return '₹' + Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** DD/MM/YYYY for Indian locale */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** XML-escape text for safe injection into SVG text nodes */
function x(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Truncate long strings for fixed-width fields */
function trunc(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

// ─── Items Table Generator ────────────────────────────────────────────────────

const ROW_HEIGHT = 22;           // px per row
const FIRST_ROW_Y = 326;         // baseline of first row (20px below y=306 divider)
const MAX_ROWS_PER_PAGE = 22;    // floor(506 / 22) = 23, use 22 for safe margin
const DESC_MAX_CHARS = 52;       // characters before description wraps
const DESC_WRAP_CHARS = 50;      // characters per wrapped line
const DESC_WRAP_DY = 16;         // px offset per tspan wrap line

/**
 * Splits description into SVG tspan lines for wrapping within the DESCRIPTION column.
 * Returns the SVG markup and the total extra height added by wrapping.
 */
function buildDescriptionTspan(desc: string, serialNumber: string | undefined, baseY: number): {
  markup: string;
  extraHeight: number;
} {
  const words = desc.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > DESC_WRAP_CHARS && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  // Add serial number as a faint sub-line if present
  const snLine = serialNumber ? `S/N: ${serialNumber}` : null;

  let markup = `<text x="90" y="${baseY}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1a1a1a">`;
  markup += `<tspan x="90" dy="0">${x(lines[0])}</tspan>`;
  for (let i = 1; i < lines.length; i++) {
    markup += `<tspan x="90" dy="${DESC_WRAP_DY}">${x(lines[i])}</tspan>`;
  }
  if (snLine) {
    markup += `<tspan x="90" dy="${DESC_WRAP_DY}" font-size="9" fill="#8a8f9c">${x(snLine)}</tspan>`;
  }
  markup += `</text>`;

  const extraHeight = (lines.length - 1) * DESC_WRAP_DY + (snLine ? DESC_WRAP_DY : 0);
  return { markup, extraHeight };
}

/**
 * Splits terms into SVG tspan lines for wrapping within a fixed ~230px column.
 * Truncates at 3 lines to prevent vertical collision.
 */
function buildTermsTspan(terms: string, baseY: number): string {
  const words = terms.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > 45 && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].replace(/.$/, '…');
  }

  // Typography change: color #7a7f8c for better contrast
  let markup = `<text x="50" y="${baseY}" font-family="Arial, Helvetica, sans-serif" font-size="8.5" fill="#7a7f8c">`;
  if (lines.length > 0) {
    markup += `<tspan x="50" dy="0">Terms: ${x(lines[0])}</tspan>`;
    for (let i = 1; i < lines.length; i++) {
      markup += `<tspan x="50" dy="12">${x(lines[i])}</tspan>`;
    }
  } else {
    markup += `<tspan x="50" dy="0">Terms: </tspan>`;
  }
  markup += `</text>`;
  return markup;
}

/**
 * Generates SVG rows for the items-area group.
 * Returns the markup for page 1 items and remaining items for page 2+.
 */
function buildItemRows(items: SvgLineItem[]): { page1Markup: string; overflow: SvgLineItem[]; finalY: number } {
  let markup = '';
  let currentY = FIRST_ROW_Y;
  let rowIndex = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const bgFill = rowIndex % 2 === 0 ? '#f7f9fd' : '#ffffff';

    // Pre-calculate description wrapping
    const { markup: descMarkup, extraHeight } = buildDescriptionTspan(
      item.description,
      item.serialNumber,
      currentY
    );
    const rowH = ROW_HEIGHT + extraHeight;

    // Check if this row fits on page 1
    // 812 is the bottom divider Y; leave 2px margin
    if (currentY + rowH > 812) {
      return { page1Markup: markup, overflow: items.slice(i), finalY: currentY };
    }

    // Alternate row background stripe
    markup += `<rect x="50" y="${currentY - 15}" width="694" height="${rowH}" fill="${bgFill}" opacity="0.6"/>`;

    // SL number — centred in ~40px column starting at x=50
    markup += `<text x="65" y="${currentY}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#3a3f4c" text-anchor="middle">${x(item.sn)}</text>`;

    // DESCRIPTION (with tspan wrapping)
    markup += descMarkup;

    // QTY — centred at x=480
    markup += `<text x="480" y="${currentY}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#3a3f4c" text-anchor="middle">${x(item.qty)}</text>`;

    // RATE — centred at x=590
    markup += `<text x="590" y="${currentY}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#3a3f4c" text-anchor="middle">${x(formatINR(item.rate))}</text>`;

    // AMOUNT — right-anchored at x=744
    markup += `<text x="744" y="${currentY}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1a1a1a" font-weight="700" text-anchor="end">${x(formatINR(item.amount))}</text>`;

    // Thin bottom separator line for each row
    markup += `<line x1="50" y1="${currentY - 15 + rowH}" x2="744" y2="${currentY - 15 + rowH}" stroke="#e4e9f4" stroke-width="0.8"/>`;

    currentY += rowH;
    rowIndex++;
  }

  return { page1Markup: markup, overflow: [], finalY: currentY };
}

// ─── SVG Template (single page) ───────────────────────────────────────────────

/**
 * Returns the filled SVG string for one page.
 * On overflow pages: isFirstPage=false hides the header block and shows a continuation note.
 * showTotals=false hides the totals+payment section (used on intermediate overflow pages).
 */
function buildSvgPage(
  input: SvgInvoiceInput,
  itemsMarkup: string,
  showTotals: boolean,
  isFirstPage: boolean,
  pageLabel?: string,
  finalY: number = 838
): string {
  const {
    invoiceNo, invoiceDate, customerName, customerAddress,
    customerPhone, customerEmail, customerGstin,
    totals,
  } = input;

  // Replace tokens
  const companyName    = x(trunc(COMPANY.name, 35));
  const companyTagline = x(trunc(COMPANY.tagline, 55));
  const companyAddress = x(trunc(COMPANY.address, 65));
  const companyPhone   = x(COMPANY.phone);
  const companyEmail   = x(COMPANY.email);

  const invNo   = x(invoiceNo || '—');
  const invDate = x(formatDate(invoiceDate));

  const clientName    = x(trunc(customerName || 'Walk-in Customer', 40));
  const clientAddress = x(trunc(customerAddress || '—', 70));
  const clientPhone   = x(customerPhone || '—');
  const clientEmail   = x(customerEmail || '');
  // GSTIN: show value or blank — label is always shown (fixed position in SVG)
  const clientGstin   = x(customerGstin || '—');

  const subtotalTxt  = x(formatINR(totals.subtotal));
  const discountTxt  = x(totals.discount > 0 ? `- ${formatINR(totals.discount)}` : '—');
  const taxTxt       = x(formatINR(totals.tax));
  const totalTxt     = x(formatINR(totals.total));

  const bankName  = x(BANK.name);
  const accountNo = x(BANK.accountNo);
  const ifscCode  = x(BANK.ifsc);
  const upiId     = x(BANK.upiId);
  const terms     = x(trunc(TERMS, 120));

  // For continuation pages, show a "Continued..." watermark and page label in the items area
  const continuedNote = !isFirstPage
    ? `<text x="397" y="325" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#8a8f9c" text-anchor="middle" font-style="italic">${x(pageLabel || 'Continued from previous page')}</text>`
    : '';

  // Make totals position dynamic based on item count, minimum at 450
  const baseTotalsY = Math.max(finalY + 40, 450);

  // The totals + payment section (only on last page)
  const totalsSection = showTotals ? `
  <!-- ===================== PAYMENT DETAILS + QR   |   TOTALS ===================== -->
  <polygon points="56,${baseTotalsY} 62,${baseTotalsY+3.5} 62,${baseTotalsY+10.5} 56,${baseTotalsY+14} 50,${baseTotalsY+10.5} 50,${baseTotalsY+3.5}" fill="#1447b5"/>
  <text x="68" y="${baseTotalsY+11}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1.5" fill="#0b1f6b">PAYMENT DETAILS</text>

  <text id="bank-name"  x="50" y="${baseTotalsY+32}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#5a5f6e">Bank:  ${bankName}</text>
  <text id="account-no" x="50" y="${baseTotalsY+48}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#5a5f6e">A/C No:  ${accountNo}</text>
  <text id="ifsc"       x="50" y="${baseTotalsY+64}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#5a5f6e">IFSC:  ${ifscCode}</text>
  <text id="upi"        x="50" y="${baseTotalsY+80}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#5a5f6e">UPI:  ${upiId}</text>
  ${buildTermsTspan(TERMS, baseTotalsY+98)}

  <rect x="296" y="${baseTotalsY-2}" width="98" height="98" rx="8" fill="#fbfcfe" stroke="#1447b5" stroke-width="1.2" stroke-dasharray="4 3" filter="url(#softShadow)"/>
  <polygon points="296,${baseTotalsY+14} 296,${baseTotalsY-2} 312,${baseTotalsY-2}" fill="url(#headerBlue)" opacity="0.6"/>
  <image id="payment-qr" href="${QR_B64}" x="304" y="${baseTotalsY+6}" width="82" height="82" preserveAspectRatio="xMidYMid meet"/>
  <text x="345" y="${baseTotalsY+112}" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#8a8f9c" text-anchor="middle">Scan to Pay</text>

  <line x1="474" y1="${baseTotalsY}" x2="744" y2="${baseTotalsY}" stroke="#e4e9f4" stroke-width="1"/>

  <text x="474" y="${baseTotalsY+20}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#5a5f6e">Subtotal</text>
  <text id="subtotal" x="744" y="${baseTotalsY+20}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1a1a1a" font-weight="700" text-anchor="end">${subtotalTxt}</text>

  <text x="474" y="${baseTotalsY+38}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#5a5f6e">Discount</text>
  <text id="discount" x="744" y="${baseTotalsY+38}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1a1a1a" font-weight="600" text-anchor="end">${discountTxt}</text>

  <text x="474" y="${baseTotalsY+56}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#5a5f6e">Tax / GST</text>
  <text id="tax" x="744" y="${baseTotalsY+56}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#1a1a1a" font-weight="600" text-anchor="end">${taxTxt}</text>

  <line x1="474" y1="${baseTotalsY+66}" x2="744" y2="${baseTotalsY+66}" stroke="#e4e9f4" stroke-width="1"/>

  <rect x="474" y="${baseTotalsY+74}" width="270" height="34" rx="6" fill="url(#headerBlue)" filter="url(#softShadow)"/>
  <polygon points="474,${baseTotalsY+74} 490,${baseTotalsY+74} 474,${baseTotalsY+84}" fill="#ffffff" opacity="0.18"/>
  <text x="490" y="${baseTotalsY+96}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#ffffff">TOTAL DUE</text>
  <text id="total" x="730" y="${baseTotalsY+96}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="#ffffff" text-anchor="end">${totalTxt}</text>

  <!-- ===================== CLOSING NOTES ===================== -->
  <text x="397" y="${baseTotalsY+140}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#0b1f6b" text-anchor="middle">Thank you for your business!</text>
  <text x="397" y="${baseTotalsY+158}" font-family="Arial, Helvetica, sans-serif" font-size="9.5" font-style="italic" fill="#8a8f9c" text-anchor="middle">This is a computer generated document and does not require a signature.</text>
  ` : '';

  return `<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">

  <defs>
    <linearGradient id="headerBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1f6b"/>
      <stop offset="55%" stop-color="#1447b5"/>
      <stop offset="100%" stop-color="#3fa9f5"/>
    </linearGradient>
    <linearGradient id="darkGray" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a4a4a"/>
      <stop offset="100%" stop-color="#161616"/>
    </linearGradient>
    <linearGradient id="accentStrip" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0b1f6b"/>
      <stop offset="50%" stop-color="#2f8fe0"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
    <linearGradient id="edgeBar" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0b1f6b"/>
      <stop offset="50%" stop-color="#2f8fe0"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#0b1f6b" flood-opacity="0.10"/>
    </filter>
  </defs>

  <!-- PAGE BACKGROUND -->
  <rect x="0" y="0" width="794" height="1123" fill="#ffffff"/>

  <!-- spine edge accent -->
  <rect x="0" y="0" width="5" height="1123" fill="url(#edgeBar)"/>

  <!-- faint geometric watermark hexagons -->
  <polygon points="397,340 500,401 500,523 397,584 294,523 294,401" fill="none" stroke="#0b1f6b" stroke-width="2" opacity="0.03"/>
  <polygon points="397,378 470,421 470,504 397,547 324,504 324,421" fill="none" stroke="#0b1f6b" stroke-width="2" opacity="0.03"/>

  <!-- CORNER MOTIF: TOP-LEFT -->
  <g id="corner-tl">
    <polygon points="0,0 160,0 0,120" fill="url(#headerBlue)"/>
    <polygon points="0,0 95,0 0,72" fill="url(#darkGray)" opacity="0.92"/>
    <polygon points="0,0 160,0 0,120" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.25"/>
    <polygon points="18,68 52,49 86,68 86,105 52,124 18,105" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.4"/>
    <polygon points="70,100 102,82 134,100 134,133 102,151 70,133" fill="none" stroke="#3fa9f5" stroke-width="1.1" opacity="0.32"/>
    <circle cx="160" cy="22" r="3" fill="#3fa9f5" opacity="0.7"/>
    <circle cx="176" cy="33" r="2.2" fill="#1447b5" opacity="0.6"/>
    <circle cx="191" cy="18" r="2" fill="#0b1f6b" opacity="0.5"/>
    <line x1="160" y1="22" x2="176" y2="33" stroke="#3fa9f5" stroke-width="1" opacity="0.4"/>
    <line x1="176" y1="33" x2="191" y2="18" stroke="#1447b5" stroke-width="1" opacity="0.4"/>
  </g>

  <!-- CORNER MOTIF: TOP-RIGHT -->
  <g id="corner-tr">
    <polygon points="794,0 644,0 794,34" fill="url(#accentStrip)" opacity="0.88"/>
    <polygon points="794,0 706,0 794,20" fill="url(#darkGray)" opacity="0.8"/>
    <polygon points="794,0 644,0 794,34" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.22"/>
    <polygon points="758,52 778,41 798,52 798,74 778,85 758,74" fill="none" stroke="#1447b5" stroke-width="1" opacity="0.28"/>
    <polygon points="758,98 778,87 798,98 798,120 778,131 758,120" fill="none" stroke="#3fa9f5" stroke-width="1" opacity="0.24"/>
    <circle cx="770" cy="140" r="2.4" fill="#3fa9f5" opacity="0.5"/>
    <circle cx="782" cy="152" r="1.8" fill="#1447b5" opacity="0.45"/>
    <line x1="770" y1="140" x2="782" y2="152" stroke="#3fa9f5" stroke-width="1" opacity="0.35"/>
  </g>

  <!-- CORNER MOTIF: BOTTOM-LEFT -->
  <g id="corner-bl">
    <polygon points="0,1123 150,1123 0,1089" fill="url(#accentStrip)" opacity="0.88"/>
    <polygon points="0,1123 88,1123 0,1103" fill="url(#darkGray)" opacity="0.8"/>
    <polygon points="0,1123 150,1123 0,1089" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.22"/>
    <polygon points="36,1071 16,1082 -4,1071 -4,1049 16,1038 36,1049" fill="none" stroke="#1447b5" stroke-width="1" opacity="0.28"/>
    <polygon points="36,1025 16,1036 -4,1025 -4,1003 16,992 36,1003" fill="none" stroke="#3fa9f5" stroke-width="1" opacity="0.24"/>
  </g>

  <!-- CORNER MOTIF: BOTTOM-RIGHT -->
  <g id="corner-br">
    <polygon points="794,1123 634,1123 794,1003" fill="url(#headerBlue)"/>
    <polygon points="794,1123 699,1123 794,1051" fill="url(#darkGray)" opacity="0.92"/>
    <polygon points="794,1123 634,1123 794,1003" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.25"/>
    <polygon points="776,1055 742,1074 708,1055 708,1018 742,999 776,1018" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.4"/>
    <polygon points="724,1023 692,1041 660,1023 660,990 692,972 724,990" fill="none" stroke="#3fa9f5" stroke-width="1.1" opacity="0.32"/>
  </g>

  ${isFirstPage ? `
  <!-- ===================== HEADER ===================== -->
  <rect x="40" y="26" width="102" height="102" rx="14" fill="#ffffff" filter="url(#softShadow)"/>
  <image id="company-logo" href="${LOGO_B64}" x="52" y="38" width="78" height="78" preserveAspectRatio="xMidYMid meet"/>

  <text id="company-name" x="160" y="62" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#0b1f6b">${companyName}</text>
  <text id="company-tagline" x="160" y="80" font-family="Arial, Helvetica, sans-serif" font-size="10" letter-spacing="1.5" fill="#5b7bb8">${companyTagline}</text>
  <text id="company-address" x="160" y="99" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#5a5f6e">${companyAddress}</text>
  <text id="company-contact" x="160" y="114" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#5a5f6e">Ph: ${companyPhone}  |  ${companyEmail}</text>

  <line x1="565" y1="36" x2="565" y2="122" stroke="#e4e9f4" stroke-width="1"/>

  <text x="738" y="62" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#0b1f6b" text-anchor="end">INVOICE</text>
  <rect x="626" y="72" width="112" height="3" fill="url(#accentStrip)"/>
  <text id="invoice-no" x="738" y="94" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#3a3f4c" text-anchor="end">INV NO:  <tspan font-weight="700" fill="#1a1a1a">${invNo}</tspan></text>
  <text id="invoice-date" x="738" y="110" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#3a3f4c" text-anchor="end">DATE:  <tspan font-weight="700" fill="#1a1a1a">${invDate}</tspan></text>

  <!-- ===================== BILL TO ===================== -->
  <rect x="38" y="156" width="706" height="104" rx="10" fill="#f7f9fd" filter="url(#softShadow)"/>
  <polygon points="726,156 744,156 744,174" fill="url(#accentStrip)" opacity="0.55"/>
  <polygon points="38,244 38,260 56,260" fill="url(#accentStrip)" opacity="0.35"/>
  <polygon points="63,180 69,183.5 69,190.5 63,194 57,190.5 57,183.5" fill="#1447b5"/>
  <text x="76" y="191" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1.5" fill="#0b1f6b">BILLED TO</text>

  <text id="client-name" x="63" y="214" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#1a1a1a">${clientName}</text>
  <text id="client-address" x="63" y="232" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#5a5f6e">${clientAddress}</text>
  <text id="client-contact" x="63" y="248" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#5a5f6e">Ph: ${clientPhone}  |  ${clientEmail}</text>
  <text id="client-gstin-label" x="420" y="214" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="700" fill="#0b1f6b">GSTIN</text>
  <text id="client-gstin-value" x="420" y="230" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#1a1a1a">${clientGstin}</text>
  ` : `
  <!-- Continuation page header note -->
  <text x="397" y="80" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#0b1f6b" text-anchor="middle">${companyName}</text>
  <text x="738" y="80" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#3a3f4c" text-anchor="end">INV NO:  <tspan font-weight="700" fill="#1a1a1a">${invNo}</tspan></text>
  <line x1="38" y1="150" x2="756" y2="150" stroke="#e4e9f4" stroke-width="1"/>
  `}

  <!-- ===================== ITEMS TABLE ===================== -->
  <text x="50"  y="298" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1" fill="#0b1f6b">SL</text>
  <text x="90"  y="298" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1" fill="#0b1f6b">DESCRIPTION</text>
  <text x="480" y="298" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1" fill="#0b1f6b" text-anchor="middle">QTY</text>
  <text x="590" y="298" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1" fill="#0b1f6b" text-anchor="middle">RATE</text>
  <text x="744" y="298" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1" fill="#0b1f6b" text-anchor="end">AMOUNT</text>
  <rect x="50" y="306" width="694" height="2" fill="url(#accentStrip)"/>

  <g id="items-area">
    ${continuedNote}
    ${itemsMarkup}
  </g>
  <line x1="50" y1="${finalY}" x2="744" y2="${finalY}" stroke="#e4e9f4" stroke-width="1"/>

  ${totalsSection}

  <!-- ===================== CONTACT ICON ROW (fixed brand details) ===================== -->
  <!-- Phone -->
  <circle cx="74" cy="1042" r="14" fill="url(#headerBlue)"/>
  <g transform="translate(66.6,1034.6) scale(0.6)">
    <path fill="#ffffff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </g>
  <text x="96" y="1038" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#3a3f4c">7002204047</text>
  <text x="96" y="1051" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#3a3f4c">7002611748</text>

  <!-- Email -->
  <circle cx="305" cy="1042" r="14" fill="url(#headerBlue)"/>
  <g transform="translate(297.6,1034.6) scale(0.6)">
    <path fill="#ffffff" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </g>
  <text x="327" y="1046" font-family="Arial, Helvetica, sans-serif" font-size="9.2" fill="#3a3f4c">digitalsolutionsilchar@gmail.com</text>

  <!-- Location -->
  <circle cx="536" cy="1042" r="14" fill="url(#headerBlue)"/>
  <g transform="translate(528.6,1034.6) scale(0.6)">
    <path fill="#ffffff" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </g>
  <text x="558" y="1038" font-family="Arial, Helvetica, sans-serif" font-size="9.2" fill="#3a3f4c">Rangirkhari, Tarani Road,</text>
  <text x="558" y="1051" font-family="Arial, Helvetica, sans-serif" font-size="9.2" fill="#3a3f4c">Silchar-788005, Cachar, Assam</text>

  <!-- FOOTER SEAL -->
  <line x1="170" y1="1088" x2="624" y2="1088" stroke="#e4e9f4" stroke-width="1"/>
  <g transform="translate(397,1088) rotate(45)">
    <rect x="-7" y="-7" width="14" height="14" rx="3" fill="url(#headerBlue)"/>
  </g>
  <circle cx="358" cy="1088" r="2.5" fill="#3fa9f5" opacity="0.7"/>
  <circle cx="436" cy="1088" r="2.5" fill="#3fa9f5" opacity="0.7"/>
  <circle cx="330" cy="1088" r="1.8" fill="#1447b5" opacity="0.5"/>
  <circle cx="464" cy="1088" r="1.8" fill="#1447b5" opacity="0.5"/>
  <rect x="0" y="1121" width="794" height="2" fill="url(#accentStrip)"/>

</svg>`;
}

// ─── Safety checks ────────────────────────────────────────────────────────────

/**
 * Scans the final SVG string for unfilled tokens or raw file references.
 * Throws loudly rather than silently shipping a broken invoice.
 */
function assertClean(svg: string): void {
  if (/\{\{[A-Z_]+\}\}/.test(svg)) {
    throw new Error('[svgTemplate] Unfilled placeholder token detected in rendered SVG.');
  }
  if (/href="[^"]+\.(png|jpg|jpeg|svg)"/.test(svg)) {
    throw new Error('[svgTemplate] Raw file href reference found in rendered SVG — base64 embedding failed.');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders a complete HTML document with one or more SVG pages inlined.
 * Multi-page (>22 items) produces multiple <svg> blocks, each wrapped in
 * a print-page div with page-break-after: always.
 *
 * The HTML wrapper is sized to A4 with zero margins and renders correctly
 * via expo-print (WebKit) and browser window.print().
 */
export function renderSvgInvoice(input: SvgInvoiceInput): string {
  if (!input.items || input.items.length === 0) {
    // Edge case: zero items — render a single page with an empty table note
    input = {
      ...input,
      items: [{
        sn: 1, description: '(No items)', qty: 0, rate: 0, amount: 0,
      }],
    };
  }

  const pages: string[] = [];
  let remaining = [...input.items];
  let pageNum = 0;

  while (remaining.length > 0 || pageNum === 0) {
    const { page1Markup, overflow, finalY } = buildItemRows(remaining);
    const isLastPage = overflow.length === 0;
    const isFirstPage = pageNum === 0;

    const pageLabel = pageNum > 0
      ? `Continued from page ${pageNum} — Invoice ${input.invoiceNo}`
      : undefined;

    const svgContent = buildSvgPage(
      input,
      page1Markup,
      isLastPage,     // show totals only on the last page
      isFirstPage,
      pageLabel,
      finalY
    );

    assertClean(svgContent);
    pages.push(svgContent);

    remaining = overflow;
    pageNum++;

    if (overflow.length === 0) break;
  }

  const pageWraps = pages.map((svg, i) => `
    <div class="print-page" style="page-break-after: ${i < pages.length - 1 ? 'always' : 'avoid'};">
      ${svg}
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${input.invoiceNo} — ${COMPANY.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 0; }
    body { background: #f0f0f0; font-family: Arial, Helvetica, sans-serif; }
    .print-page { width: 210mm; height: 297mm; display: block; overflow: hidden; }
    .print-page svg { display: block; width: 210mm; height: 297mm; }
    @media print {
      body { background: #fff; }
      .print-page { box-shadow: none; }
    }
    @media screen {
      body { padding: 20px; }
      .print-page { 
        margin: 0 auto 20px; 
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        background: #fff;
      }
    }
  </style>
</head>
<body>
  ${pageWraps}
</body>
</html>`;
}
