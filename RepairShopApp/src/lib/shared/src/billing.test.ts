import { 
  calculateTaxAmount, 
  calculatePartsTotal, 
  calculateGrandTotal,
  validatePaymentAmount,
  derivePaymentStatus,
  calculateItemizedSubtotal,
  calculateItemizedTaxAmount,
  calculateItemizedGrandTotal,
  calculateBillingTotals,
  roundMoney,
  forwardCalcLine,
  reverseCalcLineFromTotal,
  recalcBill,
  reverseCalcBillFromGrandTotal,
} from './billing';

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

  describe('validatePaymentAmount', () => {
    it('accepts exact full payment', () => {
      const res = validatePaymentAmount(894, 894);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('accepts partial payment less than grand total', () => {
      const res = validatePaymentAmount(500, 894);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('accepts zero payment', () => {
      const res = validatePaymentAmount(0, 894);
      expect(res.isValid).toBe(true);
    });

    it('rejects payment amount exceeding grand total', () => {
      const res = validatePaymentAmount(900, 894);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('cannot exceed');
    });

    it('rejects negative payment amount', () => {
      const res = validatePaymentAmount(-50, 894);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('cannot be negative');
    });
  });

  describe('derivePaymentStatus', () => {
    it('returns paid when fully paid', () => {
      expect(derivePaymentStatus(1000, 1000)).toBe('paid');
    });

    it('returns paid when overpaid', () => {
      expect(derivePaymentStatus(1200, 1000)).toBe('paid');
    });

    it('returns partial when partially paid', () => {
      expect(derivePaymentStatus(500, 1000)).toBe('partial');
    });

    it('returns draft when unpaid', () => {
      expect(derivePaymentStatus(0, 1000)).toBe('draft');
    });

    it('handles zero total edge case', () => {
      expect(derivePaymentStatus(0, 0)).toBe('paid');
    });
  });

  describe('Itemized Bill Calculations (Per-Line Tax)', () => {
    const sampleItems = [
      { quantity: 2, unit_price: 500, tax_percent: 18 },  // sub: 1000, tax: 180
      { quantity: 1, unit_price: 300, tax_percent: 12 },  // sub: 300, tax: 36
      { quantity: 1, unit_price: 200, tax_percent: 0 },   // sub: 200, tax: 0
    ];

    it('calculates true pre-tax subtotal from per-line prices', () => {
      expect(calculateItemizedSubtotal(sampleItems)).toBe(1500);
    });

    it('calculates true sum of per-line independent tax amounts', () => {
      // Line 1: 1000 * 18% = 180
      // Line 2: 300 * 12% = 36
      // Line 3: 200 * 0% = 0
      // Total tax = 216
      expect(calculateItemizedTaxAmount(sampleItems)).toBe(216);
    });

    it('calculates grand total without adjustments or discount', () => {
      // 1500 + 216 = 1716
      expect(calculateItemizedGrandTotal(sampleItems)).toBe(1716);
    });

    it('handles empty items array gracefully', () => {
      expect(calculateItemizedSubtotal([])).toBe(0);
      expect(calculateItemizedTaxAmount([])).toBe(0);
      expect(calculateItemizedGrandTotal([])).toBe(0);
    });

    it('calculates grand total with discount applied', () => {
      // 1500 + 216 = 1716 - 216 discount = 1500
      expect(calculateItemizedGrandTotal(sampleItems, 216)).toBe(1500);
    });
  });

  describe('Unified calculateBillingTotals (Web & Mobile Parity Tests)', () => {
    // Case 1: Zero discount
    it('Case 1: correctly calculates totals with zero discount', () => {
      const res = calculateBillingTotals({
        partsTotal: 500,
        labourCharge: 300,
        taxPercent: 18,
        discount: 0,
      });
      expect(res.subtotal).toBe(800);
      expect(res.taxAmount).toBe(144);
      expect(res.discount).toBe(0);
      expect(res.grandTotal).toBe(944);
    });

    // Case 2: Standard project verification from GEMINI.md
    it('Case 2: exactly matches GEMINI.md verification example (500 + 300 @ 18% - 50 = 894)', () => {
      const res = calculateBillingTotals({
        partsTotal: 500,
        labourCharge: 300,
        taxPercent: 18,
        discount: 50,
      });
      expect(res.subtotal).toBe(800);
      expect(res.taxAmount).toBe(144);
      expect(res.discount).toBe(50);
      expect(res.grandTotal).toBe(894);
    });

    // Case 3: Max discount clamp (prevents negative totals)
    it('Case 3: clamps grand total to 0 when discount exceeds gross total', () => {
      const res = calculateBillingTotals({
        partsTotal: 200,
        labourCharge: 100,
        taxPercent: 18,
        discount: 1000,
      });
      expect(res.subtotal).toBe(300);
      expect(res.taxAmount).toBe(54);
      expect(res.discount).toBe(1000);
      expect(res.grandTotal).toBe(0);
    });

    // Case 4: Itemized bill with mixed tax rates and discount
    it('Case 4: computes itemized bill with per-line taxes and discount', () => {
      const res = calculateBillingTotals({
        items: [
          { quantity: 1, unit_price: 1000, tax_percent: 18 }, // sub 1000, tax 180
          { quantity: 2, unit_price: 250, tax_percent: 12 },  // sub 500, tax 60
        ],
        discount: 140,
      });
      expect(res.subtotal).toBe(1500);
      expect(res.taxAmount).toBe(240);
      expect(res.discount).toBe(140);
      expect(res.grandTotal).toBe(1600); // 1500 + 240 - 140 = 1600
    });

    // Case 5: Rounding edge cases (fractional decimals)
    it('Case 5: rounds money consistently to two decimal places on odd fractions', () => {
      const res = calculateBillingTotals({
        partsTotal: 33.33,
        labourCharge: 66.66,
        taxPercent: 5,
        discount: 0.05,
      });
      // 99.99 * 1.05 = 104.9895 - 0.05 = 104.9395 -> 104.94
      expect(res.subtotal).toBe(99.99);
      expect(res.taxAmount).toBe(5.00);
      expect(res.grandTotal).toBe(104.94);
    });
  });

  describe('Bidirectional Calculations (Line Total ↔ Rate ↔ Grand Total)', () => {
    describe('forwardCalcLine', () => {
      it('calculates subtotal, taxAmount, and lineTotal for standard line', () => {
        // qty: 2, rate: 500, taxPct: 18 -> subtotal: 1000, tax: 180, lineTotal: 1180
        const res = forwardCalcLine({ id: '1', qty: 2, rate: 500, taxPct: 18 });
        expect(res.subtotal).toBe(1000);
        expect(res.taxAmount).toBe(180);
        expect(res.lineTotal).toBe(1180);
      });

      it('handles zero tax rate correctly', () => {
        const res = forwardCalcLine({ id: '2', qty: 3, rate: 250, taxPct: 0 });
        expect(res.subtotal).toBe(750);
        expect(res.taxAmount).toBe(0);
        expect(res.lineTotal).toBe(750);
      });

      it('handles fractional quantity correctly (e.g. 1.5 hrs labor)', () => {
        const res = forwardCalcLine({ id: '3', qty: 1.5, rate: 400, taxPct: 18 });
        expect(res.subtotal).toBe(600);
        expect(res.taxAmount).toBe(108);
        expect(res.lineTotal).toBe(708);
      });
    });

    describe('reverseCalcLineFromTotal', () => {
      it('reverses selling price and tax amount accurately from line total', () => {
        // qty: 1, taxPct: 18%, target lineTotal: 118
        // expected: rate = 118 / 1.18 = 100, subtotal: 100, tax: 18, lineTotal: 118
        const res = reverseCalcLineFromTotal({ id: '1', qty: 1, rate: 0, taxPct: 18 }, 118);
        expect(res.rate).toBe(100);
        expect(res.subtotal).toBe(100);
        expect(res.taxAmount).toBe(18);
        expect(res.lineTotal).toBe(118);
      });

      it('rounds rate to 2 decimal places and ensures subtotal + taxAmount === lineTotal', () => {
        // qty: 1, taxPct: 18%, target lineTotal: 150
        // rate = 150 / 1.18 = 127.1186 -> rounded 127.12
        // subtotal = 127.12, taxAmount = 150 - 127.12 = 22.88, lineTotal = 150
        const res = reverseCalcLineFromTotal({ id: '1', qty: 1, rate: 0, taxPct: 18 }, 150);
        expect(res.rate).toBe(127.12);
        expect(res.subtotal).toBe(127.12);
        expect(res.taxAmount).toBe(22.88);
        expect(res.lineTotal).toBe(150);
        expect(res.subtotal + res.taxAmount).toBe(150);
      });

      it('works for zero tax items (rate = lineTotal / qty)', () => {
        const res = reverseCalcLineFromTotal({ id: '2', qty: 2, rate: 0, taxPct: 0 }, 500);
        expect(res.rate).toBe(250);
        expect(res.subtotal).toBe(500);
        expect(res.taxAmount).toBe(0);
        expect(res.lineTotal).toBe(500);
      });

      it('works for decimal quantities (e.g. 1.5 qty with 18% tax)', () => {
        // lineTotal: 354, qty: 1.5, taxPct: 18
        // rate = 354 / (1.5 * 1.18) = 354 / 1.77 = 200
        const res = reverseCalcLineFromTotal({ id: '3', qty: 1.5, rate: 0, taxPct: 18 }, 354);
        expect(res.rate).toBe(200);
        expect(res.subtotal).toBe(300);
        expect(res.taxAmount).toBe(54);
        expect(res.lineTotal).toBe(354);
      });

      it('clamps negative or invalid target line totals to 0', () => {
        const res = reverseCalcLineFromTotal({ id: '4', qty: 1, rate: 100, taxPct: 18 }, -50);
        expect(res.rate).toBe(0);
        expect(res.subtotal).toBe(0);
        expect(res.taxAmount).toBe(0);
        expect(res.lineTotal).toBe(0);
      });
    });

    describe('recalcBill', () => {
      const items = [
        { id: '1', qty: 1, rate: 1000, taxPct: 18 }, // sub: 1000, tax: 180, total: 1180
        { id: '2', qty: 2, rate: 200, taxPct: 12 },  // sub: 400, tax: 48, total: 448
      ];

      it('splits tax into CGST and SGST for intra_state regime', () => {
        const bill = recalcBill(items, 'intra_state');
        expect(bill.billSubtotal).toBe(1400);
        expect(bill.billTax).toBe(228);
        expect(bill.cgst).toBe(114);
        expect(bill.sgst).toBe(114);
        expect(bill.igst).toBe(0);
        expect(bill.grandTotal).toBe(1628);
      });

      it('places all tax into IGST for inter_state regime', () => {
        const bill = recalcBill(items, 'inter_state');
        expect(bill.billSubtotal).toBe(1400);
        expect(bill.billTax).toBe(228);
        expect(bill.cgst).toBe(0);
        expect(bill.sgst).toBe(0);
        expect(bill.igst).toBe(228);
        expect(bill.grandTotal).toBe(1628);
      });

      it('handles odd tax amounts cleanly without losing a paisa (e.g. ₹0.05 split)', () => {
        const oddItem = [{ id: '1', qty: 1, rate: 0.28, taxPct: 18 }]; // sub: 0.28, tax: 0.05, total: 0.33
        const bill = recalcBill(oddItem, 'intra_state');
        expect(bill.billTax).toBe(0.05);
        expect(bill.cgst + bill.sgst).toBe(0.05);
      });
    });

    describe('reverseCalcBillFromGrandTotal', () => {
      it('returns empty result when there are 0 line items', () => {
        const res = reverseCalcBillFromGrandTotal([], 500);
        expect(res.items.length).toBe(0);
        expect(res.grandTotal).toBe(0);
      });

      it('produces identical result as reverseCalcLineFromTotal when there is 1 line item', () => {
        const items = [{ id: '1', qty: 1, rate: 100, taxPct: 18 }];
        const fromGrand = reverseCalcBillFromGrandTotal(items, 150);
        const fromLine = reverseCalcLineFromTotal(items[0], 150);

        expect(fromGrand.grandTotal).toBe(150);
        expect(fromGrand.items[0].rate).toBe(fromLine.rate);
        expect(fromGrand.items[0].subtotal).toBe(fromLine.subtotal);
        expect(fromGrand.items[0].taxAmount).toBe(fromLine.taxAmount);
        expect(fromGrand.items[0].lineTotal).toBe(fromLine.lineTotal);
      });

      it('proportionally scales multi-item bills and reconciles exact grandTotal with silent reconciliation', () => {
        const items = [
          { id: '1', qty: 1, rate: 500, taxPct: 18 }, // old lineTotal: 590
          { id: '2', qty: 2, rate: 200, taxPct: 12 }, // old lineTotal: 448
        ];
        // old grandTotal = 1038
        // new target grandTotal = 1500
        const res = reverseCalcBillFromGrandTotal(items, 1500, 'intra_state');
        expect(res.grandTotal).toBe(1500);
        expect(res.billSubtotal + res.billTax).toBe(1500);
        expect(res.cgst + res.sgst).toBe(res.billTax);

        // Verify that rates scaled up proportionally
        expect(res.items[0].rate).toBeGreaterThan(500);
        expect(res.items[1].rate).toBeGreaterThan(200);

        // Verify each line item has subtotal + taxAmount === lineTotal
        res.items.forEach((it) => {
          expect(roundMoney(it.subtotal + it.taxAmount)).toBe(it.lineTotal);
        });
      });

      it('preserves each item individual tax percentage when scaling across multiple rates', () => {
        const items = [
          { id: '1', qty: 1, rate: 100, taxPct: 18 },
          { id: '2', qty: 1, rate: 100, taxPct: 12 },
          { id: '3', qty: 1, rate: 100, taxPct: 5 },
          { id: '4', qty: 1, rate: 100, taxPct: 0 },
        ];
        const res = reverseCalcBillFromGrandTotal(items, 800, 'inter_state');
        expect(res.grandTotal).toBe(800);
        expect(res.igst).toBe(res.billTax);

        expect(res.items[0].taxPct).toBe(18);
        expect(res.items[1].taxPct).toBe(12);
        expect(res.items[2].taxPct).toBe(5);
        expect(res.items[3].taxPct).toBe(0);
        expect(res.items[3].taxAmount).toBe(0); // 0 tax stays 0 tax
      });

      it('handles starting from an empty/zero bill when grand total is entered', () => {
        const items = [
          { id: '1', qty: 1, rate: 0, taxPct: 18 },
          { id: '2', qty: 1, rate: 0, taxPct: 18 },
        ];
        const res = reverseCalcBillFromGrandTotal(items, 500, 'intra_state');
        expect(res.grandTotal).toBe(500);
        expect(res.items[0].lineTotal + res.items[1].lineTotal).toBe(500);
      });

      it('handles odd division with zero paise discrepancy through silent reconciliation', () => {
        // ₹1000 across 3 items
        const items = [
          { id: '1', qty: 1, rate: 100, taxPct: 18 },
          { id: '2', qty: 1, rate: 100, taxPct: 18 },
          { id: '3', qty: 1, rate: 100, taxPct: 18 },
        ];
        const res = reverseCalcBillFromGrandTotal(items, 1000, 'intra_state');
        expect(res.grandTotal).toBe(1000);
        expect(res.billSubtotal + res.billTax).toBe(1000);
      });
    });
  });
});


