/**
 * Parses deep link auth URLs for Supabase recovery or magic links.
 * Handles both hash fragment format (#access_token=...&refresh_token=...)
 * and query param format (?code=... or ?access_token=...).
 */
export interface ParsedAuthUrl {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  code: string | null;
  errorDescription: string | null;
}

export function parseAuthUrl(url: string): ParsedAuthUrl {
  if (!url) {
    return {
      accessToken: null,
      refreshToken: null,
      type: null,
      code: null,
      errorDescription: null,
    };
  }

  let paramsString = '';
  if (url.includes('#')) {
    paramsString = url.split('#')[1] || '';
  } else if (url.includes('?')) {
    paramsString = url.split('?')[1] || '';
  }

  const params = new URLSearchParams(paramsString);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type: params.get('type'),
    code: params.get('code'),
    errorDescription: params.get('error_description') || params.get('error'),
  };
}
