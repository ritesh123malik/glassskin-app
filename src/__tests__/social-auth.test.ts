import { parseOAuthTokensFromUrl } from '../utils/auth';

describe('OAuth helpers', () => {
  it('parses Supabase hash tokens from the OAuth callback URL', () => {
    expect(
      parseOAuthTokensFromUrl('glassskin://auth-callback#access_token=access&refresh_token=refresh')
    ).toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('returns null when tokens are missing', () => {
    expect(parseOAuthTokensFromUrl('glassskin://auth-callback?error=access_denied')).toBeNull();
  });
});
