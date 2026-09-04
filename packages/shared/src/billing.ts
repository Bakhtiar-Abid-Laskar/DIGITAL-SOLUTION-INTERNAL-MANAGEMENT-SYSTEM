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

