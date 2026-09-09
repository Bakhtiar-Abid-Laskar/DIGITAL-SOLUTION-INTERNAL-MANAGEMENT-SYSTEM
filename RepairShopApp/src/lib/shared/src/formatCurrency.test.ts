import { formatCurrency } from './formatCurrency';

describe('Currency Formatting Engine (@repairshop/shared/formatCurrency.ts)', () => {
  it('formats positive amounts with INR currency symbol and two decimals', () => {
    const formatted = formatCurrency(1500);
    expect(formatted).toContain('1,500.00');
    expect(formatted).toContain('₹');
  });

  it('formats zero as ₹0.00', () => {
    expect(formatCurrency(0)).toContain('0.00');
  });

  it('formats string numeric inputs correctly', () => {
    const formatted = formatCurrency('894.50');
    expect(formatted).toContain('894.50');
  });

  it('handles null, undefined, or empty values with ₹0.00 fallback', () => {
    expect(formatCurrency(null)).toContain('0.00');
    expect(formatCurrency(undefined)).toContain('0.00');
  });

  it('handles NaN string values safely', () => {
    expect(formatCurrency('not-a-number')).toContain('0.00');
  });
});
