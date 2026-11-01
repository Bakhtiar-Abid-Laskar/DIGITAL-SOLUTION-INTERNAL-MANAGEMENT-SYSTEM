import { 
  calculateTaxAmount, 
  calculatePartsTotal, 
  calculateGrandTotal,
  validatePaymentAmount,
  validateDiscount,
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
  amountToWordsIndian,
  formatInvoiceCode,
  formatDateKolkata,
  formatInvoiceSerial,
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

  describe('validateDiscount (BIL-001)', () => {
    it('accepts zero discount', () => {
      const res = validateDiscount(0, 1000);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('accepts valid partial discount', () => {
      const res = validateDiscount(250, 1000);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('accepts discount equal to gross total (100% discount, grand total 0 allowed)', () => {
      const res = validateDiscount(1000, 1000);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects discount exceeding gross total (prevents negative invoice totals)', () => {
      const res = validateDiscount(1050, 1000);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('cannot exceed');
    });

    it('rejects negative discount amounts', () => {
      const res = validateDiscount(-50, 1000);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('cannot be negative');
    });

    it('handles floating point decimals cleanly with roundMoney', () => {
      const res = validateDiscount(99.99, 100);
      expect(res.isValid).toBe(true);

      const resExceed = validateDiscount(100.01, 100);
      expect(resExceed.isValid).toBe(false);
    });
  });

  describe('Phase 4 — Bill & Tax Invoice Generation Audit Suite', () => {
    it('verifies standard project billing formula (500 + 300 @ 18% - 50 = 894.00)', () => {
      // (parts 500 + labour 300) = 800
      // 800 * 1.18 = 944
      // 944 - 50 discount = 894
      const grandTotal = calculateGrandTotal(500, 300, 18, 50);
      expect(grandTotal).toBe(894);

      const totals = calculateBillingTotals({
        partsTotal: 500,
        labourCharge: 300,
        taxPercent: 18,
        discount: 50,
      });
      expect(totals.subtotal).toBe(800);
      expect(totals.taxAmount).toBe(144);
      expect(totals.discount).toBe(50);
      expect(totals.grandTotal).toBe(894);
    });

    it('verifies intra-state GST split into exact CGST and SGST down to the paisa', () => {
      const items = [
        { id: 'item-1', qty: 1, rate: 500, taxPct: 18 },
        { id: 'labour-1', qty: 1, rate: 300, taxPct: 18 },
      ];
      const result = recalcBill(items, 'intra_state');
      expect(result.billSubtotal).toBe(800);
      expect(result.billTax).toBe(144);
      expect(result.cgst).toBe(72);
      expect(result.sgst).toBe(72);
      expect(result.igst).toBe(0);
      expect(result.cgst + result.sgst).toBe(result.billTax);
      expect(result.grandTotal).toBe(944);
    });

    it('verifies odd-tax intra-state GST split preserves exact penny reconciliation', () => {
      // Rate 87.50 @ 18% = 15.75 tax -> CGST 7.88, SGST 7.87 -> total 15.75
      const items = [
        { id: 'odd-1', qty: 1, rate: 87.5, taxPct: 18 },
      ];
      const result = recalcBill(items, 'intra_state');
      expect(result.billTax).toBe(15.75);
      expect(result.cgst).toBe(7.88);
      expect(result.sgst).toBe(7.87);
      expect(result.cgst + result.sgst).toBe(15.75);
    });

    it('verifies inter-state GST assigns 100% tax to IGST with zero CGST/SGST', () => {
      const items = [
        { id: 'item-1', qty: 1, rate: 500, taxPct: 18 },
        { id: 'labour-1', qty: 1, rate: 300, taxPct: 18 },
      ];
      const result = recalcBill(items, 'inter_state');
      expect(result.billSubtotal).toBe(800);
      expect(result.billTax).toBe(144);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(144);
      expect(result.grandTotal).toBe(944);
    });

    it('converts amounts to Indian English currency words correctly', () => {
      expect(amountToWordsIndian(894)).toBe('Eight Hundred Ninety Four Rupees Only');
      expect(amountToWordsIndian(12500.5)).toBe('Twelve Thousand Five Hundred Rupees and Fifty Paise Only');
      expect(amountToWordsIndian(100000)).toBe('One Lakh Rupees Only');
      expect(amountToWordsIndian(10000000)).toBe('One Crore Rupees Only');
      expect(amountToWordsIndian(0)).toBe('Zero Rupees Only');
      expect(amountToWordsIndian(500)).toBe('Five Hundred Rupees Only');
    });

    it('formats sequential, gap-free invoice codes', () => {
      expect(formatInvoiceCode(1, 2026)).toBe('INV-2026-0001');
      expect(formatInvoiceCode(42, 2026)).toBe('INV-2026-0042');
      expect(formatInvoiceCode(1234, 2026)).toBe('INV-2026-1234');
    });

    it('formats dates strictly in Asia/Kolkata timezone regardless of host timezone', () => {
      // 2026-11-01 20:30:00 UTC is 2026-11-02 02:00:00 in Asia/Kolkata
      const formatted = formatDateKolkata('2026-11-01T20:30:00Z');
      expect(formatted).toBe('02/11/2026');
    });

    it('formats invoice item serial numbers and handles legacy null/empty values', () => {
      expect(formatInvoiceSerial('  CAB-99281  ')).toBe('CAB-99281');
      expect(formatInvoiceSerial('')).toBe('—');
      expect(formatInvoiceSerial(null)).toBe('—');
      expect(formatInvoiceSerial(undefined)).toBe('—');
      expect(formatInvoiceSerial('SN-1, SN-2')).toBe('SN-1, SN-2');
    });
  });

});



