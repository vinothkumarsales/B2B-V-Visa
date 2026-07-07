import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLog } from '@/server/audit/audit-log';
import { createSession } from '@/server/auth/session';
import { hashPassword } from '@/server/auth/password';
import { isBootstrapAdminEmail } from '@/server/admin/permissions';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleOAuthConfigured,
} from '@/server/auth/google-oauth';

function redirectToLogin(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

function randomPasswordHash() {
  return hashPassword(randomBytes(32).toString('base64url'));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!googleOAuthConfigured()) return redirectToLogin(request, 'google_not_configured');
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLogin(request, 'google_invalid_state');
  }

  try {
    const token = await exchangeGoogleCode({ code, origin: url.origin });
    const profile = await fetchGoogleProfile(token.access_token);
    const email = profile.email?.trim().toLowerCase();

    if (!email || !profile.email_verified) {
      return redirectToLogin(request, 'google_email_unverified');
    }

    const isAdminEmail = isBootstrapAdminEmail(email);
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        include: { memberships: { include: { agency: true } } },
      });

      if (existing) return { user: existing, agency: existing.memberships[0]?.agency ?? null, created: false };

      const user = await tx.user.create({
        data: {
          name: profile.name ?? email.split('@')[0],
          email,
          passwordHash: randomPasswordHash(),
        },
        include: { memberships: { include: { agency: true } } },
      });

      if (isAdminEmail) return { user, agency: null, created: true };

      const agencyName = profile.name ? `${profile.name}'s Agency` : email.split('@')[0];
      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          email,
          status: 'DRAFT',
          memberships: {
            create: {
              userId: user.id,
              role: 'AGENCY_OWNER',
              isDefault: true,
            },
          },
          wallets: {
            create: { currency: 'INR' },
          },
        },
      });

      return { user, agency, created: true };
    });

    await createSession(result.user.id);

    await auditLog({
      agencyId: result.agency?.id,
      actorUserId: result.user.id,
      action: result.created ? 'GOOGLE_SIGNUP' : 'GOOGLE_LOGIN',
      resourceType: 'User',
      resourceId: result.user.id,
      metadata: { emailVerified: true, adminEmail: isAdminEmail },
    });

    if (result.created && result.agency) {
      await queueTravelAgentCrmSync({ agencyId: result.agency.id });
    }

    return NextResponse.redirect(new URL(isAdminEmail ? '/admin' : '/dashboard', request.url));
  } catch (error) {
    console.error('GOOGLE_LOGIN_FAILED', error instanceof Error ? error.message : 'Unknown Google login error');
    return redirectToLogin(request, 'google_login_failed');
  }
}
