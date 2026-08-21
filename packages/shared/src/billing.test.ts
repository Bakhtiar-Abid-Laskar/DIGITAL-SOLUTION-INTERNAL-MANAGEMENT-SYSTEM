import { calculateTaxAmount, calculatePartsTotal, calculateGrandTotal } from './billing';

describe('Billing Calculation Engine (@repairshop/shared/billing.ts)', () => {
  describe('calculateGrandTotal', () => {
    it('calculates the grand total correctly according to the standard project formula', () => {
      // Formula: (parts + labour) * (1 + tax / 100) - discount
      // parts = 500, labour = 300, tax = 18%, discount = 50 -> (800 * 1.18) - 50 = 944 - 50 = 894
      const result = calculateGrandTotal(500, 300, 18, 50);
      expect(result).toBe(894);
    });

    it('handles zero tax and zero discount correctly', () => {
      const result = calculateGrandTotal(450, 150, 0, 0);
      expect(result).toBe(600);
    });

    it('prevents negative totals when discount exceeds gross total', () => {
      const result = calculateGrandTotal(100, 50, 0, 500);
      expect(result).toBe(0);
    });

    it('handles zero labour charge (parts-only sale)', () => {
      // parts = 1000, labour = 0, tax = 18%, discount = 100 -> (1000 * 1.18) - 100 = 1080
      const result = calculateGrandTotal(1000, 0, 18, 100);
      expect(result).toBe(1080);
    });

    it('handles zero parts (labour-only repair)', () => {
      // parts = 0, labour = 400, tax = 18%, discount = 0 -> 400 * 1.18 = 472
      const result = calculateGrandTotal(0, 400, 18, 0);
      expect(result).toBe(472);
    });

    it('rounds money consistently to 2 decimal places', () => {
      // parts = 33.33, labour = 66.66, tax = 5%, discount = 0 -> 99.99 * 1.05 = 104.9895 -> 104.99
      const result = calculateGrandTotal(33.33, 66.66, 5, 0);
      expect(result).toBe(104.99);
    });

    it('handles string numeric inputs gracefully if passed by form inputs', () => {
      const result = calculateGrandTotal('500' as any, '300' as any, '18' as any, '50' as any);
      expect(result).toBe(894);
    });
  });

  describe('calculateTaxAmount', () => {
    it('calculates exact tax amount on taxable parts + labour subtotal', () => {
      // parts = 600, labour = 400 (subtotal = 1000), tax = 18% -> 180
      expect(calculateTaxAmount(600, 400, 18)).toBe(180);
    });

    it('returns 0 when tax rate is 0', () => {
      expect(calculateTaxAmount(300, 200, 0)).toBe(0);
    });
  });

  describe('calculatePartsTotal', () => {
    it('sums up all job material total costs', () => {
      const materials = [
        { total_cost: 250, quantity: 1, unit_cost: 250 },
        { total_cost: 450, quantity: 3, unit_cost: 150 },
        { total_cost: 100, quantity: 2, unit_cost: 50 },
      ];
      expect(calculatePartsTotal(materials as any)).toBe(800);
    });

    it('returns 0 for empty materials array', () => {
      expect(calculatePartsTotal([])).toBe(0);
    });
  });
});
