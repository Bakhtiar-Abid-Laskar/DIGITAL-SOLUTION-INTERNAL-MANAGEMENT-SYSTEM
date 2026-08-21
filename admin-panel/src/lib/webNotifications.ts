/**
 * Web Notifications and Audio Chime Utilities for Admin Panel
 */

/**
 * Plays a pleasant, latency-free notification chime using the Web Audio API.
 * Works without downloading external MP3s and works on all modern browsers.
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: High crisp bell (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Harmonic resolution (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);

    // Cleanup AudioContext after playback completes
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch (err) {
    console.warn('[Web Audio] Could not play notification chime:', err);
  }
}

/**
 * Requests browser permission for native desktop notifications.
 */
export async function requestWebNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('[Web Notifications] Permission request error:', err);
    }
  }

  return Notification.permission;
}

export interface ShowWebNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  onClick?: () => void;
}

/**
 * Dispatches a native desktop/browser notification banner.
 */
export function showWebNotification({
  title,
  body,
  icon = '/logo.webp',
  tag,
  data,
  onClick,
}: ShowWebNotificationOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      tag: tag || `ds-notif-${Date.now()}`,
      data,
    });

    notification.onclick = function (event) {
      event.preventDefault();
      try {
        window.focus();
      } catch (_) {}
      if (onClick) {
        onClick();
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('[Web Notifications] Could not create Notification instance:', err);
    return null;
  }
}
