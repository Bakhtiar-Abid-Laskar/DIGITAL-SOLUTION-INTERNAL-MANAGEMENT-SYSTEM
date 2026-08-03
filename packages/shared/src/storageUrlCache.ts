interface CacheItem {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CacheItem>();

export async function getSignedUrlCached(
  supabaseClient: any, 
  bucket: string, 
  path: string | null, 
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('http')) return path; 

  const cacheKey = `${bucket}:${path}`;
  const now = Date.now();
  const cached = urlCache.get(cacheKey);

  // Buffer of 5 minutes (300,000 ms) before actual expiration
  if (cached && cached.expiresAt > now + 300000) {
    return cached.url;
  }

  const { data } = await supabaseClient.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  
  if (data?.signedUrl) {
    urlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + (expiresInSeconds * 1000)
    });
    return data.signedUrl;
  }
  
  return null;
}
