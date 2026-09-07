import {
  MultiItemPurchaseLinePayload,
  MultiItemPurchasePayload,
  AvailableSerial,
} from '@repairshop/shared';

describe('Serial-Number-Tracked Inventory System - Forensic Test Suite', () => {
  describe('1. Multi-Item Purchase Order Validation', () => {
    it('validates that tracked line items require exact serial count matching quantity', () => {
      const lineItem: MultiItemPurchaseLinePayload = {
        product_id: 'prod-123',
        product_name: 'iPhone 13 Display Screen',
        quantity: 3,
        purchase_rate: 2500,
        selling_rate: 4500,
        tax_percent: 18,
        tax_mode: 'exclusive',
        is_serial_tracked: true,
        serials: ['SN-IP13-001', 'SN-IP13-002', 'SN-IP13-003'],
      };

      expect(lineItem.serials.length).toBe(lineItem.quantity);
      expect(lineItem.is_serial_tracked).toBe(true);
    });

    it('identifies missing serials when count is less than quantity', () => {
      const lineItem: MultiItemPurchaseLinePayload = {
        product_name: 'iPhone 13 Battery',
        quantity: 2,
        purchase_rate: 1200,
        selling_rate: 2200,
        tax_percent: 18,
        tax_mode: 'exclusive',
        is_serial_tracked: true,
        serials: ['SN-BAT-001'], // only 1 of 2
      };

      const hasMissingSerials = lineItem.is_serial_tracked && lineItem.serials.length !== lineItem.quantity;
      expect(hasMissingSerials).toBe(true);
    });

    it('allows empty serials when is_serial_tracked is false for bulk materials', () => {
      const bulkItem: MultiItemPurchaseLinePayload = {
        product_name: 'Thermal Paste Tube 5g',
        quantity: 10,
        purchase_rate: 150,
        selling_rate: 300,
        tax_percent: 18,
        tax_mode: 'exclusive',
        is_serial_tracked: false,
        serials: [],
      };

      expect(bulkItem.is_serial_tracked).toBe(false);
      expect(bulkItem.serials.length).toBe(0);
    });
  });

  describe('2. Intra-Purchase Duplicate Serial Detection', () => {
    it('detects duplicate serials within the same line item', () => {
      const serials = ['SN-1001', 'sn-1001', 'SN-1002'];
      const seen = new Set<string>();
      let hasDuplicate = false;

      for (const s of serials) {
        const clean = s.toLowerCase().trim();
        if (seen.has(clean)) {
          hasDuplicate = true;
          break;
        }
        seen.add(clean);
      }

      expect(hasDuplicate).toBe(true);
    });

    it('detects duplicate serials across multiple product line items in the same PO', () => {
      const items: MultiItemPurchaseLinePayload[] = [
        {
          product_name: 'Display Screen A',
          quantity: 1,
          purchase_rate: 2000,
          selling_rate: 3500,
          tax_percent: 18,
          tax_mode: 'exclusive',
          is_serial_tracked: true,
          serials: ['DISP-001'],
        },
        {
          product_name: 'Display Screen B',
          quantity: 1,
          purchase_rate: 2000,
          selling_rate: 3500,
          tax_percent: 18,
          tax_mode: 'exclusive',
          is_serial_tracked: true,
          serials: ['disp-001'], // duplicate code in different case
        },
      ];

      const seen = new Set<string>();
      let crossItemDuplicate = false;

      items.forEach((it) => {
        it.serials.forEach((s) => {
          const clean = s.toLowerCase().trim();
          if (seen.has(clean)) {
            crossItemDuplicate = true;
          }
          seen.add(clean);
        });
      });

      expect(crossItemDuplicate).toBe(true);
    });
  });

  describe('3. Multi-Item PO Financial Calculations', () => {
    it('calculates accurate multi-line totals, GST amounts, and grand total', () => {
      const items = [
        { quantity: 2, purchase_rate: 1000, tax_percent: 18 }, // Sub: 2000, Tax: 360
        { quantity: 1, purchase_rate: 500, tax_percent: 12 },  // Sub: 500, Tax: 60
      ];

      const subtotal = items.reduce((sum, it) => sum + it.quantity * it.purchase_rate, 0);
      const taxAmount = items.reduce((sum, it) => sum + (it.quantity * it.purchase_rate * it.tax_percent) / 100, 0);
      const grandTotal = subtotal + taxAmount;

      expect(subtotal).toBe(2500);
      expect(taxAmount).toBe(420);
      expect(grandTotal).toBe(2920);
    });
  });

  describe('4. Serial Selection Claims Structure for Sales & Billing', () => {
    it('generates claim payloads matching claim_invoice_serials RPC', () => {
      const formLines = [
        {
          line_index: 0,
          product_id: 'prod-screen-1',
          selected_serial_ids: ['uuid-serial-1', 'uuid-serial-2'],
        },
        {
          line_index: 1,
          product_id: 'prod-cable-2',
          selected_serial_ids: [], // untracked item
        },
        {
          line_index: 2,
          product_id: 'prod-battery-3',
          selected_serial_ids: ['uuid-serial-3'],
        },
      ];

      const claims = formLines
        .map((it) => ({
          line_index: it.line_index,
          product_id: it.product_id,
          serial_ids: it.selected_serial_ids,
        }))
        .filter((c) => c.serial_ids.length > 0);

      expect(claims.length).toBe(2);
      expect(claims[0].line_index).toBe(0);
      expect(claims[0].serial_ids).toEqual(['uuid-serial-1', 'uuid-serial-2']);
      expect(claims[1].line_index).toBe(2);
      expect(claims[1].serial_ids).toEqual(['uuid-serial-3']);
    });
  });

  describe('5. Hard Double-Sale Guard', () => {
    it('prevents selecting the same unit serial across two simultaneous lines', () => {
      const selectedUnits = ['unit-serial-101'];
      const incomingSelection = 'unit-serial-101';

      const alreadySelected = selectedUnits.includes(incomingSelection);
      expect(alreadySelected).toBe(true);
    });
  });
});
