import { getSignedUrlCached, extractStoragePath } from './storageUrlCache';

describe('Storage Signed URL Cache (@repairshop/shared/storageUrlCache.ts)', () => {
  it('returns null when path is null, undefined, or empty', async () => {
    const mockClient = { storage: { from: jest.fn() } };
    expect(await getSignedUrlCached(mockClient, 'avatars', null)).toBeNull();
    expect(await getSignedUrlCached(mockClient, 'avatars', '')).toBeNull();
  });

  it('returns the URL directly if path is already an external absolute HTTP/HTTPS URL', async () => {
    const mockClient = { storage: { from: jest.fn() } };
    const httpUrl = 'https://example.com/avatar.jpg';
    const result = await getSignedUrlCached(mockClient, 'avatars', httpUrl);
    expect(result).toBe(httpUrl);
    expect(mockClient.storage.from).not.toHaveBeenCalled();
  });

  describe('extractStoragePath', () => {
    it('extracts object path from raw relative paths', () => {
      expect(extractStoragePath('invoices/inv-123.jpg', 'purchase-invoices')).toBe('invoices/inv-123.jpg');
      expect(extractStoragePath('/invoices/inv-123.jpg', 'purchase-invoices')).toBe('invoices/inv-123.jpg');
      expect(extractStoragePath('purchase-invoices/invoices/inv-123.jpg', 'purchase-invoices')).toBe('invoices/inv-123.jpg');
    });

    it('extracts object path from legacy Supabase public storage URLs', () => {
      const publicUrl = 'https://sssdjuxbelektszepikt.supabase.co/storage/v1/object/public/purchase-invoices/invoices/inv-456.jpg';
      expect(extractStoragePath(publicUrl, 'purchase-invoices')).toBe('invoices/inv-456.jpg');
    });

    it('extracts object path from legacy Supabase signed storage URLs', () => {
      const signedUrl = 'https://sssdjuxbelektszepikt.supabase.co/storage/v1/object/sign/purchase-invoices/invoices/inv-789.jpg?token=abc123xyz';
      expect(extractStoragePath(signedUrl, 'purchase-invoices')).toBe('invoices/inv-789.jpg');
    });

    it('returns null for external URLs that do not belong to the target bucket', () => {
      expect(extractStoragePath('https://drive.google.com/file/d/123/view', 'purchase-invoices')).toBeNull();
      expect(extractStoragePath('https://example.com/image.png', 'purchase-invoices')).toBeNull();
    });

    it('returns null for null, empty or whitespace strings', () => {
      expect(extractStoragePath(null, 'purchase-invoices')).toBeNull();
      expect(extractStoragePath('', 'purchase-invoices')).toBeNull();
      expect(extractStoragePath('   ', 'purchase-invoices')).toBeNull();
    });
  });

  it('correctly resolves and signs legacy public Supabase URLs for private buckets', async () => {
    const mockCreateSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/signed/invoices/inv-456.jpg?token=signed999' },
      error: null,
    });
    const mockClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: mockCreateSignedUrl,
        }),
      },
    };

    const legacyPublicUrl = 'https://sssdjuxbelektszepikt.supabase.co/storage/v1/object/public/purchase-invoices/invoices/inv-456.jpg';
    const result = await getSignedUrlCached(mockClient, 'purchase-invoices', legacyPublicUrl, 600);
    expect(result).toBe('https://supabase.co/storage/v1/signed/invoices/inv-456.jpg?token=signed999');
    expect(mockClient.storage.from).toHaveBeenCalledWith('purchase-invoices');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('invoices/inv-456.jpg', 600);
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

