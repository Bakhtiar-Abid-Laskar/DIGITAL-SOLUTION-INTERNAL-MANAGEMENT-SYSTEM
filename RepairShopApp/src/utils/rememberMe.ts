import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ds_last_login_info';

export interface LastLoginInfo {
  email: string;
  firstName?: string;
  rememberMe: boolean;
}

/**
 * Retrieve saved login info from secure storage or localStorage
 */
export async function getLastLoginInfo(): Promise<LastLoginInfo | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (!raw) return null;
    return JSON.parse(raw) as LastLoginInfo;
  } catch (err) {
    console.warn('[RememberMe] Error reading login info:', err);
    return null;
  }
}

/**
 * Save login info to secure storage or localStorage
 */
export async function saveLastLoginInfo(info: LastLoginInfo): Promise<void> {
  try {
    const raw = JSON.stringify(info);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (info.rememberMe) {
          window.localStorage.setItem(STORAGE_KEY, raw);
        } else {
          // If rememberMe is unchecked, still keep firstName for greeting if desired, or clear email
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ firstName: info.firstName, rememberMe: false, email: '' }));
        }
      }
    } else {
      if (info.rememberMe) {
        await SecureStore.setItemAsync(STORAGE_KEY, raw);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ firstName: info.firstName, rememberMe: false, email: '' }));
      }
    }
  } catch (err) {
    console.warn('[RememberMe] Error saving login info:', err);
  }
}

/**
 * Clear stored login credentials
 */
export async function clearLastLoginInfo(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[RememberMe] Error clearing login info:', err);
  }
}
