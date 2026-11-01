/**
 * Calculates the total cost of all materials/parts used in a job.
 * @param materials An array of material objects, each containing a total_cost.
 * @returns The sum of all material total_costs. Returns 0 if the array is empty or null.
 */
export function calculatePartsTotal(materials: { total_cost: number }[]): number {
  if (!materials || materials.length === 0) return 0;
  return materials.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);
}

/**
 * Calculates the tax amount based on parts, labour, and tax percentage.
 * Formula: (partsTotal + labourCharge) * (taxPercent / 100)
 * @param partsTotal The total cost of all parts.
 * @param labourCharge The fixed or hourly labour charge applied.
 * @param taxPercent The tax percentage to apply (e.g., 18 for 18%).
 * @returns The calculated tax amount.
 */
export function calculateTaxAmount(partsTotal: number, labourCharge: number, taxPercent: number): number {
  const p = Number(partsTotal) || 0;
  const l = Number(labourCharge) || 0;
  const t = Number(taxPercent) || 0;
  return (p + l) * (t / 100);
}

/**
 * Calculates the final grand total for an invoice/job.
 * Formula: (partsTotal + labourCharge) * (1 + taxPercent / 100) - discount
 * @param partsTotal The total cost of all parts.
 * @param labourCharge The fixed or hourly labour charge applied.
 * @param taxPercent The tax percentage to apply (e.g., 18 for 18%).
 * @param discount The flat discount amount to subtract.
 * @returns The final grand total. Will not return less than 0.
 */
