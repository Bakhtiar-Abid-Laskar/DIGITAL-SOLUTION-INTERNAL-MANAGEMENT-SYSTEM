/**
 * driveFolders.ts — Shared Deno helper for Google Drive folder management.
 *
 * Provides `ensureFolderPath()` which idempotently creates a chain of nested
 * Drive folders, reusing existing ones rather than creating duplicates.
 *
 * Features:
 * - In-memory Map cache keyed by joined path string, so a batch of 30 file
 *   uploads in one run does not re-query Drive for the same parent folder
 *   30 times.
 * - Exponential backoff retry (3 attempts: 0s, 2s, 8s) for 429 and 5xx errors.
 * - Throws descriptive errors on 4xx (auth/permission) without retrying.
 *
 * Usage:
 *   import { ensureFolderPath } from '../_shared/driveFolders.ts';
 *   const folderId = await ensureFolderPath(token, ['Data Export', '2026', 'August']);
 */

// In-memory folder cache scoped to the current invocation
const _folderCache = new Map<string, string>(); // 'parent::name' -> folderId

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Delays for exponential backoff: 0ms, 2s, 8s */
const BACKOFF_DELAYS_MS = [0, 2000, 8000];

async function driveRequest(
  method: 'GET' | 'POST',
  url: string,
  accessToken: string,
  body?: unknown
): Promise<Response> {
  for (let attempt = 0; attempt < BACKOFF_DELAYS_MS.length; attempt++) {
    if (BACKOFF_DELAYS_MS[attempt] > 0) {
      await new Promise(r => setTimeout(r, BACKOFF_DELAYS_MS[attempt]));
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    // Retry on rate limit and server errors only
    if ((res.status === 429 || res.status >= 500) && attempt < BACKOFF_DELAYS_MS.length - 1) {
      console.warn(`Drive API ${res.status} on attempt ${attempt + 1}, retrying...`);
      continue;
    }

    return res;
  }

  // Should never reach here, but TypeScript requires it
  throw new Error('Unexpected exit from retry loop');
}

/**
 * Find an existing folder by name inside a given parent.
 * Returns the folder ID if found, or null if not found.
 */
async function findFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string | null> {
  const query = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = '${FOLDER_MIME}'`,
    `'${parentId}' in parents`,
    `trashed = false`,
  ].join(' and ');

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`;
  const res = await driveRequest('GET', url, accessToken);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive search failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Create a folder with the given name inside a parent folder.
 * Returns the new folder's ID.
 */
async function createFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string> {
  const res = await driveRequest(
    'POST',
    'https://www.googleapis.com/drive/v3/files?fields=id',
    accessToken,
    {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive folder create failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.id) throw new Error(`Drive folder create returned no ID: ${JSON.stringify(data)}`);
  return data.id;
}

/**
 * Idempotently ensure a path of nested folders exists in Google Drive.
 *
 * @param accessToken  - Valid Google OAuth access token (from googleAuth.ts)
 * @param pathParts    - Array of folder names from root to leaf, e.g. ['Data Export', '2026', 'August']
 * @param rootFolderId - Optional parent folder ID; defaults to 'root' (My Drive)
 * @returns ID of the deepest folder in the path (the leaf folder)
 */
export async function ensureFolderPath(
  accessToken: string,
  pathParts: string[],
  rootFolderId = 'root'
): Promise<string> {
  let currentParentId = rootFolderId;

  for (const part of pathParts) {
    const cacheKey = `${currentParentId}::${part}`;

    if (_folderCache.has(cacheKey)) {
      currentParentId = _folderCache.get(cacheKey)!;
      continue;
    }

    // Search for existing folder first (idempotent — never creates duplicates)
    const existingId = await findFolder(accessToken, part, currentParentId);

    if (existingId) {
      _folderCache.set(cacheKey, existingId);
      currentParentId = existingId;
    } else {
      const newId = await createFolder(accessToken, part, currentParentId);
      _folderCache.set(cacheKey, newId);
      currentParentId = newId;
    }
  }

  return currentParentId;
}

/**
 * Clear the in-memory folder cache.
 * Useful in tests where you want to force re-queries.
 */
export function clearFolderCache(): void {
  _folderCache.clear();
}
