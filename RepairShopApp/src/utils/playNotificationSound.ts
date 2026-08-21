import { Platform } from 'react-native';
import { Audio } from 'expo-av';

let isSoundInitialized = false;

/**
 * Plays a Web Audio chime when running on web browser
 */
function playWebAudioChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: High bell (587.33 Hz)
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

    // Tone 2: Resolution (880 Hz)
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

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch (err) {
    console.warn('[Web Audio] Chime error:', err);
  }
}

/**
 * Play a short notification chime when a notification/event occurs
 * Supports Web Audio on Web and expo-av on native iOS/Android.
 */
export async function playNotificationSound(): Promise<void> {
  if (Platform.OS === 'web') {
    playWebAudioChime();
    return;
  }

  try {
    if (!isSoundInitialized) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      isSoundInitialized = true;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3' },
      { shouldPlay: true, volume: 0.8 }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (err) {
    console.warn('Could not play notification sound:', err);
  }
}
