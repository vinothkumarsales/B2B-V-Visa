import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE,
  buildGoogleOAuthUrl,
  createGoogleOAuthState,
  googleOAuthConfigured,
} from '@/server/auth/google-oauth';

function redirectToLogin(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

export async function GET(request: NextRequest) {
  if (!googleOAuthConfigured()) {
    return redirectToLogin(request, 'google_not_configured');
  }

  const state = createGoogleOAuthState();
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE,
  });

  return NextResponse.redirect(buildGoogleOAuthUrl({
    origin: new URL(request.url).origin,
    state,
  }));
}
