import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { createSession, getSession } from '@/server/auth/session';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { auditLog } from '@/server/audit/audit-log';
import { isBootstrapAdminEmail } from '@/server/admin/permissions';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const BOOTSTRAP_LOCKOUT_MS = 15 * 60 * 1000;
const BOOTSTRAP_MAX_FAILURES = 5;

const bootstrapAttempts = globalThis as typeof globalThis & {
  vvisaAdminBootstrapAttempts?: Map<string, { failures: number; lockedUntil: number }>;
};

function getBootstrapAttemptStore() {
  if (!bootstrapAttempts.vvisaAdminBootstrapAttempts) {
    bootstrapAttempts.vvisaAdminBootstrapAttempts = new Map();
  }
  return bootstrapAttempts.vvisaAdminBootstrapAttempts;
}

function isBootstrapEnabled() {
  return process.env.ADMIN_BOOTSTRAP_LOGIN_ENABLED === 'true';
}

function verifyBootstrapSecret(password: string) {
  const configuredHash = process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH;
  if (configuredHash) return verifyPassword(password, configuredHash);

  const configuredPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  return Boolean(configuredPassword) && password === configuredPassword;
}

async function recordBootstrapFailure(input: { email: string; userId?: string | null; reason: string }) {
  const store = getBootstrapAttemptStore();
  const current = store.get(input.email) ?? { failures: 0, lockedUntil: 0 };
  const failures = current.failures + 1;
  const lockedUntil = failures >= BOOTSTRAP_MAX_FAILURES ? Date.now() + BOOTSTRAP_LOCKOUT_MS : current.lockedUntil;
  store.set(input.email, { failures, lockedUntil });

  await auditLog({
    actorUserId: input.userId ?? null,
    action: 'ADMIN_BOOTSTRAP_LOGIN_FAILED',
    resourceType: 'User',
    resourceId: input.email,
    metadata: {
      reason: input.reason,
      failures,
      locked: lockedUntil > Date.now(),
    },
  });
}

function clearBootstrapFailures(email: string) {
  getBootstrapAttemptStore().delete(email);
}

function isBootstrapLocked(email: string) {
  const attempt = getBootstrapAttemptStore().get(email);
  return Boolean(attempt && attempt.lockedUntil > Date.now());
}

export async function GET() {
  const session = await getSession();
  if (!session) return apiError('AUTH_REQUIRED', 'Authentication required', 401);

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    agency: session.activeMembership?.agency ?? null,
    role: session.role,
  });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('INVALID_INPUT', 'Email and password are required', 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const isAdminBootstrapCandidate = isBootstrapAdminEmail(email);

    let user = await db.user.findUnique({
      where: { email },
      include: { memberships: { include: { agency: true } } },
    });

    let isAdminBootstrapLogin = false;
    if (isAdminBootstrapCandidate && !user) {
      if (!isBootstrapEnabled()) {
        await recordBootstrapFailure({ email, reason: 'bootstrap_disabled' });
        return apiError('AUTH_REQUIRED', 'Invalid credentials', 401);
      }
      if (isBootstrapLocked(email)) {
        await recordBootstrapFailure({ email, reason: 'bootstrap_locked' });
        return apiError('AUTH_REQUIRED', 'Invalid credentials', 401);
      }
      if (!verifyBootstrapSecret(parsed.data.password)) {
        await recordBootstrapFailure({ email, reason: 'invalid_bootstrap_secret' });
        return apiError('AUTH_REQUIRED', 'Invalid credentials', 401);
      }

      isAdminBootstrapLogin = true;
      user = await db.user.create({
        data: {
          name: 'VVisa Admin',
          email,
          passwordHash: hashPassword(parsed.data.password),
        },
        include: { memberships: { include: { agency: true } } },
      });
    }

    const passwordAccepted = user ? verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (user && isAdminBootstrapCandidate && !passwordAccepted && !isAdminBootstrapLogin) {
      if (!isBootstrapEnabled()) {
        await recordBootstrapFailure({ email, userId: user.id, reason: 'bootstrap_disabled' });
      } else if (isBootstrapLocked(email)) {
        await recordBootstrapFailure({ email, userId: user.id, reason: 'bootstrap_locked' });
      } else if (verifyBootstrapSecret(parsed.data.password)) {
        isAdminBootstrapLogin = true;
      } else {
        await recordBootstrapFailure({ email, userId: user.id, reason: 'invalid_bootstrap_secret' });
      }
    }

    if (!user || (!passwordAccepted && !isAdminBootstrapLogin)) {
      return apiError('AUTH_REQUIRED', 'Invalid credentials', 401);
    }
    if (isAdminBootstrapLogin) clearBootstrapFailures(email);

    await createSession(user.id);
    const membership = user.memberships[0] ?? null;

    await auditLog({
      agencyId: membership?.agencyId,
      actorUserId: user.id,
      action: isAdminBootstrapLogin ? 'ADMIN_BOOTSTRAP_LOGIN' : 'LOGIN',
      resourceType: 'User',
      resourceId: user.id,
      metadata: isAdminBootstrapLogin ? { adminBootstrap: true } : undefined,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      agency: membership?.agency ?? null,
      role: membership?.role ?? null,
      message: 'Login successful',
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Invalid request body', 400);
  }
}
