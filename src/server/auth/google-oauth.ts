import { randomBytes } from 'crypto';

export const GOOGLE_OAUTH_STATE_COOKIE = 'vvisa_google_oauth_state';
export const GOOGLE_OAUTH_STATE_MAX_AGE = 10 * 60;

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

function envValue(name: string) {
  return process.env[name]?.trim().replace(/^["']|["']$/g, '');
}

export function googleOAuthConfigured() {
  return Boolean(envValue('GOOGLE_CLIENT_ID') && envValue('GOOGLE_CLIENT_SECRET'));
}

export function createGoogleOAuthState() {
  return randomBytes(24).toString('base64url');
}

export function getGoogleRedirectUri(origin: string) {
  const appUrl = envValue('APP_URL')?.replace(/\/$/, '');
  return `${appUrl || origin}/api/auth/google/callback`;
}

export function buildGoogleOAuthUrl(input: { origin: string; state: string }) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', envValue('GOOGLE_CLIENT_ID') ?? '');
  url.searchParams.set('redirect_uri', getGoogleRedirectUri(input.origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', input.state);
  url.searchParams.set('prompt', 'select_account');
  return url;
}

export async function exchangeGoogleCode(input: { code: string; origin: string }) {
  const redirectUri = getGoogleRedirectUri(input.origin);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: envValue('GOOGLE_CLIENT_ID') ?? '',
      client_secret: envValue('GOOGLE_CLIENT_SECRET') ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as {
      error?: string;
      error_description?: string;
    } | null;
    const error = new Error(`Google token exchange failed: ${response.status}`);
    Object.assign(error, {
      googleStatus: response.status,
      googleError: errorPayload?.error,
      googleErrorDescription: errorPayload?.error_description,
      redirectUri,
    });
    throw error;
  }

  return response.json() as Promise<{ access_token: string }>;
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google profile fetch failed: ${response.status}`);
  }

  return response.json() as Promise<GoogleProfile>;
}
