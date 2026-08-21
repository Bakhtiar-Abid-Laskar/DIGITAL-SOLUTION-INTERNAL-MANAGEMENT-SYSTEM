import { cleanPhoneNumber, createWhatsAppUrl, formatIndianPhoneForWhatsApp } from './phone';

describe('Phone Normalization & WhatsApp Utilities (@repairshop/shared/phone.ts)', () => {
  describe('cleanPhoneNumber', () => {
    it('removes spaces, dashes, brackets, and extra characters', () => {
      expect(cleanPhoneNumber('(987) 654-3210')).toBe('9876543210');
      expect(cleanPhoneNumber(' 98765 43210 ')).toBe('9876543210');
      expect(cleanPhoneNumber('+91 98765-43210')).toBe('+919876543210');
    });

    it('returns empty string for empty input or undefined', () => {
      expect(cleanPhoneNumber('')).toBe('');
      expect(cleanPhoneNumber(null as any)).toBe('');
      expect(cleanPhoneNumber(undefined as any)).toBe('');
    });
  });

  describe('formatIndianPhoneForWhatsApp', () => {
    it('prepends +91 to standard 10-digit Indian numbers', () => {
      expect(formatIndianPhoneForWhatsApp('9876543210')).toBe('+919876543210');
    });

    it('strips leading 0 and prepends +91 to 11-digit numbers starting with 0', () => {
      expect(formatIndianPhoneForWhatsApp('09876543210')).toBe('+919876543210');
    });

    it('prepends + if number already has 91 country code without +', () => {
      expect(formatIndianPhoneForWhatsApp('919876543210')).toBe('+919876543210');
    });

    it('preserves existing valid +91 format', () => {
      expect(formatIndianPhoneForWhatsApp('+919876543210')).toBe('+919876543210');
    });

    it('handles formatted numbers with spaces and hyphens cleanly', () => {
      expect(formatIndianPhoneForWhatsApp('98765-43210')).toBe('+919876543210');
      expect(formatIndianPhoneForWhatsApp('98765 43210')).toBe('+919876543210');
      expect(formatIndianPhoneForWhatsApp('+91 98765-43210')).toBe('+919876543210');
    });

    it('falls back to prepending + for numeric numbers > 10 digits', () => {
      expect(formatIndianPhoneForWhatsApp('447911123456')).toBe('+447911123456');
    });

    it('returns null for invalid / too short phone numbers', () => {
      expect(formatIndianPhoneForWhatsApp('12345')).toBeNull();
      expect(formatIndianPhoneForWhatsApp('')).toBeNull();
      expect(formatIndianPhoneForWhatsApp('abc')).toBeNull();
    });
  });

  describe('createWhatsAppUrl', () => {
    it('constructs a valid whatsapp://send URI with numeric-only phone and encoded message', () => {
      const url = createWhatsAppUrl('9876543210', 'Your repair RS-2026-0001 is ready for pickup!');
      expect(url).toBe('whatsapp://send?phone=919876543210&text=Your%20repair%20RS-2026-0001%20is%20ready%20for%20pickup!');
    });

    it('returns null if phone number cannot be formatted', () => {
      expect(createWhatsAppUrl('invalid', 'Test message')).toBeNull();
    });

    it('correctly URL-encodes special characters in the message', () => {
      const url = createWhatsAppUrl('9876543210', 'Total: ₹1,500.00 & Status: Done');
      expect(url).toContain('%E2%82%B91%2C500.00');
      expect(url).toContain('%26');
    });
  });
});
