import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { canStartSupportMode, validSupportReason } from '@/server/admin/support-session-policy';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation('partner.impersonate', 'ADMIN_PARTNER_SUPPORT_ENABLED');
    const body = await request.json().catch(() => null) as { partnerUid?: string; mode?: string; reason?: string } | null;
    const partnerUid = body?.partnerUid?.trim();
    const reason = body?.reason?.trim();
    if (!partnerUid || !validSupportReason(reason) || body?.mode !== 'view_only') return apiError('INVALID_INPUT', 'Partner UID, view-only mode, and a reason of 8 to 500 characters are required.', 400);
    if (!canStartSupportMode(admin.role, 'view_only')) return apiError('FORBIDDEN', 'Your admin role cannot start this support mode.', 403);
    const validatedReason = reason as string;
    const partner = await db.agency.findUnique({ where: { id: partnerUid }, select: { id: true } });
    if (!partner) return apiError('RESOURCE_NOT_FOUND', 'Partner not found.', 404);
    const headerStore = await headers();
    const session = await db.adminImpersonationSession.create({
      data: {
        actorAdminUid: admin.user.id,
        actorAdminEmail: admin.user.email,
        subjectAgencyId: partner.id,
        mode: 'view_only',
        reason: validatedReason,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ipAddress: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        userAgent: headerStore.get('user-agent'),
      },
    });
    await writeAdminAudit({ permission: 'partner.impersonate', action: 'PARTNER_SUPPORT_SESSION_STARTED', entityType: 'AdminImpersonationSession', entityId: session.id, partnerUid, reason: validatedReason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, afterData: { mode: session.mode, expiresAt: session.expiresAt } });
    return NextResponse.json({ session: { id: session.id, mode: session.mode, expiresAt: session.expiresAt } }, { status: 201 });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
