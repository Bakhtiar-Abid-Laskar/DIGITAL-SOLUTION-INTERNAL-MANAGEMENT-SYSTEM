import { calculateTaxAmount, calculatePartsTotal, calculateGrandTotal } from './billing';

describe('billing utils', () => {
  describe('calculateGrandTotal', () => {
    it('calculates the grand total correctly according to the formula', () => {
      // parts = 500, labour = 300, tax = 18%, discount = 50
      // expected = 894
      const result = calculateGrandTotal(500, 300, 18, 50);
      expect(result).toBe(894);
    });

    it('prevents negative totals', () => {
      const result = calculateGrandTotal(100, 50, 0, 200);
      expect(result).toBe(0);
    });
  });
});
