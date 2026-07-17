import * as Linking from 'expo-linking';

export type SocialProvider = 'google' | 'apple';

export const getOAuthRedirectUrl = () => Linking.createURL('auth-callback');

export const parseOAuthTokensFromUrl = (url: string) => {
  const tokenSource = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
  if (!tokenSource) {
    return null;
  }

  const params = new URLSearchParams(tokenSource);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
};
