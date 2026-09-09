/**
 * Cleans a phone number by removing spaces, dashes, brackets, and extra characters.
 */
export const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)]/g, '').trim();
};

/**
 * Formats an Indian phone number for WhatsApp wa.me links.
 * 1. Keep if starts with +91
 * 2. Prefix + if starts with 91 and length is 12
 * 3. Remove leading 0 and prefix +91
 * 4. If exactly 10 digits, prefix +91
 */
export const formatIndianPhoneForWhatsApp = (phone: string): string | null => {
  let cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return null;

  if (cleaned.startsWith('+91') && cleaned.length === 13) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return '+' + cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) return '+91' + cleaned.substring(1);
  if (cleaned.length === 10) return '+91' + cleaned;
  
  // If we can't reliably format it to +91 but it has digits, just prefix + (fallback)
  if (/^\d+$/.test(cleaned) && cleaned.length > 10) return '+' + cleaned;
  
  return null;
};

/**
 * Creates the wa.me URL with a prefilled message draft.
 */
export const createWhatsAppUrl = (phone: string, message: string): string | null => {
  const formattedPhone = formatIndianPhoneForWhatsApp(phone);
  if (!formattedPhone) return null;
  
  // Remove the '+' for the wa.me link format as per WhatsApp docs, though + often works too.
  // Actually, wa.me works best with just digits including country code.
  const numericOnly = formattedPhone.replace('+', '');
  return `whatsapp://send?phone=${numericOnly}&text=${encodeURIComponent(message)}`;
};

export interface PhoneValidationResult {
  isValid: boolean;
  clean10: string;
  e164: string; // e.g. +919876543210
  formatted: string; // e.g. +91 98765 43210
  error?: string;
}

/**
 * Validates and normalizes an Indian mobile phone number:
 * - Strips whitespace, dashes, brackets, dots.
 * - Strips leading 0 or +91 / 91 country codes.
 * - Enforces exactly 10 digits starting with 6, 7, 8, or 9.
 */
export const validateAndNormalizeIndianPhone = (phone: string): PhoneValidationResult => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, clean10: '', e164: '', formatted: '', error: 'Phone number is required' };
  }

  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('91') && cleaned.length >= 12) {
    cleaned = cleaned.substring(2);
  }

  while (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length === 0) {
    return { isValid: false, clean10: '', e164: '', formatted: '', error: 'Contact number is required' };
  }

  if (digitsOnly.length !== 10) {
    return {
      isValid: false,
      clean10: digitsOnly,
      e164: '+91' + digitsOnly,
      formatted: digitsOnly,
      error: `Contact number must be exactly 10 digits (entered ${digitsOnly.length})`
    };
  }

  if (!/^[6-9]/.test(digitsOnly)) {
    return {
      isValid: false,
      clean10: digitsOnly,
      e164: '+91' + digitsOnly,
      formatted: digitsOnly,
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9'
    };
  }

  const formatted = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  return {
    isValid: true,
    clean10: digitsOnly,
    e164: `+91${digitsOnly}`,
    formatted,
  };
};

/**
 * Formats a phone input string as user types:
 * Strips leading zeros, non-digits, and auto-formats as +91 XXXXX XXXXX (up to 10 digits).
 */
export const formatPhoneInput = (rawInput: string): string => {
  if (!rawInput) return '';
  let cleaned = rawInput.replace(/[\s\-\(\)\.]/g, '').trim();
  if (cleaned.startsWith('+91')) cleaned = cleaned.substring(3);
  else if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  else if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.substring(2);
  
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  const digits = cleaned.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 5) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};
