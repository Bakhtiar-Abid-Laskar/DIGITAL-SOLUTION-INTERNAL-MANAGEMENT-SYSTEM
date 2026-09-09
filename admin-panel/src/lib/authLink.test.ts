import { parseAuthUrl } from '../../../RepairShopApp/src/utils/authLink';

describe('parseAuthUrl', () => {
  it('parses hash fragment format with access_token and refresh_token', () => {
    const url = 'repairshop://reset-password#access_token=mock-access-token&refresh_token=mock-refresh-token&type=recovery';
    const result = parseAuthUrl(url);

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.type).toBe('recovery');
  });

  it('parses query param format with auth code', () => {
    const url = 'repairshop://reset-password?code=mock-auth-code';
    const result = parseAuthUrl(url);

    expect(result.code).toBe('mock-auth-code');
    expect(result.accessToken).toBeNull();
  });

  it('parses error descriptions', () => {
    const url = 'repairshop://reset-password#error=access_denied&error_description=Token+has+expired';
    const result = parseAuthUrl(url);

    expect(result.errorDescription).toBe('Token has expired');
  });

  it('handles empty or malformed urls safely', () => {
    expect(parseAuthUrl('')).toEqual({
      accessToken: null,
      refreshToken: null,
      type: null,
      code: null,
      errorDescription: null,
    });
  });
});
