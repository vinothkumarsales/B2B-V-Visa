import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { documentStatusSchema } from '@/server/admin/workflow-schemas';
import { requireActiveSupportSession } from '@/server/admin/support-session';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminMutation('document.write', 'ADMIN_DOCUMENT_WRITES_ENABLED');
    const parsed = documentStatusSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid document update.', 400);
    const { id } = await params;
    const before = await db.applicationDocument.findUnique({ where: { id } });
    if (!before) return apiError('RESOURCE_NOT_FOUND', 'Document not found.', 404);
    if (parsed.data.supportSessionId) await requireActiveSupportSession({ sessionId: parsed.data.supportSessionId, adminUid: admin.user.id, partnerUid: before.agencyId, minimumMode: 'support' });
    const document = await db.applicationDocument.update({ where: { id }, data: { status: parsed.data.status } });
    await writeAdminAudit({ permission: 'document.write', action: parsed.data.status === 'REQUESTED' ? 'DOCUMENT_REPLACEMENT_REQUESTED' : 'DOCUMENT_STATUS_UPDATED', entityType: 'ApplicationDocument', entityId: id, partnerUid: before.agencyId, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, impersonationSessionId: parsed.data.supportSessionId, beforeData: { status: before.status }, afterData: { status: document.status } });
    return NextResponse.json({ document });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
