import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { getPartnerDashboardPreview } from '@/server/admin/read-preview';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdmin('dashboard.read');
    const { uid } = await params;
    const preview = await getPartnerDashboardPreview(uid);
    if (!preview) return apiError('RESOURCE_NOT_FOUND', 'Partner not found', 404);
    return NextResponse.json({ preview });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
