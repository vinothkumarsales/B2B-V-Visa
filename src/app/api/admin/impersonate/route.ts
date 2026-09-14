import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { auditLog } from '@/server/audit/audit-log';
import { isVvisaUid } from '@/lib/uid';

const IMPERSONATION_MAX_AGE_HOURS = 4;
export const IMPERSONATION_COOKIE = 'vvisa_admin_impersonation';

export type ImpersonationSessionData = {
  sessionId: string;
  targetAgencyId: string;
  targetVvisaUid: string;
  targetAgencyName: string;
  actorEmail: string;
  actorRole: string;
  startedAt: string;
  expiresAt: string;
};

export function parseImpersonationCookie(value: string): ImpersonationSessionData | null {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8');
    return JSON.parse(decoded) as ImpersonationSessionData;
  } catch {
    return null;
  }
}

const schema = z.object({
  uid: z.string().min(10).max(30),
  reason: z.string().min(1).max(500).default('Admin partner access'),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin('partner.impersonate');

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid UID', 400);
    }

    const { uid, reason } = parsed.data;

    // Validate UID format — VVA... or cuid fallback
    if (!isVvisaUid(uid) && !/^c[a-z0-9]{24}$/.test(uid)) {
      return apiError('INVALID_INPUT', `Invalid partner UID format: ${uid}`, 400);
    }

    // Find agency — try vvisaUid first, then id (cuid backward-compat)
    const agency = await db.agency.findFirst({
      where: { OR: [{ vvisaUid: uid }, { id: uid }] },
      select: { id: true, name: true, vvisaUid: true, email: true },
    });

    if (!agency) {
      return apiError('RESOURCE_NOT_FOUND', `No partner found with UID: ${uid}`, 404);
    }

    const headerStore = await headers();
    const ipAddress =
      headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? null;
    const userAgent = headerStore.get('user-agent') ?? null;
    const expiresAt = new Date(
      Date.now() + IMPERSONATION_MAX_AGE_HOURS * 60 * 60 * 1000,
    );

    // Create DB impersonation session record
    const impersonationSession = await db.adminImpersonationSession.create({
      data: {
        actorAdminUid: admin.user.id,
        actorAdminEmail: admin.user.email,
        subjectAgencyId: agency.id,
        mode: 'support',
        reason,
        expiresAt,
        status: 'active',
        ipAddress,
        userAgent,
      },
    });

    await auditLog({
      agencyId: agency.id,
      actorUserId: admin.user.id,
      action: 'ADMIN_IMPERSONATION_STARTED',
      resourceType: 'Agency',
      resourceId: agency.id,
      metadata: {
        impersonationSessionId: impersonationSession.id,
        targetVvisaUid: agency.vvisaUid ?? uid,
        targetAgencyName: agency.name,
        actorRole: admin.role,
        reason,
      },
      ipAddress,
      userAgent,
    });

    // Store impersonation context in secure httpOnly cookie
    const impersonationData: ImpersonationSessionData = {
      sessionId: impersonationSession.id,
      targetAgencyId: agency.id,
      targetVvisaUid: agency.vvisaUid ?? uid,
      targetAgencyName: agency.name,
      actorEmail: admin.user.email,
      actorRole: admin.role,
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, Buffer.from(JSON.stringify(impersonationData)).toString('base64'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: IMPERSONATION_MAX_AGE_HOURS * 60 * 60,
    });

    const targetUid = agency.vvisaUid ?? uid;
    return NextResponse.json({
      success: true,
      redirectUrl: `/${targetUid}/profile`,
      targetAgencyName: agency.name,
      targetVvisaUid: targetUid,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('IMPERSONATE_ERROR', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to start impersonation session' } },
      { status: 500 },
    );
  }
}
