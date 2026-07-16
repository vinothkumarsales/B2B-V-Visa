import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
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
