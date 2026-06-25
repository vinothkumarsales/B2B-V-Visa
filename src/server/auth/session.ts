import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import type { MembershipRole } from '@prisma/client';

export const SESSION_COOKIE = 'vvisa_b2b_session';
const SESSION_DAYS = 14;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            include: { agency: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;

  const activeMembership = session.user.memberships[0] ?? null;
  return {
    id: session.id,
    user: session.user,
    activeMembership,
    activeAgencyId: activeMembership?.agencyId ?? null,
    role: activeMembership?.role ?? null,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw apiError('AUTH_REQUIRED', 'Authentication required', 401);
  return session;
}

export async function requireAgencyMembership(roles?: MembershipRole[]) {
  const session = await requireSession();
  if (!session.activeMembership || !session.activeAgencyId) {
    throw apiError('FORBIDDEN', 'No active agency membership', 403);
  }
  if (roles && !roles.includes(session.activeMembership.role)) {
    throw apiError('FORBIDDEN', 'Role does not permit this action', 403);
  }
  return {
    ...session,
    agencyId: session.activeAgencyId,
    agency: session.activeMembership.agency,
    role: session.activeMembership.role,
  };
}
