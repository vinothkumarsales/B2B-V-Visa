import { NextRequest, NextResponse } from 'next/server';
import { SOON_GATED_PATHS } from '@/content/nav';

const SESSION_COOKIE = 'vvisa_b2b_session';

const portalPrefixes = [
  '/dashboard',
  '/explore',
  '/apply',
  '/applications',
  '/application-detail',
  '/wallet',
  '/profile',
  '/alliance',
  '/overstay',
  '/change-password',
];

/** "Soon" links in the Solutions menu: unreleased, so they sit behind login. */
const soonGatedPaths = new Set(SOON_GATED_PATHS);

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Gated regardless of APP_MODE — these pages are not public in any mode.
  if (soonGatedPaths.has(pathname)) {
    return hasSession ? NextResponse.next() : redirectToLogin(request, pathname);
  }

  const appMode = process.env.APP_MODE ?? 'demo';
  if (appMode === 'demo') return NextResponse.next();

  const isPortalRoute = portalPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isPortalRoute) return NextResponse.next();

  if (hasSession) return NextResponse.next();

  return redirectToLogin(request, pathname);
}

export const config = {
  matcher: [
    '/solutions/:path*',
    '/dashboard/:path*',
    '/explore/:path*',
    '/apply/:path*',
    '/applications/:path*',
    '/application-detail/:path*',
    '/wallet/:path*',
    '/profile/:path*',
    '/alliance/:path*',
    '/overstay/:path*',
    '/change-password/:path*',
  ],
};
