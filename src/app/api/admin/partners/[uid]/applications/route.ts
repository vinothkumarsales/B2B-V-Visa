import { NextResponse } from 'next/server';
import { isApiResponse, apiError } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { adminApplicationDraftSchema, createApplicationDraftOnBehalf } from '@/server/admin/applications-on-behalf';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdmin('application.read');
    const { uid } = await params;
    const applications = await db.visaApplication.findMany({ where: { agencyId: uid }, orderBy: { createdAt: 'desc' }, include: { applicants: true, documents: true, pricingDetail: { include: { lines: true } } } });
    return NextResponse.json({ applications });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}

export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdminMutation('application.create_on_behalf', 'ADMIN_APPLICATION_ON_BEHALF_ENABLED');
    const { uid } = await params;
    const parsed = adminApplicationDraftSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid application draft.', 400);
    const application = await createApplicationDraftOnBehalf({ partnerUid: uid, adminUid: admin.user.id, payload: parsed.data });
    await writeAdminAudit({ permission: 'application.create_on_behalf', action: 'APPLICATION_DRAFT_CREATED_ON_BEHALF', entityType: 'VisaApplication', entityId: application.id, partnerUid: uid, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, impersonationSessionId: parsed.data.supportSessionId, afterData: { status: application.status, visaProductId: application.visaProductId, totalAmountMinor: application.totalAmountMinor } });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
