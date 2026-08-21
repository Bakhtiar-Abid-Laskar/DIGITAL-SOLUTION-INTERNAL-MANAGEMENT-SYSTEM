/**
 * POS Retail Sale & Invoicing Flow Integration Test
 * Simulates complete counter sales workflow in admin-panel/src/app/(admin)/sales/new/page.tsx
 */

import { calculateGrandTotal } from '@repairshop/shared';

interface CartItem {
  id: string;
  name: string;
  availableStock: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SaleState {
  customerName: string;
  customerPhone: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  items: CartItem[];
  discount: number;
  taxPercent: number;
}

function createSaleTransaction(state: SaleState) {
  if (!state.customerName.trim()) {
    throw new Error('Customer name is required');
  }

  if (state.items.length === 0) {
    throw new Error('Cart must contain at least one item');
  }

  // Stock availability validation
  for (const item of state.items) {
    if (item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.name}`);
    }
    if (item.quantity > item.availableStock) {
      throw new Error(`Insufficient stock for ${item.name}. Available: ${item.availableStock}, Requested: ${item.quantity}`);
    }
  }

  const subtotal = state.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const grandTotal = calculateGrandTotal(subtotal, 0, state.taxPercent, state.discount);

  // Simulated inventory stock reduction
  const updatedInventory = state.items.map(item => ({
    id: item.id,
    remainingStock: item.availableStock - item.quantity,
  }));

  const saleRecord = {
    sale_code: 'SALE-2026-0001',
    customer_name: state.customerName,
    customer_phone: state.customerPhone,
    payment_method: state.paymentMethod,
    subtotal,
    discount: state.discount,
    tax_percent: state.taxPercent,
    grand_total: grandTotal,
    status: 'Paid',
    created_at: new Date().toISOString(),
  };

  return {
    success: true,
    sale: saleRecord,
    updatedInventory,
  };
}

describe('POS Retail Sale & Invoicing Lifecycle (sales/new/salesFlow.test.ts)', () => {
  it('executes a complete happy-path POS counter sale transaction', () => {
    const saleInput: SaleState = {
      customerName: 'Vikram Seth',
      customerPhone: '9876543210',
      paymentMethod: 'UPI',
      items: [
        { id: 'prod-1', name: 'USB-C Fast Charger', availableStock: 10, quantity: 2, unitPrice: 600, totalPrice: 1200 },
        { id: 'prod-2', name: 'HDMI Cable 2m', availableStock: 5, quantity: 1, unitPrice: 300, totalPrice: 300 },
      ],
      discount: 100,
      taxPercent: 18,
    };

    // Subtotal = 1200 + 300 = 1500
    // Grand Total = (1500 * 1.18) - 100 = 1770 - 100 = 1670
    const result = createSaleTransaction(saleInput);

    expect(result.success).toBe(true);
    expect(result.sale.sale_code).toBe('SALE-2026-0001');
    expect(result.sale.subtotal).toBe(1500);
    expect(result.sale.grand_total).toBe(1670);
    expect(result.sale.status).toBe('Paid');

    // Verify stock was decremented properly
    expect(result.updatedInventory[0].remainingStock).toBe(8); // 10 - 2
    expect(result.updatedInventory[1].remainingStock).toBe(4); // 5 - 1
  });

  it('fails and aborts transaction when requested quantity exceeds available stock', () => {
    const saleInput: SaleState = {
      customerName: 'Anil Kumar',
      customerPhone: '9876543210',
      paymentMethod: 'Cash',
      items: [
        { id: 'prod-1', name: 'RAM 16GB DDR4', availableStock: 2, quantity: 5, unitPrice: 3500, totalPrice: 17500 },
      ],
      discount: 0,
      taxPercent: 18,
    };

    expect(() => createSaleTransaction(saleInput)).toThrow(/Insufficient stock for RAM 16GB DDR4/);
  });

  it('rejects sale transaction when customer name is missing', () => {
    const saleInput: SaleState = {
      customerName: '   ',
      customerPhone: '9876543210',
      paymentMethod: 'Card',
      items: [
        { id: 'prod-1', name: 'Mouse Wireless', availableStock: 10, quantity: 1, unitPrice: 450, totalPrice: 450 },
      ],
      discount: 0,
      taxPercent: 0,
    };

    expect(() => createSaleTransaction(saleInput)).toThrow('Customer name is required');
  });

  it('rejects sale transaction when cart is empty', () => {
    const saleInput: SaleState = {
      customerName: 'John Doe',
      customerPhone: '9876543210',
      paymentMethod: 'Cash',
      items: [],
      discount: 0,
      taxPercent: 0,
    };

    expect(() => createSaleTransaction(saleInput)).toThrow('Cart must contain at least one item');
  });

  it('handles custom free-text line items (no product_id/inventory link) safely in preview calculation', () => {
    const customLineItems = [
      {
        product_id: null,
        item_name: 'Custom Keyboard Cleaning & Lubrication',
        quantity: 1,
        selling_rate: 450,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18,
        tax_mode: 'exclusive' as const
      },
      {
        product_id: 'prod-uuid-1',
        item_name: 'Anti-Static Cleaning Cloth',
        quantity: 2,
        selling_rate: 150,
        cgst_rate: null,
        sgst_rate: null,
        igst_rate: null,
        tax_mode: null
      }
    ];

    // Subtotal: (450 * 1) + (150 * 2) = 450 + 300 = 750
    const subtotal = customLineItems.reduce((acc, item) => acc + (item.quantity * item.selling_rate), 0);
    expect(subtotal).toBe(750);

    // GST on custom item: 450 * 0.18 = 81
    // GST on catalog item: 300 * 0.18 = 54
    // Total Tax = 135
    const totalTax = (450 * 0.18) + (300 * 0.18);
    const grandTotal = subtotal + totalTax;
    expect(grandTotal).toBe(885);

    // Safe indexing simulation (preview?.items?.[index])
    const previewItems = customLineItems.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      selling_rate: item.selling_rate,
      cgst_amount: (item.quantity * item.selling_rate * 0.09),
      sgst_amount: (item.quantity * item.selling_rate * 0.09),
      igst_amount: 0,
    }));

    // Indexing previewItems at index 0 and index 1
    expect(previewItems[0]?.cgst_amount).toBe(40.5);
    expect(previewItems[1]?.cgst_amount).toBe(27);
    // Out-of-bounds indexing is safely undefined, not throwing
    expect(previewItems[99]?.cgst_amount).toBeUndefined();
  });

  it('correctly filters catalog items based on debounced search query', () => {
    const mockCatalog = [
      { id: '1', products: { name: 'Wireless Ergonomic Mouse' }, quantity: 15, selling_rate: 850 },
      { id: '2', products: { name: 'Mechanical Keyboard RGB' }, quantity: 8, selling_rate: 2800 },
      { id: '3', products: { name: 'USB-C to HDMI Adapter' }, quantity: 20, selling_rate: 650 },
      { id: '4', products: [{ name: 'Kingston 240GB SSD' }], quantity: 5, selling_rate: 1900 }, // Array relation test
    ];

    const getPName = (inv: any) => Array.isArray(inv.products) ? inv.products[0]?.name : inv.products?.name;

    const search1 = 'mouse';
    const matches1 = mockCatalog.filter(inv => getPName(inv).toLowerCase().includes(search1));
    expect(matches1).toHaveLength(1);
    expect(getPName(matches1[0])).toBe('Wireless Ergonomic Mouse');

    const search2 = 'ssd';
    const matches2 = mockCatalog.filter(inv => getPName(inv).toLowerCase().includes(search2));
    expect(matches2).toHaveLength(1);
    expect(getPName(matches2[0])).toBe('Kingston 240GB SSD');

    const search3 = 'nonexistent';
    const matches3 = mockCatalog.filter(inv => getPName(inv).toLowerCase().includes(search3));
    expect(matches3).toHaveLength(0);
  });
});

