/**
 * Standard Indian Rupee symbol constant (Unicode \u20B9).
 */
export const RUPEE = '\u20B9';

/**
 * Format a number as Indian Rupee currency.
 * Always rounds to 2 decimal places using Indian numbering system.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return `${RUPEE}0.00`;
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${RUPEE}0.00`;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
