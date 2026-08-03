import { cleanPhoneNumber, formatDisplayPhoneNumber, createWhatsAppUrl, formatIndianPhoneForWhatsApp } from './phone';

describe('phone utils', () => {
  describe('formatIndianPhoneForWhatsApp', () => {
    it('prepends +91 to 10 digit numbers', () => {
      expect(formatIndianPhoneForWhatsApp('9876543210')).toBe('+919876543210');
    });

    it('strips leading 0 and prepends +91 to 11 digit numbers starting with 0', () => {
      expect(formatIndianPhoneForWhatsApp('09876543210')).toBe('+919876543210');
    });

    it('prepends + if number already has 91 country code without +', () => {
      expect(formatIndianPhoneForWhatsApp('919876543210')).toBe('+919876543210');
    });

    it('preserves existing + format', () => {
      expect(formatIndianPhoneForWhatsApp('+919876543210')).toBe('+919876543210');
    });

    it('removes spaces and hyphens', () => {
      expect(formatIndianPhoneForWhatsApp('98765-43210')).toBe('+919876543210');
      expect(formatIndianPhoneForWhatsApp('98765 43210')).toBe('+919876543210');
      expect(formatIndianPhoneForWhatsApp('+91 98765-43210')).toBe('+919876543210');
    });
  });
});
