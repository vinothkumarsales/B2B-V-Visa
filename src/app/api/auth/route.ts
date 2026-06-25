import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockAgency } from '@/lib/mock-data';
import { createSession, getSession } from '@/server/auth/session';
import { verifyPassword } from '@/server/auth/password';
import { auditLog } from '@/server/audit/audit-log';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function GET() {
  if (isDemoMode) {
    return NextResponse.json({ user: mockAgency, agency: mockAgency, mode: 'demo' });
  }

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

    if (isDemoMode) {
      return NextResponse.json({
        user: mockAgency,
        agency: mockAgency,
        mode: 'demo',
        message: 'Demo login successful',
      });
    }

    const user = await db.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { memberships: { include: { agency: true } } },
    });

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return apiError('AUTH_REQUIRED', 'Invalid credentials', 401);
    }

    await createSession(user.id);
    const membership = user.memberships[0] ?? null;

    await auditLog({
      agencyId: membership?.agencyId,
      actorUserId: user.id,
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: user.id,
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
