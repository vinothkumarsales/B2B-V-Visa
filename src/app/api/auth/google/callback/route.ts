import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { auditLog } from '@/server/audit/audit-log';
import { createSession } from '@/server/auth/session';
import { hashPassword } from '@/server/auth/password';
import { isBootstrapAdminEmail } from '@/server/admin/permissions';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleOAuthConfigured,
  type GoogleProfile,
} from '@/server/auth/google-oauth';
import type { Prisma } from '@prisma/client';

function redirectToLogin(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

function logGoogleStage(stage: string, metadata?: Record<string, unknown>) {
  console.info('GOOGLE_AUTH_STAGE', { stage, ...metadata });
}

type GoogleCallbackStage =
  | 'state_validation'
  | 'token_exchange'
  | 'profile_fetch'
  | 'profile_validation'
  | 'user_bootstrap'
  | 'agency_bootstrap'
  | 'membership_bootstrap'
  | 'wallet_bootstrap'
  | 'identity_transaction'
  | 'session_creation'
  | 'audit_write'
  | 'crm_sync_queue'
  | 'final_redirect';

function prismaErrorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) return String(error.code);
  return undefined;
}

function prismaErrorMeta(error: unknown) {
  if (typeof error === 'object' && error && 'meta' in error) {
    return error.meta as Record<string, unknown>;
  }
  return undefined;
}

function googleErrorCode(error: unknown, stage: GoogleCallbackStage) {
  const message = error instanceof Error ? error.message : String(error);
  const code = prismaErrorCode(error) ?? '';

  if (code === 'P2021' || message.includes('does not exist') || message.includes('relation')) {
    return 'DATABASE_SCHEMA_MISSING';
  }
  if (code === 'P2002') return 'DATABASE_CONSTRAINT_FAILED';
  if (
    code.startsWith('P10') ||
    message.includes('42P05') ||
    message.includes('prepared statement') ||
    message.includes('authentication failed') ||
    message.includes('connection') ||
    message.includes('ECONN') ||
    message.includes('certificate')
  ) {
    return 'DATABASE_CONNECTION_FAILED';
  }
  if (message.includes('Google token exchange failed')) return 'GOOGLE_TOKEN_EXCHANGE_FAILED';
  if (message.includes('Google profile fetch failed')) return 'GOOGLE_PROFILE_FAILED';
  if (stage === 'profile_validation') return 'GOOGLE_PROFILE_INVALID';
  if (stage === 'user_bootstrap') return code === 'P2002' ? 'USER_CONFLICT' : 'USER_BOOTSTRAP_FAILED';
  if (stage === 'agency_bootstrap') return 'AGENCY_BOOTSTRAP_FAILED';
  if (stage === 'membership_bootstrap') return 'MEMBERSHIP_BOOTSTRAP_FAILED';
  if (stage === 'wallet_bootstrap') return 'WALLET_BOOTSTRAP_FAILED';
  if (stage === 'session_creation') return 'SESSION_CREATION_FAILED';
  if (stage === 'audit_write') return 'AUDIT_WRITE_FAILED';
  return 'GOOGLE_LOGIN_FAILED';
}

function randomPasswordHash() {
  return hashPassword(randomBytes(32).toString('base64url'));
}

