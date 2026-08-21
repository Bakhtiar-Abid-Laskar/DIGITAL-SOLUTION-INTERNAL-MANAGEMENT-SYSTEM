import {
  extractGoogleDriveFileId,
  isGoogleDriveUrl,
  getImageThumbnailUrl,
  getFullImageUrl,
} from './imageUtils';

describe('Google Drive Image Utilities', () => {
  const SAMPLE_FILE_ID = '1a2B3c4D5e6F7g8H9i0J_kLmN';
  const SHARING_URL = `https://drive.google.com/file/d/${SAMPLE_FILE_ID}/view?usp=sharing`;
  const OPEN_URL = `https://drive.google.com/open?id=${SAMPLE_FILE_ID}`;
  const UC_URL = `https://drive.google.com/uc?id=${SAMPLE_FILE_ID}`;
  const LH3_URL = `https://lh3.googleusercontent.com/d/${SAMPLE_FILE_ID}`;
  const SUPABASE_STORAGE_URL = 'https://sssdjuxbelektszepikt.supabase.co/storage/v1/object/public/purchase-invoices/invoice-123.jpg';

  it('extracts file ID from standard Google Drive share links and raw IDs', () => {
    expect(extractGoogleDriveFileId(SHARING_URL)).toBe(SAMPLE_FILE_ID);
    expect(extractGoogleDriveFileId(OPEN_URL)).toBe(SAMPLE_FILE_ID);
    expect(extractGoogleDriveFileId(UC_URL)).toBe(SAMPLE_FILE_ID);
    expect(extractGoogleDriveFileId(LH3_URL)).toBe(SAMPLE_FILE_ID);
    expect(extractGoogleDriveFileId(SAMPLE_FILE_ID)).toBe(SAMPLE_FILE_ID);
  });

  it('returns null for non-Google Drive URLs', () => {
    expect(extractGoogleDriveFileId(SUPABASE_STORAGE_URL)).toBeNull();
    expect(extractGoogleDriveFileId('')).toBeNull();
    expect(extractGoogleDriveFileId(null)).toBeNull();
  });

  it('identifies Google Drive URLs accurately', () => {
    expect(isGoogleDriveUrl(SHARING_URL)).toBe(true);
    expect(isGoogleDriveUrl(SUPABASE_STORAGE_URL)).toBe(false);
  });

  it('generates properly formatted thumbnail URLs for Google Drive', () => {
    expect(getImageThumbnailUrl(SHARING_URL, 300)).toBe(
      `https://drive.google.com/thumbnail?id=${SAMPLE_FILE_ID}&sz=w300`
    );
  });

  it('preserves non-Google Drive URLs for thumbnails', () => {
    expect(getImageThumbnailUrl(SUPABASE_STORAGE_URL)).toBe(SUPABASE_STORAGE_URL);
  });

  it('generates high-resolution preview URLs for Google Drive', () => {
    expect(getFullImageUrl(SHARING_URL)).toBe(
      `https://drive.google.com/thumbnail?id=${SAMPLE_FILE_ID}&sz=w1600`
    );
  });
});
