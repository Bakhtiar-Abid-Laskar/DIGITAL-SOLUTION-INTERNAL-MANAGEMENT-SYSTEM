/**
 * Resolves the base site URL dynamically based on environment.
 * In browser runtime: uses window.location.origin (supports localhost, preview deployments, custom domains).
 * In SSR / build-time: falls back to NEXT_PUBLIC_SITE_URL or localhost:3000.
 */
export function getSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}
