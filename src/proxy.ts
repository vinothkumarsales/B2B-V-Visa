import { NextRequest, NextResponse } from 'next/server';

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

export function proxy(request: NextRequest) {
  const appMode = process.env.APP_MODE ?? 'demo';
  if (appMode === 'demo') return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const isPortalRoute = portalPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isPortalRoute) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
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
