/**
 * Utilities for resolving and formatting image URLs from Google Drive and Supabase Storage.
 */

const GOOGLE_DRIVE_REGEX = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_\-]+)/;

/**
 * Extracts Google Drive file ID from various link formats or raw ID strings.
 */
export function extractGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const match = trimmed.match(GOOGLE_DRIVE_REGEX);
  if (match) return match[1];

  // If it's a raw Drive file ID (20-60 chars alphanumeric + _ + -, no slash or protocol)
  if (/^[a-zA-Z0-9_\-]{20,60}$/.test(trimmed) && !trimmed.startsWith('http')) {
    return trimmed;
  }

  return null;
}

/**
 * Returns true if the provided URL is a Google Drive link or ID.
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  return extractGoogleDriveFileId(url) !== null;
}

/**
 * Resolves a thumbnail image URL.
 * If the URL is a Google Drive link, converts it to a high-performance Google Drive thumbnail endpoint.
 * Otherwise, returns the original URL.
 */
export function getImageThumbnailUrl(url: string | null | undefined, width: number = 400): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
  }

  return trimmed;
}

/**
 * Resolves a full-resolution image URL.
 * If Google Drive, returns a direct content/high-res link.
 */
export function getFullImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  return trimmed;
}
