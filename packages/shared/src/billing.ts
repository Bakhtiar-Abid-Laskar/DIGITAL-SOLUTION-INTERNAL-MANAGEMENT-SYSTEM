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

