/**
 * googleAuth.ts — Shared Deno helper for Google OAuth token management.
 *
 * Exchanges the stored refresh token for a short-lived access token.
 * Caches the token in module scope so a multi-file export run within one
 * Edge Function invocation only calls the token endpoint once.
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

// Module-scope cache — lives for the duration of one Edge Function invocation.
let _cache: TokenCache | null = null;

// Buffer: refresh token 5 minutes before real expiry to avoid edge-case failures
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Returns a valid Google OAuth access token.
 * Fetches a new one from the token endpoint if the cached one is expired or absent.
 * Throws a descriptive Error on any failure — never returns null.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (_cache && _cache.expiresAt - now > EXPIRY_BUFFER_MS) {
    return _cache.accessToken;
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google auth secrets are missing. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ' +
      'and GOOGLE_REFRESH_TOKEN are set in Supabase Edge Function secrets.'
    );
  }

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
    // expires_in is in seconds; default to 3600 if absent
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };

  return _cache.accessToken;
}

/**
 * Helper: verify auth works by calling Drive's /about endpoint.
 * Returns the authenticated Google account email.
 * Used only in the test Edge Function — not called in production flows.
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
