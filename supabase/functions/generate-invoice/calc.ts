// calc.ts — Pure calculation engine. Tax mode: INCLUSIVE (confirmed by business).
// Rounding happens ONLY at render time, never here, to prevent compounding errors.

export type LineItem = {
  sn: number;
  description: string;
  hsn: string;
  price: number;   // per-unit price (inclusive of GST)
  unit: number;    // quantity
  total: number;   // = price * unit
};

export type InvoiceTotals = {
  gross: number;
  discount: number;
  afterDiscount: number;
  subtotal: number;   // base price, GST backed out
  tax: number;        // GST extracted from inclusive price
  taxRatePct: number;
  total: number;      // final payable = afterDiscount
};

export function calculateTotals(
  items: LineItem[],
  taxRatePct: number,
  discount: number
): InvoiceTotals {
  const gross = items.reduce((sum, i) => sum + i.price * i.unit, 0);
  const afterDiscount = gross - discount;
  // Inclusive mode: back-calculate base and extracted GST
  const subtotal = afterDiscount / (1 + taxRatePct / 100);
  const tax = afterDiscount - subtotal;
  return { gross, discount, afterDiscount, subtotal, tax, taxRatePct, total: afterDiscount };
}

export function fmt(n: number): string {
  return n.toFixed(2);
}
