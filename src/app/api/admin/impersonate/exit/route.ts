import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { auditLog } from '@/server/audit/audit-log';
import { IMPERSONATION_COOKIE, parseImpersonationCookie } from '../route';

export async function POST(_request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE)?.value;

    if (!impersonationCookie) {
      return apiError('RESOURCE_NOT_FOUND', 'No active impersonation session found', 404);
    }

    const impersonation = parseImpersonationCookie(impersonationCookie);
    if (!impersonation) {
      // Malformed cookie — clear it anyway
      cookieStore.delete(IMPERSONATION_COOKIE);
      return apiError('INVALID_INPUT', 'Invalid impersonation session data', 400);
    }

    const headerStore = await headers();
    const ipAddress =
      headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? null;
    const userAgent = headerStore.get('user-agent') ?? null;

    // Update DB session record
    await db.adminImpersonationSession.update({
      where: { id: impersonation.sessionId },
      data: {
        endedAt: new Date(),
        status: 'ended',
      },
    }).catch(() => {
      // Session record may have expired — not fatal
    });

    await auditLog({
      agencyId: impersonation.targetAgencyId,
      actorUserId: admin.user.id,
      action: 'ADMIN_IMPERSONATION_ENDED',
      resourceType: 'Agency',
      resourceId: impersonation.targetAgencyId,
      metadata: {
        impersonationSessionId: impersonation.sessionId,
        targetVvisaUid: impersonation.targetVvisaUid,
        targetAgencyName: impersonation.targetAgencyName,
        actorRole: admin.role,
      },
      ipAddress,
      userAgent,
    });

    // Clear the impersonation cookie
    cookieStore.delete(IMPERSONATION_COOKIE);

    return NextResponse.json({
      success: true,
      redirectUrl: '/admin/partners',
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('IMPERSONATE_EXIT_ERROR', error);
    // Always clear cookie on error
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to end impersonation session' } },
      { status: 500 },
    );
  }
}
