import {
  calculateGrandTotal,
  calculateBillingTotals,
  recalcBill,
  amountToWordsIndian,
  formatInvoiceCode,
  formatDateKolkata,
  formatInvoiceSerial,
} from '@repairshop/shared';

describe('Admin Panel — Billing & Tax Invoicing Parity Suite', () => {
  it('validates standard project billing formula (500 + 300 @ 18% - 50 = 894.00)', () => {
    const grandTotal = calculateGrandTotal(500, 300, 18, 50);
    expect(grandTotal).toBe(894);

    const totals = calculateBillingTotals({
      partsTotal: 500,
      labourCharge: 300,
      taxPercent: 18,
      discount: 50,
    });
    expect(totals.grandTotal).toBe(894);
  });

  it('validates intra-state CGST + SGST exact reconciliation', () => {
    const items = [
      { id: 'part-1', qty: 1, rate: 500, taxPct: 18 },
      { id: 'labour-1', qty: 1, rate: 300, taxPct: 18 },
    ];
    const bill = recalcBill(items, 'intra_state');
    expect(bill.cgst).toBe(72);
    expect(bill.sgst).toBe(72);
    expect(bill.igst).toBe(0);
    expect(bill.cgst + bill.sgst).toBe(bill.billTax);
  });

  it('validates inter-state IGST assignment', () => {
    const items = [
      { id: 'part-1', qty: 1, rate: 500, taxPct: 18 },
      { id: 'labour-1', qty: 1, rate: 300, taxPct: 18 },
    ];
    const bill = recalcBill(items, 'inter_state');
    expect(bill.cgst).toBe(0);
    expect(bill.sgst).toBe(0);
    expect(bill.igst).toBe(144);
  });

  it('validates Indian number to words conversion', () => {
    expect(amountToWordsIndian(894)).toBe('Eight Hundred Ninety Four Rupees Only');
    expect(amountToWordsIndian(12500.5)).toBe('Twelve Thousand Five Hundred Rupees and Fifty Paise Only');
  });

  it('validates invoice serial number formatting with legacy fallback', () => {
    expect(formatInvoiceSerial('  CAB-99281  ')).toBe('CAB-99281');
    expect(formatInvoiceSerial('')).toBe('—');
    expect(formatInvoiceSerial(null)).toBe('—');
  });

  it('validates Kolkata timezone date rendering', () => {
    expect(formatDateKolkata('2026-11-01T20:30:00Z')).toBe('02/11/2026');
  });
});