export function calculateGrandTotal(
  partsTotal: number,
  labourCharge: number,
  taxPercent: number,
  discount: number
): number {
  const p = Number(partsTotal) || 0;
  const l = Number(labourCharge) || 0;
  const t = Number(taxPercent) || 0;
  const d = Number(discount) || 0;
  const base = p + l;
  const withTax = base * (1 + t / 100);
  const final = withTax - d;
  return roundMoney(Math.max(0, final)); // Prevent negative totals
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Validates a payment amount against the invoice grand total.
 * Enforces non-negative and <= grandTotal constraints.
 */
export function validatePaymentAmount(amount: number, grandTotal: number): { isValid: boolean; error?: string } {
  const roundedAmount = roundMoney(amount);
  const roundedTotal = roundMoney(grandTotal);

  if (isNaN(roundedAmount) || roundedAmount < 0) {
    return { isValid: false, error: 'Payment amount cannot be negative.' };
  }
  if (roundedAmount > roundedTotal) {
    return {
      isValid: false,
      error: `Amount cannot exceed grand total of ₹${roundedTotal.toFixed(2)}`
    };
  }
  return { isValid: true };
}

/**
 * Validates the discount amount against pre-discount total (subtotal + tax).
 * Enforces non-negative and <= subtotalWithTax constraints.
 */
export function validateDiscount(discount: number, subtotalWithTax: number): { isValid: boolean; error?: string } {
  const d = Number(discount);
  const total = roundMoney(Number(subtotalWithTax) || 0);

  if (isNaN(d) || d < 0) {
    return { isValid: false, error: 'Discount cannot be negative.' };
  }
  if (roundMoney(d) > total) {
    return {
      isValid: false,
      error: `Discount cannot exceed total amount of ₹${total.toFixed(2)}`
    };
  }
  return { isValid: true };
}


/**
 * Derives the UI payment status label and badge type from amount_paid and grand_total.
 */
export function derivePaymentStatus(amountPaid: number, grandTotal: number): 'paid' | 'partial' | 'draft' {
  const paid = roundMoney(Number(amountPaid) || 0);
  const total = roundMoney(Number(grandTotal) || 0);

  if (total === 0) return 'paid';
  if (paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'draft';
}

export interface ItemizedBillLine {
  quantity: number;
  unit_price: number;
  tax_percent: number;
}

/**
 * Calculates pre-tax subtotal from per-line quantity and edited unit price.
 */
export function calculateItemizedSubtotal(items: { quantity: number; unit_price: number }[]): number {
  if (!items || items.length === 0) return 0;
  return roundMoney(items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0));
}

/**
 * Calculates total tax amount by summing each line's independent tax calculation:
 * sum(qty * price * (tax_percent / 100))
 */
export function calculateItemizedTaxAmount(items: ItemizedBillLine[]): number {
  if (!items || items.length === 0) return 0;
  return roundMoney(items.reduce((sum, item) => {
    const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const lineTax = lineSubtotal * ((Number(item.tax_percent) || 0) / 100);
    return sum + lineTax;
  }, 0));
}

/**
 * Calculates itemized grand total: Subtotal + sum of per-line taxes minus optional discount.
 */
export function calculateItemizedGrandTotal(items: ItemizedBillLine[], discount = 0): number {
  const subtotal = calculateItemizedSubtotal(items);
  const tax = calculateItemizedTaxAmount(items);
  const d = roundMoney(Number(discount) || 0);
  return roundMoney(Math.max(0, subtotal + tax - d));
}

export interface BillingTotalsParams {
  partsTotal?: number;
  labourCharge?: number;
  taxPercent?: number;
  discount?: number;
  items?: ItemizedBillLine[];
}

export interface BillingTotalsResult {
  subtotal: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
}

/**
 * Single source of truth for unified billing calculations across web admin and mobile app.
 */
export function calculateBillingTotals(params: BillingTotalsParams): BillingTotalsResult {
  const discount = roundMoney(Number(params.discount) || 0);

  if (params.items && params.items.length > 0) {
    const subtotal = calculateItemizedSubtotal(params.items);
    const taxAmount = calculateItemizedTaxAmount(params.items);
    const grandTotal = roundMoney(Math.max(0, subtotal + taxAmount - discount));
    return { subtotal, taxAmount, discount, grandTotal };
  }

  const parts = Number(params.partsTotal) || 0;
  const labour = Number(params.labourCharge) || 0;
  const tax = Number(params.taxPercent) || 0;
  const subtotal = roundMoney(parts + labour);
  const taxAmount = roundMoney(calculateTaxAmount(parts, labour, tax));
  const grandTotal = calculateGrandTotal(parts, labour, tax, discount);

  return { subtotal, taxAmount, discount, grandTotal };
}

export interface LineItem {
  id: string;
  qty: number;
  rate: number;
  taxPct: number;
}

export type BillingTaxRegime = 'intra' | 'inter' | 'intra_state' | 'inter_state' | 'legacy';

export interface CalculatedLine {
  subtotal: number;
  taxAmount: number;
  lineTotal: number;
}

export interface BillRecalcResult {
  items: (LineItem & CalculatedLine)[];
  billSubtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  billTax: number;
  grandTotal: number;
}

/**
 * 1.1 Forward calculation
 * Computes subtotal, taxAmount, and lineTotal from qty, rate, and taxPct.
 */
export function forwardCalcLine(item: LineItem): CalculatedLine {
  const qty = Math.max(0, Number(item.qty) || 0);
  const rate = Math.max(0, Number(item.rate) || 0);
  const taxPct = Math.max(0, Number(item.taxPct) || 0);

  const subtotal = roundMoney(qty * rate);
  const taxAmount = roundMoney(subtotal * (taxPct / 100));
  const lineTotal = roundMoney(subtotal + taxAmount);

  return { subtotal, taxAmount, lineTotal };
}

/**
 * 1.2 Reverse calculation — editing a single row's Line Total
 * Given a target newLineTotal with qty and taxPct held fixed:
 * Reverse-calculates pre-tax rate (rounded to 2 decimal places),
 * subtotal, and taxAmount.
 */
export function reverseCalcLineFromTotal(
  item: LineItem,
  newLineTotal: number
): LineItem & CalculatedLine {
  const qty = Math.max(0.0001, Number(item.qty) || 1);
  const taxPct = Math.max(0, Number(item.taxPct) || 0);
  const targetTotal = Math.max(0, roundMoney(Number(newLineTotal) || 0));

  // Reverse rate formula: rate = targetTotal / (qty * (1 + taxPct / 100))
  // Round rate to 2 decimal places before computing dependent figures
  const rawRate = targetTotal / (qty * (1 + taxPct / 100));
  const rate = roundMoney(Math.max(0, rawRate));

  const subtotal = roundMoney(rate * qty);
  const taxAmount = roundMoney(Math.max(0, targetTotal - subtotal));
  const lineTotal = roundMoney(subtotal + taxAmount);

  return {
    ...item,
    qty: Number(item.qty) || 1,
    rate,
    taxPct,
    subtotal,
    taxAmount,
    lineTotal,
  };
}

/**
 * Re-runs bill-level rollups from line items and tax regime.
 */
export function recalcBill(
  items: LineItem[],
  taxRegime: BillingTaxRegime = 'intra_state'
): BillRecalcResult {
  const computedItems = items.map((it) => {
    const calc = forwardCalcLine(it);
    return {
      ...it,
      ...calc,
    };
  });

  const billSubtotal = roundMoney(
    computedItems.reduce((acc, it) => acc + it.subtotal, 0)
  );
  const billTax = roundMoney(
    computedItems.reduce((acc, it) => acc + it.taxAmount, 0)
  );
  const grandTotal = roundMoney(billSubtotal + billTax);

  const isIntra = taxRegime === 'intra' || taxRegime === 'intra_state';
  const cgst = isIntra ? roundMoney(billTax / 2) : 0;
  const sgst = isIntra ? roundMoney(billTax - cgst) : 0;
  const igst = isIntra ? 0 : billTax;

  return {
    items: computedItems,
    billSubtotal,
    cgst,
    sgst,
    igst,
    billTax,
    grandTotal,
  };
}

/**
 * 1.3 Reverse calculation — editing the overall Grand Total
 * Uses proportional scaling across all line items, then applies §1.4 Silent Reconciliation
 * on the last line item's tax amount so billSubtotal + billTax === newGrandTotal exactly.
 */
export function reverseCalcBillFromGrandTotal(
  items: LineItem[],
  newGrandTotal: number,
  taxRegime: BillingTaxRegime = 'intra_state'
): BillRecalcResult {
  const targetGrandTotal = Math.max(0, roundMoney(Number(newGrandTotal) || 0));

  if (!items || items.length === 0) {
    return {
      items: [],
      billSubtotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      billTax: 0,
      grandTotal: 0,
    };
  }

  // Single item case: exactly collapses to reverseCalcLineFromTotal
  if (items.length === 1) {
    const single = reverseCalcLineFromTotal(items[0], targetGrandTotal);
    const billSubtotal = single.subtotal;
    const billTax = single.taxAmount;
    const grandTotal = single.lineTotal;

    const isIntra = taxRegime === 'intra' || taxRegime === 'intra_state';
    const cgst = isIntra ? roundMoney(billTax / 2) : 0;
    const sgst = isIntra ? roundMoney(billTax - cgst) : 0;
    const igst = isIntra ? 0 : billTax;

    return {
      items: [single],
      billSubtotal,
      cgst,
      sgst,
      igst,
      billTax,
      grandTotal,
    };
  }

  // Multi-item case: proportional scaling
  const currentBill = recalcBill(items, taxRegime);
  const oldGrandTotal = currentBill.grandTotal;

  let scaledItems: (LineItem & CalculatedLine)[];

  if (oldGrandTotal <= 0) {
    // Distribute equally across items if old total was 0
    const equalShare = targetGrandTotal / items.length;
    scaledItems = items.map((it) => reverseCalcLineFromTotal(it, equalShare));
  } else {
    const scaleFactor = targetGrandTotal / oldGrandTotal;
    scaledItems = items.map((it) => {
      const oldLineTotal = forwardCalcLine(it).lineTotal;
      const newLineTotal = oldLineTotal * scaleFactor;
      return reverseCalcLineFromTotal(it, newLineTotal);
    });
  }

  // §1.4 Silent reconciliation:
  // Re-sum post-rounding and adjust last line item's taxAmount by residual paise difference
  const prelimSubtotal = roundMoney(
    scaledItems.reduce((acc, it) => acc + it.subtotal, 0)
  );
  const prelimTax = roundMoney(
    scaledItems.reduce((acc, it) => acc + it.taxAmount, 0)
  );
  const prelimGrandTotal = roundMoney(prelimSubtotal + prelimTax);
  const diff = roundMoney(targetGrandTotal - prelimGrandTotal);

  if (diff !== 0 && scaledItems.length > 0) {
    const lastIdx = scaledItems.length - 1;
    const last = scaledItems[lastIdx];
    const adjustedTax = roundMoney(Math.max(0, last.taxAmount + diff));
    scaledItems[lastIdx] = {
      ...last,
      taxAmount: adjustedTax,
      lineTotal: roundMoney(last.subtotal + adjustedTax),
    };
  }

  const billSubtotal = roundMoney(
    scaledItems.reduce((acc, it) => acc + it.subtotal, 0)
  );
  const billTax = roundMoney(
    scaledItems.reduce((acc, it) => acc + it.taxAmount, 0)
  );
  const grandTotal = roundMoney(billSubtotal + billTax);

  const isIntra = taxRegime === 'intra' || taxRegime === 'intra_state';
  const cgst = isIntra ? roundMoney(billTax / 2) : 0;
  const sgst = isIntra ? roundMoney(billTax - cgst) : 0;
  const igst = isIntra ? 0 : billTax;

  return {
    items: scaledItems,
    billSubtotal,
    cgst,
    sgst,
    igst,
    billTax,
    grandTotal,
  };
}


/**
 * Converts a numeric amount to Indian English currency words.
 * Handles Indian numbering denominations: Crores, Lakhs, Thousands, Hundreds.
 * Example: 894 -> "Eight Hundred Ninety Four Rupees Only"
 * Example: 12500.50 -> "Twelve Thousand Five Hundred Rupees and Fifty Paise Only"
 */
export function amountToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Zero Rupees Only';
  const rounded = roundMoney(amount);
  if (rounded === 0) return 'Zero Rupees Only';
  if (rounded < 0) return 'Minus ' + amountToWordsIndian(Math.abs(rounded));

  const integerPart = Math.floor(rounded);
  const paisePart = Math.round((rounded - integerPart) * 100);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    const t = tens[Math.floor(num / 10)];
    const o = ones[num % 10];
    return o ? `${t} ${o}` : t;
  }

  function convertThreeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const rem = num % 100;
    const hStr = h > 0 ? `${ones[h]} Hundred` : '';
    const remStr = convertTwoDigits(rem);
    if (hStr && remStr) return `${hStr} ${remStr}`;
    return hStr || remStr;
  }

  let n = integerPart;
  const parts: string[] = [];

  const crores = Math.floor(n / 10000000);
  n %= 10000000;

  const lakhs = Math.floor(n / 100000);
  n %= 100000;

  const thousands = Math.floor(n / 1000);
  n %= 1000;

  const remainder = n;

  if (crores > 0) {
    parts.push(`${convertTwoDigits(crores)} Crore`);
  }
  if (lakhs > 0) {
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
  }
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  const rupeeString = parts.length > 0 ? parts.join(' ') + ' Rupees' : 'Zero Rupees';
  const paiseString = paisePart > 0 ? ` and ${convertTwoDigits(paisePart)} Paise` : '';

  return `${rupeeString}${paiseString} Only`;
}

/**
 * Formats an invoice code sequentially based on financial / calendar year:
 * e.g., seq=42, year=2026 -> "INV-2026-0042"
 */
export function formatInvoiceCode(seqVal: number, year: number = new Date().getFullYear()): string {
  const safeSeq = Math.max(1, Math.floor(Number(seqVal) || 1));
  const pad = String(safeSeq).padStart(4, '0');
  return `INV-${year}-${pad}`;
}

/**
 * Formats a date string/timestamp strictly in Indian Standard Time (Asia/Kolkata).
 * DD/MM/YYYY
 */
export function formatDateKolkata(dateInput: string | Date | number): string {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats serial numbers for invoice line items:
 * - Trims whitespace
 * - If missing or empty, returns "—"
 * - If multiple, preserves comma-separated list
 */
export function formatInvoiceSerial(serialNumber?: string | null): string {
  if (!serialNumber || !serialNumber.trim()) return '—';
  return serialNumber.trim();
}
