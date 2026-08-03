/**
 * driveUpload.ts — Shared Deno helper for uploading files to Google Drive.
 *
 * Uses the Drive v3 multipart upload API to send file data + metadata in a
 * single request (suitable for files up to ~5MB; use resumable upload for larger).
 *
 * Features:
 * - Returns both `fileId` and `webViewLink` so the caller can store a direct
 *   browser link on the database record.
 * - Exponential backoff retry (3 attempts: 0s, 2s, 8s) for 429 and 5xx errors.
 * - Does NOT retry on 4xx auth errors — those require human intervention.
 *
 * Usage:
 *   import { uploadFileToDrive } from '../_shared/driveUpload.ts';
 *   const { fileId, webViewLink } = await uploadFileToDrive(token, {
 *     name: 'August 2026 digital solution backup.xlsx',
 *     mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 *     parentId: folderId,
 *     data: uint8Array,
 *   });
 */

export interface DriveUploadOptions {
  name: string;
  mimeType: string;
  parentId: string;
  data: Uint8Array;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

/** Delays for exponential backoff: 0ms, 2s, 8s */
const BACKOFF_DELAYS_MS = [0, 2000, 8000];

/**
 * Upload a file to Google Drive using multipart upload.
 * Throws a descriptive Error on failure after all retries are exhausted.
 */
export async function uploadFileToDrive(
  accessToken: string,
  options: DriveUploadOptions
): Promise<DriveUploadResult> {
  const { name, mimeType, parentId, data } = options;

  const metadata = JSON.stringify({
    name,
    parents: [parentId],
  });

  // Build multipart body
  const boundary = `RepairShopDriveBoundary${Date.now()}`;
  const metaPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n`;
  const dataPart =
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const closingBoundary = `\r\n--${boundary}--`;

  const metaBytes = new TextEncoder().encode(metaPart);
  const dataPartBytes = new TextEncoder().encode(dataPart);
  const closingBytes = new TextEncoder().encode(closingBoundary);

  const body = new Uint8Array(
    metaBytes.length + dataPartBytes.length + data.length + closingBytes.length
  );
  let offset = 0;
  body.set(metaBytes, offset); offset += metaBytes.length;
  body.set(dataPartBytes, offset); offset += dataPartBytes.length;
  body.set(data, offset); offset += data.length;
  body.set(closingBytes, offset);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files' +
    '?uploadType=multipart' +
    '&fields=id,webViewLink';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < BACKOFF_DELAYS_MS.length; attempt++) {
    if (BACKOFF_DELAYS_MS[attempt] > 0) {
      await new Promise(r => setTimeout(r, BACKOFF_DELAYS_MS[attempt]));
    }

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    });

    // Don't retry on client errors (4xx) — those need human intervention
    if (res.status >= 400 && res.status < 500) {
      const errBody = await res.text();
      throw new Error(`Drive upload failed with client error ${res.status}: ${errBody}`);
    }

    // Retry on rate limit and server errors
    if ((res.status === 429 || res.status >= 500) && attempt < BACKOFF_DELAYS_MS.length - 1) {
      const errBody = await res.text();
      lastError = new Error(`Drive upload attempt ${attempt + 1} failed (${res.status}): ${errBody}`);
      console.warn(lastError.message + ' — retrying...');
      continue;
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Drive upload failed (${res.status}): ${errBody}`);
    }

    const result = await res.json();

    if (!result.id) {
      throw new Error(`Drive upload returned no file ID: ${JSON.stringify(result)}`);
    }

    return {
      fileId: result.id,
      // webViewLink may be absent if Drive API doesn't return it for this file type
      webViewLink: result.webViewLink ?? `https://drive.google.com/file/d/${result.id}/view`,
    };
  }

  throw lastError ?? new Error('Drive upload failed after all retries');
}

/**
 * Sanitize a string for use as part of a Drive filename.
 * Lowercases, replaces spaces/special chars with hyphens, strips non-alphanumeric.
 */
export function sanitizeFilenameSegment(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')                     // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')      // strip accent marks
    .replace(/[^a-z0-9]+/g, '-')         // non-alphanum → hyphen
    .replace(/^-+|-+$/g, '');            // trim leading/trailing hyphens
}

/**
 * Convert a JS Date (or ISO string) into YYYYMMDD format for filenames.
 */
export function formatDateForFilename(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Return the full month name for a given month number (1-indexed).
 * e.g. monthName(8) → 'August'
 */
export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
}
