import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { getPartnerDashboardPreview } from '@/server/admin/read-preview';
import { writeAdminAudit } from '@/server/admin/write-guard';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdmin('dashboard.read');
    const { uid } = await params;
    const preview = await getPartnerDashboardPreview(uid);
    if (!preview) return apiError('RESOURCE_NOT_FOUND', 'Partner not found', 404);
    await writeAdminAudit({ permission: 'dashboard.read', action: 'PARTNER_DASHBOARD_PREVIEWED', entityType: 'Agency', entityId: uid, partnerUid: uid, reason: 'Admin opened partner dashboard preview', success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: crypto.randomUUID() });
    return NextResponse.json({ preview });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
