import * as Linking from 'expo-linking';

export type SocialProvider = 'google' | 'apple';

/**
 * Returns the OAuth redirect URL for social authentication.
 *
 * IMPORTANT — OAuth provider whitelisting:
 *
 *   Dev builds (Expo Go / web):
 *     exp://localhost:8081/--/auth-callback
 *     (or exp://127.0.0.1:8081/--/auth-callback on some setups)
 *
 *   Production standalone builds (scheme: "glassskin"):
 *     glassskin://auth-callback
 *
 * Both of the above MUST be added to your OAuth provider dashboards:
 *
 *   Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs:
 *     - Authorized redirect URIs:
 *       exp://localhost:8081/--/auth-callback   (for local testing)
 *       glassskin://auth-callback                (for production)
 *     - If using a web client ID for the system-browser flow, also add:
 *       https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
 *       (Supabase Auth sometimes intermediates the callback)
 *
 *   Apple Developer Console → Sign in with Apple → Identifiers → Service IDs:
 *     - Return URLs:
 *       glassskin://auth-callback
 *     - Domains and Subdomains:
 *       glassskin://
 *
 * If either provider rejects the redirect URI, the social login flow will
 * hang in the browser with no callback to the app.
 */
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
