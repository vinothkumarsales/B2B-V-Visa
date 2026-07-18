import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { adminApplicationSubmitSchema, submitApplicationOnBehalf } from '@/server/admin/applications-on-behalf';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminMutation('application.submit_on_behalf', 'ADMIN_APPLICATION_ON_BEHALF_ENABLED');
    const parsed = adminApplicationSubmitSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('CONFIRMATION_REQUIRED', 'Type SUBMIT and provide a reason to confirm.', 400);
    const { id } = await params;
    const application = await submitApplicationOnBehalf({ applicationId: id, adminUid: admin.user.id, payload: parsed.data });
    await writeAdminAudit({ permission: 'application.submit_on_behalf', action: 'APPLICATION_SUBMITTED_ON_BEHALF', entityType: 'VisaApplication', entityId: application.id, partnerUid: application.agencyId, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, impersonationSessionId: parsed.data.supportSessionId, beforeData: { status: 'DRAFT' }, afterData: { status: application.status, submittedAt: application.submittedAt } });
    return NextResponse.json({ application });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
