import { getSignedUrlCached } from './storageUrlCache';

describe('Storage Signed URL Cache (@repairshop/shared/storageUrlCache.ts)', () => {
  it('returns null when path is null, undefined, or empty', async () => {
    const mockClient = { storage: { from: jest.fn() } };
    expect(await getSignedUrlCached(mockClient, 'avatars', null)).toBeNull();
    expect(await getSignedUrlCached(mockClient, 'avatars', '')).toBeNull();
  });

  it('returns the URL directly if path is already an absolute HTTP/HTTPS URL', async () => {
    const mockClient = { storage: { from: jest.fn() } };
    const httpUrl = 'https://example.com/avatar.jpg';
    const result = await getSignedUrlCached(mockClient, 'avatars', httpUrl);
    expect(result).toBe(httpUrl);
    expect(mockClient.storage.from).not.toHaveBeenCalled();
  });

  it('fetches a signed URL via Supabase Storage and caches the result', async () => {
    const mockCreateSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/signed/photo.webp?token=123' },
      error: null,
    });
    const mockClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: mockCreateSignedUrl,
        }),
      },
    };

    // First call -> Cache Miss
    const url1 = await getSignedUrlCached(mockClient, 'attendance-selfies', 'user1/2026-08-14.webp', 3600);
    expect(url1).toBe('https://supabase.co/storage/v1/signed/photo.webp?token=123');
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);

    // Second call -> Cache Hit (mockCreateSignedUrl should NOT be called again)
    const url2 = await getSignedUrlCached(mockClient, 'attendance-selfies', 'user1/2026-08-14.webp', 3600);
    expect(url2).toBe('https://supabase.co/storage/v1/signed/photo.webp?token=123');
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('returns null if Supabase Storage returns an error or no signedUrl', async () => {
    const mockClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'Object not found' } }),
        }),
      },
    };
    const result = await getSignedUrlCached(mockClient, 'attendance-selfies', 'nonexistent.webp');
    expect(result).toBeNull();
  });
});
