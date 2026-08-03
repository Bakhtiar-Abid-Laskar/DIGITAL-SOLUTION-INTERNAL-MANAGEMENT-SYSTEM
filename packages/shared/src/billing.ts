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
  return (partsTotal + labourCharge) * (taxPercent / 100);
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
  const base = partsTotal + labourCharge;
  const withTax = base * (1 + taxPercent / 100);
  const final = withTax - discount;
  return roundMoney(Math.max(0, final)); // Prevent negative totals
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
