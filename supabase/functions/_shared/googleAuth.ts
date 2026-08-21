/**
 * googleAuth.ts — Shared Deno helper for Google Drive OAuth 2.0
 *
 * This version uses OAuth 2.0 (refresh tokens) rather than a Service Account
 * because free personal Google Accounts strictly enforce a 0-byte quota
 * on Service Accounts, preventing them from uploading files into shared folders.
 *
 * Generates a short-lived access token from a long-lived Refresh Token.
 * Caches the token in module scope for the duration of one Edge Function invocation.
 *
 * Usage:
 *   import { getAccessToken } from '../_shared/googleAuth.ts';
 *   const token = await getAccessToken();
 */

declare const Deno: any;

interface TokenCache {
  accessToken: string;
  expiresAt: number; // unix ms
}

// Module-scope cache
let _cache: TokenCache | null = null;
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cache && _cache.expiresAt - now > EXPIRY_BUFFER_MS) {
    return _cache.accessToken;
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth secrets are missing. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are set in Supabase Edge Function secrets.');
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google token endpoint returned ${res.status}: ${body}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error(`Google token response missing access_token: ${JSON.stringify(data)}`);
    }

    _cache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };

    return _cache.accessToken;
  } catch (err: any) {
    console.error('Failed to refresh OAuth token:', err.message);
    throw new Error('Google OAuth Failed: ' + err.message);
  }
}

/**
 * Helper: verify auth works by calling Drive's /about endpoint.
 */
export async function verifyAuth(): Promise<{ email: string; displayName: string }> {
  const token = await getAccessToken();
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive /about failed ${res.status}: ${body}`);
  }
  const data = await res.json();
  return {
    email: data.user?.emailAddress ?? 'unknown',
    displayName: data.user?.displayName ?? 'unknown',
  };
}
