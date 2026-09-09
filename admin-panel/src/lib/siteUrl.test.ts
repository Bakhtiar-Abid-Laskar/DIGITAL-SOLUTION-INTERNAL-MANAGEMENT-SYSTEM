import { getSiteUrl } from './siteUrl';

describe('getSiteUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  it('falls back to localhost:3000 when no window and no env var', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const url = getSiteUrl();
    expect(url).toBe('http://localhost:3000');
  });

  it('uses NEXT_PUBLIC_SITE_URL when set in server environment', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://repairshop.digitalsolution.com';
    const url = getSiteUrl();
    expect(url).toBe('https://repairshop.digitalsolution.com');
  });
});
