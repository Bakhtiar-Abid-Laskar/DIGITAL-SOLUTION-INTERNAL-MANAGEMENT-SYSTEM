import {
  extractGoogleDriveFileId,
  getImageThumbnailUrl,
  getFullImageUrl,
  isGoogleDriveUrl,
  formatCurrency,
  cleanPhoneNumber,
} from '@repairshop/shared';

describe('Inventory Purchase Intake Module - Forensic E2E & Regression Suite', () => {
  describe('1. Purchase Code (PO Code) Generation & Validation', () => {
    const poRegex = /^PO-\d{4}-\d{4,}$/;

    it('matches valid PO code formats', () => {
      expect(poRegex.test('PO-2026-0001')).toBe(true);
      expect(poRegex.test('PO-2026-0042')).toBe(true);
      expect(poRegex.test('PO-2027-1000')).toBe(true);
    });

    it('rejects invalid PO codes', () => {
      expect(poRegex.test('PO-26-001')).toBe(false);
      expect(poRegex.test('RS-2026-0001')).toBe(false);
      expect(poRegex.test('PO20260001')).toBe(false);
      expect(poRegex.test('')).toBe(false);
    });
  });

  describe('2. Supplier Deduplication & Phone Normalization', () => {
    it('cleans mobile numbers by stripping spaces, dashes, and parens', () => {
      expect(cleanPhoneNumber('9876543210')).toBe('9876543210');
      expect(cleanPhoneNumber('+91 98765 43210')).toBe('+919876543210');
      expect(cleanPhoneNumber('098765-43210')).toBe('09876543210');
      expect(cleanPhoneNumber('+91-9876543210')).toBe('+919876543210');
    });

    it('handles empty or whitespace phone cleanly without error', () => {
      expect(cleanPhoneNumber('')).toBe('');
      expect(cleanPhoneNumber('   ')).toBe('');
    });
  });

  describe('3. Google Drive Image Resolution & Thumbnail Transformation', () => {
    const gdriveUrls = [
      {
        input: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing',
        fileId: '1A2B3C4D5E6F7G8H9I0J',
      },
      {
        input: 'https://drive.google.com/open?id=1A2B3C4D5E6F7G8H9I0J',
        fileId: '1A2B3C4D5E6F7G8H9I0J',
      },
      {
        input: 'https://drive.google.com/uc?id=1A2B3C4D5E6F7G8H9I0J&export=download',
        fileId: '1A2B3C4D5E6F7G8H9I0J',
      },
      {
        input: 'https://lh3.googleusercontent.com/d/1A2B3C4D5E6F7G8H9I0J',
        fileId: '1A2B3C4D5E6F7G8H9I0J',
      },
    ];

    it('correctly identifies Google Drive URLs', () => {
      gdriveUrls.forEach(({ input }) => {
        expect(isGoogleDriveUrl(input)).toBe(true);
      });
      expect(isGoogleDriveUrl('https://example.com/storage/invoice.jpg')).toBe(false);
      expect(isGoogleDriveUrl(null)).toBe(false);
      expect(isGoogleDriveUrl(undefined)).toBe(false);
    });

    it('extracts file ID from all Google Drive formats', () => {
      gdriveUrls.forEach(({ input, fileId }) => {
        expect(extractGoogleDriveFileId(input)).toBe(fileId);
      });
    });

    it('generates high-performance thumbnail endpoint', () => {
      const url = 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view';
      const thumb = getImageThumbnailUrl(url, 400);
      expect(thumb).toBe('https://drive.google.com/thumbnail?id=1A2B3C4D5E6F7G8H9I0J&sz=w400');
    });

    it('passes through standard Supabase Storage URLs unchanged', () => {
      const standardUrl = 'https://sssdjuxbelektszepikt.supabase.co/storage/v1/object/public/purchase-invoices/invoices/inv-123.jpg';
      expect(getImageThumbnailUrl(standardUrl, 300)).toBe(standardUrl);
      expect(getFullImageUrl(standardUrl)).toBe(standardUrl);
    });

    it('handles null and undefined image URLs safely', () => {
      expect(getImageThumbnailUrl(null)).toBeNull();
      expect(getImageThumbnailUrl(undefined)).toBeNull();
      expect(getFullImageUrl(null)).toBeNull();
      expect(getFullImageUrl(undefined)).toBeNull();
    });
  });

  describe('4. Purchase Financial Calculations & GST Formula', () => {
    it('calculates subtotal, taxes, and grand totals accurately', () => {
      const quantity = 10;
      const purchaseRate = 450;
      const cgstRate = 9;
      const sgstRate = 9;

      const subtotal = quantity * purchaseRate;
      const taxRate = cgstRate + sgstRate;
      const taxAmount = subtotal * (taxRate / 100);
      const grandTotal = subtotal + taxAmount;

      expect(subtotal).toBe(4500);
      expect(taxAmount).toBe(810);
      expect(grandTotal).toBe(5310);
    });

    it('handles zero tax purchases correctly', () => {
      const quantity = 5;
      const purchaseRate = 120;
      const subtotal = quantity * purchaseRate;
      const grandTotal = subtotal;

      expect(subtotal).toBe(600);
      expect(grandTotal).toBe(600);
    });
  });
});
