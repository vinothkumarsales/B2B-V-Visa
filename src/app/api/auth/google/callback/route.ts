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

function logGoogleStage(stage: string, metadata?: Record<string, unknown>) {
  console.info('GOOGLE_AUTH_STAGE', { stage, ...metadata });
}

function googleErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  if (code === 'P2021' || message.includes('does not exist') || message.includes('relation')) {
    return 'DATABASE_SCHEMA_MISSING';
  }
  if (
    code.startsWith('P10') ||
    message.includes('authentication failed') ||
    message.includes('connection') ||
    message.includes('ECONN') ||
    message.includes('certificate')
  ) {
    return 'DATABASE_CONNECTION_FAILED';
  }
  if (message.includes('Google token exchange failed')) return 'GOOGLE_TOKEN_EXCHANGE_FAILED';
  if (message.includes('Google profile fetch failed')) return 'GOOGLE_PROFILE_FAILED';
  return 'GOOGLE_LOGIN_FAILED';
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

  logGoogleStage('callback_parameters_received', {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasStateCookie: Boolean(expectedState),
    callbackOrigin: url.origin,
  });

  if (!googleOAuthConfigured()) {
    logGoogleStage('configuration_missing', {
      hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    });
    return redirectToLogin(request, 'GOOGLE_NOT_CONFIGURED');
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    logGoogleStage('state_validation_failed', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasStateCookie: Boolean(expectedState),
      stateMatches: Boolean(state && expectedState && state === expectedState),
    });
    return redirectToLogin(request, 'GOOGLE_STATE_MISMATCH');
  }
  logGoogleStage('state_validation_passed');

  try {
    logGoogleStage('authorization_code_exchange_started');
    const token = await exchangeGoogleCode({ code, origin: url.origin });
    logGoogleStage('authorization_code_exchange_succeeded');

    logGoogleStage('google_profile_fetch_started');
    const profile = await fetchGoogleProfile(token.access_token);
    const email = profile.email?.trim().toLowerCase();
    logGoogleStage('google_profile_fetch_succeeded', {
      hasEmail: Boolean(email),
      emailVerified: Boolean(profile.email_verified),
    });

    if (!email || !profile.email_verified) {
      logGoogleStage('email_verification_failed', {
        hasEmail: Boolean(email),
        emailVerified: Boolean(profile.email_verified),
      });
      return redirectToLogin(request, 'GOOGLE_EMAIL_NOT_VERIFIED');
    }

    const isAdminEmail = isBootstrapAdminEmail(email);
    logGoogleStage('database_user_lookup_started', { isAdminEmail });
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        include: { memberships: { include: { agency: true } } },
      });

      if (existing) return { user: existing, agency: existing.memberships[0]?.agency ?? null, created: false };

      logGoogleStage('user_bootstrap_started', { isAdminEmail });
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
      logGoogleStage('agency_wallet_bootstrap_succeeded');

      return { user, agency, created: true };
    });
    logGoogleStage('database_user_lookup_succeeded', {
      created: result.created,
      hasAgency: Boolean(result.agency),
      isAdminEmail,
    });

    logGoogleStage('session_creation_started');
    await createSession(result.user.id);
    logGoogleStage('session_creation_succeeded');

    await auditLog({
      agencyId: result.agency?.id,
      actorUserId: result.user.id,
      action: result.created ? 'GOOGLE_SIGNUP' : 'GOOGLE_LOGIN',
      resourceType: 'User',
      resourceId: result.user.id,
      metadata: { emailVerified: true, adminEmail: isAdminEmail },
    });

    if (result.created && result.agency) {
      logGoogleStage('crm_sync_queue_started');
      await queueTravelAgentCrmSync({ agencyId: result.agency.id });
      logGoogleStage('crm_sync_queue_succeeded');
    }

    logGoogleStage('final_redirect', { destination: isAdminEmail ? '/admin' : '/dashboard' });
    return NextResponse.redirect(new URL(isAdminEmail ? '/admin' : '/dashboard', request.url));
  } catch (error) {
    const code = googleErrorCode(error);
    console.error('GOOGLE_AUTH_FAILED', {
      code,
      message: error instanceof Error ? error.message : 'Unknown Google login error',
      prismaCode: typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined,
      googleStatus: typeof error === 'object' && error && 'googleStatus' in error ? String(error.googleStatus) : undefined,
      googleError: typeof error === 'object' && error && 'googleError' in error ? String(error.googleError) : undefined,
      googleErrorDescription: typeof error === 'object' && error && 'googleErrorDescription' in error ? String(error.googleErrorDescription) : undefined,
      redirectUri: typeof error === 'object' && error && 'redirectUri' in error ? String(error.redirectUri) : undefined,
    });
    return redirectToLogin(request, code);
  }
}
