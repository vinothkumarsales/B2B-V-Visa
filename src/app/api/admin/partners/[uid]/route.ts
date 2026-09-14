import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { partnerProfileSchema } from '@/server/admin/workflow-schemas';
import { requireActiveSupportSession } from '@/server/admin/support-session';
import { db } from '@/lib/db';
import { getPartnerAdminProfile } from '@/server/admin/data';
import { apiError, isApiResponse } from '@/lib/api-response';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdmin('partner.read');
    const { uid } = await params;
    const partner = await getPartnerAdminProfile(uid);
    if (!partner) return apiError('RESOURCE_NOT_FOUND', 'Partner not found', 404);
    return NextResponse.json({ partner });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdminMutation('partner.write', 'ADMIN_PARTNER_WRITES_ENABLED');
    const { uid } = await params;
    const parsed = partnerProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid partner profile.', 400);
    if (admin.role === 'support_admin' || parsed.data.supportSessionId) await requireActiveSupportSession({ sessionId: parsed.data.supportSessionId, adminUid: admin.user.id, partnerUid: uid, minimumMode: 'support' });
    const before = await db.agency.findUnique({ where: { id: uid }, include: { verification: true, memberships: { include: { user: true }, take: 1 } } });
    if (!before) return apiError('RESOURCE_NOT_FOUND', 'Partner not found', 404);
    const { ownerName, kycStatus, supportSessionId, confirmation: _confirmation, reason, ...agencyData } = parsed.data;
    const partner = await db.$transaction(async (tx) => {
      const updated = await tx.agency.update({ where: { id: uid }, data: agencyData });
      if (ownerName && before.memberships[0]) await tx.user.update({ where: { id: before.memberships[0].userId }, data: { name: ownerName } });
      if (kycStatus) await tx.agencyVerification.upsert({ where: { agencyId: uid }, update: { status: kycStatus }, create: { agencyId: uid, status: kycStatus } });
      return updated;
    });
    await writeAdminAudit({ permission: 'partner.write', action: 'PARTNER_PROFILE_UPDATED', entityType: 'Agency', entityId: uid, partnerUid: uid, reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, impersonationSessionId: supportSessionId, beforeData: { ...before, memberships: undefined }, afterData: partner });
    return NextResponse.json({ partner });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
