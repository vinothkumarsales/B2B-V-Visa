import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';

export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation('partner.impersonate', 'ADMIN_PARTNER_SUPPORT_ENABLED');
    const body = await request.json().catch(() => null) as { sessionId?: string } | null;
    if (!body?.sessionId) return apiError('INVALID_INPUT', 'Support session ID is required.', 400);
    const existing = await db.adminImpersonationSession.findFirst({ where: { id: body.sessionId, actorAdminUid: admin.user.id, status: 'active' } });
    if (!existing) return apiError('RESOURCE_NOT_FOUND', 'Active support session not found.', 404);
    const session = await db.adminImpersonationSession.update({ where: { id: existing.id }, data: { status: 'ended', endedAt: new Date() } });
    await writeAdminAudit({ permission: 'partner.impersonate', action: 'PARTNER_SUPPORT_SESSION_ENDED', entityType: 'AdminImpersonationSession', entityId: session.id, partnerUid: session.subjectAgencyId, reason: session.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId });
    return NextResponse.json({ ended: true });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
