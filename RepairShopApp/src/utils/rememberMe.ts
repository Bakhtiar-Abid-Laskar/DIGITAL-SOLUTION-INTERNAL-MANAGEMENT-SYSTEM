import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ds_last_login_info';

export interface LastLoginInfo {
  email: string;
  firstName?: string;
  rememberMe: boolean;
}

const webFallback = new Map<string, string>();

function getWebItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Private browsing or restricted webview
  }
  return webFallback.get(key) ?? null;
}

function setWebItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Private browsing or restricted webview
  }
  webFallback.set(key, value);
}

function removeWebItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    // Private browsing or restricted webview
  }
  webFallback.delete(key);
}

/**
 * Retrieve saved login info from secure storage or localStorage
 */
export async function getLastLoginInfo(): Promise<LastLoginInfo | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = getWebItem(STORAGE_KEY);
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
      if (info.rememberMe) {
        setWebItem(STORAGE_KEY, raw);
      } else {
        setWebItem(STORAGE_KEY, JSON.stringify({ firstName: info.firstName, rememberMe: false, email: '' }));
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
      removeWebItem(STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[RememberMe] Error clearing login info:', err);
  }
}
