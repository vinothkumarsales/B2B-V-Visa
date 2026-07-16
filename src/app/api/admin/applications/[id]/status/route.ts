import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { applicationStatusUpdateSchema } from '@/server/admin/workflow-schemas';
import { requireActiveSupportSession } from '@/server/admin/support-session';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminMutation('application.update', 'ADMIN_STATUS_WRITES_ENABLED');
    const parsed = applicationStatusUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid application status.', 400);
    const { id } = await params;
    const before = await db.visaApplication.findUnique({ where: { id } });
    if (!before) return apiError('RESOURCE_NOT_FOUND', 'Application not found.', 404);
    if (parsed.data.supportSessionId) await requireActiveSupportSession({ sessionId: parsed.data.supportSessionId, adminUid: admin.user.id, partnerUid: before.agencyId, minimumMode: 'operations' });
    const transition = await db.applicationStatusTransition.findFirst({ where: { fromStatusCode: before.status, toStatusCode: parsed.data.status, isActive: true } });
    if (!transition) return apiError('INVALID_ADMIN_MUTATION', 'This application status transition is not enabled.', 409);
    const application = await db.$transaction(async (tx) => {
      const updated = await tx.visaApplication.update({ where: { id }, data: { status: parsed.data.status, version: { increment: 1 } } });
      await tx.applicationStatusEvent.create({ data: { applicationId: id, previousStatus: before.status, nextStatus: parsed.data.status, actorUserId: admin.user.id, reason: parsed.data.reason } });
      return updated;
    });
    await writeAdminAudit({ permission: 'application.update', action: 'APPLICATION_STATUS_UPDATED', entityType: 'VisaApplication', entityId: id, partnerUid: before.agencyId, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, impersonationSessionId: parsed.data.supportSessionId, beforeData: { status: before.status }, afterData: { status: application.status } });
    return NextResponse.json({ application });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
