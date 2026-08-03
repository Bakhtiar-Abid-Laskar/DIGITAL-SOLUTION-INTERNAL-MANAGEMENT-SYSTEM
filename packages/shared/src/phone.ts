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
