/**
 * Resolves the base site URL dynamically based on environment.
 * 1. In browser runtime: uses window.location.origin (supports localhost, preview deployments, custom domains).
 * 2. In explicit env: NEXT_PUBLIC_SITE_URL.
 * 3. In Vercel environments: automatically resolves from Vercel system env vars.
 * 4. In production/fallback: uses the verified Vercel production domain.
 */
export function getSiteUrl(): string {
  // 1. Browser runtime: dynamically use current window location
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 2. Explicitly configured production / staging site URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL.trim();
    if (url) {
      return url.startsWith('http') ? url : `https://${url}`;
    }
  }

  // 3. Vercel production deployment URL (automatically populated by Vercel)
  const vercelProd = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    return `https://${vercelProd}`;
  }

  // 4. Vercel deployment URL (preview or branch)
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // 5. In production runtime without specific vars, use the production deployment domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://digital-solution-internal-management-system.vercel.app';
  }

  // 6. Local development fallback
  return 'http://localhost:3000';
}

