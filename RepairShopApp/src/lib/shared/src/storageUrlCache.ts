interface CacheItem {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CacheItem>();

/**
 * Extracts the storage object path from either:
 * 1. A raw object path ('invoices/inv-123.jpg' or 'purchase-invoices/invoices/inv-123.jpg')
 * 2. A legacy Supabase public/signed URL ('https://<project>.supabase.co/storage/v1/object/public/purchase-invoices/invoices/inv-123.jpg')
 * Returns null if the string is empty or if it's an external URL not belonging to this bucket.
 */
export function extractStoragePath(storedUrlOrPath: string | null | undefined, bucket: string): string | null {
  if (!storedUrlOrPath) return null;
  const raw = storedUrlOrPath.trim();
  if (!raw) return null;

  // If it's an absolute HTTP/HTTPS URL
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      const pathname = decodeURIComponent(url.pathname);
      const publicMarker = `/storage/v1/object/public/${bucket}/`;
      const signMarker = `/storage/v1/object/sign/${bucket}/`;
      const bucketMarker = `/${bucket}/`;

      if (pathname.includes(publicMarker)) {
        return pathname.substring(pathname.indexOf(publicMarker) + publicMarker.length);
      }
      if (pathname.includes(signMarker)) {
        return pathname.substring(pathname.indexOf(signMarker) + signMarker.length);
      }
      if (pathname.includes(bucketMarker)) {
        return pathname.substring(pathname.indexOf(bucketMarker) + bucketMarker.length);
      }
      // External URL not targeting this bucket
      return null;
    } catch {
      return null;
    }
  }

  // Raw path: strip leading slash or bucket name if present
  let cleanPath = raw.startsWith('/') ? raw.slice(1) : raw;
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.slice(bucket.length + 1);
  }
  return cleanPath || null;
}

export async function getSignedUrlCached(
  supabaseClient: any, 
  bucket: string, 
  pathOrUrl: string | null | undefined, 
  expiresInSeconds: number = 3000
): Promise<string | null> {
  if (!pathOrUrl) return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  const objectPath = extractStoragePath(trimmed, bucket);

  // If it's an external HTTP/HTTPS URL not associated with this bucket, return it directly
  if (!objectPath && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    return trimmed;
  }
  if (!objectPath) return null;

  const cacheKey = `${bucket}:${objectPath}`;
  const now = Date.now();
  const cached = urlCache.get(cacheKey);

  // Buffer of 5 minutes (300,000 ms) before actual expiration
  if (cached && cached.expiresAt > now + 300000) {
    return cached.url;
  }

  const { data } = await supabaseClient.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
  
  if (data?.signedUrl) {
    urlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + (expiresInSeconds * 1000)
    });
    return data.signedUrl;
  }
  
  return null;
}

