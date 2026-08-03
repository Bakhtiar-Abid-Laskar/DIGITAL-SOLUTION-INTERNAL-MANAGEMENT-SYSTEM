// schema.ts — Runtime validation for InvoiceDoc payloads.
// Rejects malformed data before it reaches the template renderer.

export type DocType = 'sale' | 'final' | 'receipt';

export type LineItem = {
  sn: number;
  description: string;
  hsn: string;
  price: number;
  unit: number;
};

export type InvoiceDoc = {
  docType: DocType;
  invoiceNo?: string;
  jobId?: string;
  date: string;
  customer: {
    name: string;
    gst?: string;
    phone: string;
    address: string;
  };
  items: LineItem[];
  taxRatePct?: number;   // default 18
  discount?: number;      // default 0
};

export type ValidationResult =
  | { ok: true; value: InvoiceDoc & { taxRatePct: number; discount: number } }
  | { ok: false; errors: string[] };

export function validateInvoiceDoc(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }

  const d = raw as Record<string, unknown>;

  // docType
  if (!['sale', 'final', 'receipt'].includes(d.docType as string)) {
    errors.push('docType must be one of: sale, final, receipt');
  }

  // date
  if (typeof d.date !== 'string' || !d.date.trim()) {
    errors.push('date is required (ISO string)');
  }

  // customer
  const cust = d.customer as Record<string, unknown> | undefined;
  if (!cust || typeof cust !== 'object') {
    errors.push('customer object is required');
  } else {
    if (typeof cust.name !== 'string' || !cust.name.trim()) errors.push('customer.name is required');
    if (typeof cust.phone !== 'string' || !cust.phone.trim()) errors.push('customer.phone is required');
    if (typeof cust.address !== 'string' || !cust.address.trim()) errors.push('customer.address is required');
  }

  // items
  if (!Array.isArray(d.items) || d.items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    (d.items as unknown[]).forEach((item, idx) => {
      const it = item as Record<string, unknown>;
      if (typeof it.description !== 'string' || !it.description.trim()) {
        errors.push(`items[${idx}].description is required`);
      }
      if (typeof it.price !== 'number' || it.price < 0) {
        errors.push(`items[${idx}].price must be a non-negative number`);
      }
      if (typeof it.unit !== 'number' || it.unit <= 0) {
        errors.push(`items[${idx}].unit must be a positive number`);
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  // Normalize with defaults
  const items = (d.items as Record<string, unknown>[]).map((it, idx) => ({
    sn: idx + 1,
    description: String(it.description),
    hsn: String(it.hsn ?? ''),
    price: Number(it.price),
    unit: Number(it.unit),
  }));

  return {
    ok: true,
    value: {
      docType: d.docType as DocType,
      invoiceNo: typeof d.invoiceNo === 'string' ? d.invoiceNo : undefined,
      jobId: typeof d.jobId === 'string' ? d.jobId : undefined,
      date: String(d.date),
      customer: {
        name: String((d.customer as Record<string, unknown>).name),
        gst: typeof (d.customer as Record<string, unknown>).gst === 'string'
          ? String((d.customer as Record<string, unknown>).gst)
          : undefined,
        phone: String((d.customer as Record<string, unknown>).phone),
        address: String((d.customer as Record<string, unknown>).address),
      },
      items,
      taxRatePct: typeof d.taxRatePct === 'number' ? d.taxRatePct : 18,
      discount: typeof d.discount === 'number' ? d.discount : 0,
    },
  };
}
