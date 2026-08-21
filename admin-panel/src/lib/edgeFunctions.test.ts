/**
 * Edge Functions Contract & Payload Validation Tests
 */

interface InvoiceItem {
  name: string;
  qty: number;
  rate: number;
}

interface InvoiceDoc {
  jobId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: InvoiceItem[];
  labourCharge: number;
  discount: number;
  taxPercent: number;
  paymentMode: string;
}

function validateInvoiceDoc(doc: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!doc || typeof doc !== 'object') {
    return { ok: false, errors: ['Invoice document must be an object'] };
  }

  const d = doc as Partial<InvoiceDoc>;
  if (!d.customerName || typeof d.customerName !== 'string' || d.customerName.trim() === '') {
    errors.push('customerName is required');
  }

  if (!Array.isArray(d.items) || d.items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    d.items.forEach((item, i) => {
      if (!item.name) errors.push(`items[${i}].name is required`);
      if (typeof item.qty !== 'number' || item.qty <= 0) errors.push(`items[${i}].qty must be > 0`);
      if (typeof item.rate !== 'number' || item.rate < 0) errors.push(`items[${i}].rate must be >= 0`);
    });
  }

  if (typeof d.labourCharge !== 'number' || d.labourCharge < 0) {
    errors.push('labourCharge must be a non-negative number');
  }

  if (typeof d.discount !== 'number' || d.discount < 0) {
    errors.push('discount must be a non-negative number');
  }

  if (typeof d.taxPercent !== 'number' || d.taxPercent < 0) {
    errors.push('taxPercent must be a non-negative number');
  }

  return { ok: errors.length === 0, errors };
}

describe('Edge Function Contracts & Input Validation (generate-invoice)', () => {
  it('validates a complete, well-formed InvoiceDoc payload', () => {
    const validDoc: InvoiceDoc = {
      jobId: 'job-123',
      customerName: 'Aman Verma',
      customerPhone: '9876543210',
      items: [
        { name: 'SSD 512GB', qty: 1, rate: 3200 },
        { name: 'SATA Cable', qty: 2, rate: 150 },
      ],
      labourCharge: 500,
      discount: 100,
      taxPercent: 18,
      paymentMode: 'UPI',
    };

    const result = validateInvoiceDoc(validDoc);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invoice payloads with missing customerName or empty items', () => {
    const invalidDoc = {
      customerName: '',
      items: [],
      labourCharge: 0,
      discount: 0,
      taxPercent: 0,
      paymentMode: 'Cash',
    };

    const result = validateInvoiceDoc(invalidDoc);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('customerName is required');
    expect(result.errors).toContain('items must be a non-empty array');
  });

  it('rejects invoice payloads with invalid item quantity or rate', () => {
    const invalidDoc = {
      customerName: 'Test Customer',
      items: [
        { name: 'Bad Item', qty: -1, rate: -500 },
      ],
      labourCharge: 0,
      discount: 0,
      taxPercent: 0,
      paymentMode: 'Cash',
    };

    const result = validateInvoiceDoc(invalidDoc);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('items[0].qty must be > 0');
    expect(result.errors).toContain('items[0].rate must be >= 0');
  });
});
