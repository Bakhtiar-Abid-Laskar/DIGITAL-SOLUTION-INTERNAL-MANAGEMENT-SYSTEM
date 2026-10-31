/**
 * Web Push and Service Worker Manager for Safari PWA & Desktop Web
 * Project: Digital Solution / RepairShop
 */

import { supabase } from '../lib/supabase';

// Production VAPID Public Key (NIST P-256 Base64URL)
export const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ||
  'BJti9LStmps1ap93J9kfIs4l-_IHMFo51ZawFtUdvFBCvTngCuM8x3lESXu3Au7yRD-8_BDl8GL4p3SAqIPglbg';

export interface WebPushSupportStatus {
  supported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  requiresHomeScreen: boolean;
  message?: string;
}

/**
 * Utility to convert base64url string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Inspects device platform and PWA environment
 */
export async function checkWebPushSupport(): Promise<WebPushSupportStatus> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      isIOS: false,
      isStandalone: false,
      permission: 'unsupported',
      isSubscribed: false,
      requiresHomeScreen: false,
    };
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    Boolean((navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;

  const hasPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  if (!hasPush) {
    return {
      supported: false,
      isIOS,
      isStandalone,
      permission: 'unsupported',
      isSubscribed: false,
      requiresHomeScreen: isIOS && !isStandalone,
      message: isIOS
        ? 'Push notifications on iOS require Safari 16.4+ installed to Home Screen.'
        : 'Your browser does not support the Web Push API.',
    };
  }

  // iOS 16.4+ only enables PushManager if the site is installed to the Home Screen
  if (isIOS && !isStandalone) {
    return {
      supported: false,
      isIOS,
      isStandalone,
      permission: Notification.permission,
      isSubscribed: false,
      requiresHomeScreen: true,
      message: 'On iPhone, tap Share -> "Add to Home Screen" first, then open the app from your home screen to enable push notifications.',
    };
  }

  let isSubscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      isSubscribed = Boolean(sub);
    }
  } catch (_) {}

  return {
    supported: true,
    isIOS,
    isStandalone,
    permission: Notification.permission,
    isSubscribed,
    requiresHomeScreen: false,
  };
}

/**
 * Registers the Service Worker and subscribes the user to Web Push.
 * MUST be invoked directly from a user gesture (e.g. button click).
 */
export async function subscribeToWebPush(): Promise<{ success: boolean; error?: string; message?: string }> {
  const status = await checkWebPushSupport();
  if (!status.supported) {
    return {
      success: false,
      error: status.requiresHomeScreen ? 'requires_home_screen' : 'unsupported',
      message: status.message,
    };
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'permission_denied',
        message: 'Notification permission was denied. Please allow notifications in your browser settings.',
      };
    }

    // 3. Subscribe with PushManager
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');

    if (!p256dhKey || !authKey) {
      throw new Error('Subscription did not yield cryptographic keys.');
    }

    const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey))));
    const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey))));

    // 4. Save to Supabase via register_device_token RPC
    const { data, error } = await supabase.rpc('register_device_token', {
      p_platform: 'web',
      p_token_or_endpoint: subscription.endpoint,
      p_keys: { p256dh, auth },
      p_device_info: {
        userAgent: navigator.userAgent,
        isStandalone: status.isStandalone,
        registeredAt: new Date().toISOString(),
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Web push notifications enabled successfully!',
    };
  } catch (err: any) {
    console.error('[Web Push] Subscription error:', err);
    return {
      success: false,
      error: err.message || 'Subscription failed',
      message: err.message || 'Failed to enable web push notifications.',
    };
  }
}

/**
 * Unsubscribes from Web Push and deactivates device token in database.
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.rpc('unregister_device_token', {
          p_token_or_endpoint: endpoint,
        });
      }
    }
    return true;
  } catch (e) {
    console.warn('[Web Push] Unsubscribe error:', e);
    return false;
  }
}

