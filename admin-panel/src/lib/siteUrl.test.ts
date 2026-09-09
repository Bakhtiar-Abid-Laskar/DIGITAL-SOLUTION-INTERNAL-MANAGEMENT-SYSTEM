import { getSiteUrl } from './siteUrl';

describe('getSiteUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to localhost:3000 in development when no window or env var', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    (process.env as any).NODE_ENV = 'development';

    const url = getSiteUrl();
    expect(url).toBe('http://localhost:3000');
  });

  it('uses NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://admin.digitalsolution.com';
    const url = getSiteUrl();
    expect(url).toBe('https://admin.digitalsolution.com');
  });

  it('resolves from NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL = 'digital-solution-internal-management-system.vercel.app';

    const url = getSiteUrl();
    expect(url).toBe('https://digital-solution-internal-management-system.vercel.app');
  });

  it('falls back to production domain when NODE_ENV is production without specific vars', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    (process.env as any).NODE_ENV = 'production';

    const url = getSiteUrl();
    expect(url).toBe('https://digital-solution-internal-management-system.vercel.app');
  });
});
