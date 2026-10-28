import { Linking, Platform } from 'react-native';
import { createWhatsAppUrl, createWhatsAppWebUrl } from '@repairshop/shared';

/**
 * Universally opens WhatsApp on both native (Android/iOS) and web browsers.
 * On web: uses https://wa.me/ directly (avoids canOpenURL failure).
 * On native: attempts whatsapp:// first, with fallback to https://wa.me/.
 */
export async function openWhatsAppChat(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    const webUrl = createWhatsAppWebUrl(phone, message);
    if (!webUrl) {
      return { success: false, error: 'Could not format contact number for WhatsApp.' };
    }
    try {
      if (typeof window !== 'undefined') {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(webUrl);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not open WhatsApp.' };
    }
  }

  const nativeUrl = createWhatsAppUrl(phone, message);
  if (!nativeUrl) {
    return { success: false, error: 'Could not format contact number for WhatsApp.' };
  }

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return { success: true };
    }

    // Fallback to wa.me if whatsapp:// is unhandled
    const webFallback = createWhatsAppWebUrl(phone, message);
    if (webFallback) {
      await Linking.openURL(webFallback);
      return { success: true };
    }
    return { success: false, error: 'WhatsApp is not installed on this device.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not open WhatsApp.' };
  }
}