async function ensureGoogleIdentity(input: {
  tx: Prisma.TransactionClient;
  email: string;
  profile: GoogleProfile;
  setStage: (stage: GoogleCallbackStage) => void;
}) {
  input.setStage('user_bootstrap');
  const user = await input.tx.user.upsert({
    where: { email: input.email },
    update: {
      name: input.profile.name ?? undefined,
      isActive: true,
    },
    create: {
      name: input.profile.name ?? input.email.split('@')[0],
      email: input.email,
      passwordHash: randomPasswordHash(),
    },
    include: {
      memberships: {
        include: { agency: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  input.setStage('agency_bootstrap');
  const existingAgency = user.memberships[0]?.agency ?? await input.tx.agency.findUnique({
    where: { email: input.email },
  });
  const agency = existingAgency ?? await input.tx.agency.create({
    data: {
      name: input.profile.name ? `${input.profile.name}'s Agency` : input.email.split('@')[0],
      email: input.email,
      status: 'DRAFT',
    },
  });

  input.setStage('membership_bootstrap');
  await input.tx.agencyMembership.upsert({
    where: {
      userId_agencyId: {
        userId: user.id,
        agencyId: agency.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: user.id,
      agencyId: agency.id,
      role: 'AGENCY_OWNER',
      isDefault: true,
    },
  });

  input.setStage('wallet_bootstrap');
  await input.tx.wallet.upsert({
    where: {
      agencyId_currency: {
        agencyId: agency.id,
        currency: 'INR',
      },
    },
    update: {},
    create: {
      agencyId: agency.id,
      currency: 'INR',
    },
  });

  return { user, agency };
}

export async function GET(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex');
  let stage: GoogleCallbackStage = 'state_validation';
  const setStage = (nextStage: GoogleCallbackStage) => {
    stage = nextStage;
  };
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
    setStage('token_exchange');
    logGoogleStage('authorization_code_exchange_started');
    const token = await exchangeGoogleCode({ code, origin: url.origin });
    logGoogleStage('authorization_code_exchange_succeeded');

    setStage('profile_fetch');
    logGoogleStage('google_profile_fetch_started');
    const profile = await fetchGoogleProfile(token.access_token);
    const email = profile.email?.trim().toLowerCase();
    logGoogleStage('google_profile_fetch_succeeded', {
      hasEmail: Boolean(email),
      emailVerified: Boolean(profile.email_verified),
    });

    setStage('profile_validation');
    if (!email || !profile.email_verified) {
      logGoogleStage('email_verification_failed', {
        hasEmail: Boolean(email),
        emailVerified: Boolean(profile.email_verified),
      });
      return redirectToLogin(request, 'GOOGLE_EMAIL_NOT_VERIFIED');
    }

    const isAdminEmail = isBootstrapAdminEmail(email);
    logGoogleStage('database_user_lookup_started', { isAdminEmail });
    const existingUser = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { agency: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    const needsBootstrap = !existingUser || !existingUser.memberships[0]?.agency;
    setStage('identity_transaction');
    const identity = needsBootstrap
      ? await db.$transaction((tx) => ensureGoogleIdentity({ tx, email, profile, setStage }))
      : { user: existingUser, agency: existingUser.memberships[0].agency };
    const result = { ...identity, created: !existingUser };
    logGoogleStage('database_user_lookup_succeeded', {
      created: result.created,
      hasAgency: Boolean(result.agency),
      isAdminEmail,
    });

    setStage('session_creation');
    logGoogleStage('session_creation_started');
    await createSession(result.user.id);
    logGoogleStage('session_creation_succeeded');

    after(async () => {
      try {
        await auditLog({
          agencyId: result.agency?.id,
          actorUserId: result.user.id,
          action: result.created ? 'GOOGLE_SIGNUP' : 'GOOGLE_LOGIN',
          resourceType: 'User',
          resourceId: result.user.id,
          metadata: { emailVerified: true, adminEmail: isAdminEmail },
        });
        if (result.agency) {
          await queueTravelAgentCrmSync({ agencyId: result.agency.id, idempotencySuffix: requestId });
          await drainZohoCrmOutbox(5);
        }
      } catch (deferredError) {
        console.error('GOOGLE_AUTH_DEFERRED_WRITE_FAILED', {
          requestId,
          message: deferredError instanceof Error ? deferredError.message : 'Deferred write failed',
          prismaCode: prismaErrorCode(deferredError),
        });
      }
    });

    setStage('final_redirect');
    const destination = result.agency?.id ? `/${result.agency.id}` : '/dashboard';
    logGoogleStage('final_redirect', { destination, hasAdminAccess: isAdminEmail });
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    const code = googleErrorCode(error, stage);
    const meta = prismaErrorMeta(error);
    console.error('GOOGLE_AUTH_FAILED', {
      code,
      stage,
      requestId,
      message: error instanceof Error ? error.message : 'Unknown Google login error',
      prismaCode: prismaErrorCode(error),
      modelName: typeof meta?.modelName === 'string' ? meta.modelName : undefined,
      target: Array.isArray(meta?.target) ? meta.target.join(',') : typeof meta?.target === 'string' ? meta.target : undefined,
      googleStatus: typeof error === 'object' && error && 'googleStatus' in error ? String(error.googleStatus) : undefined,
      googleError: typeof error === 'object' && error && 'googleError' in error ? String(error.googleError) : undefined,
      googleErrorDescription: typeof error === 'object' && error && 'googleErrorDescription' in error ? String(error.googleErrorDescription) : undefined,
      redirectUri: typeof error === 'object' && error && 'redirectUri' in error ? String(error.redirectUri) : undefined,
    });
    return redirectToLogin(request, code);
  }
}
