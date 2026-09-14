import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { apiError, isApiResponse } from '@/lib/api-response';
import { getReferralDetail } from '@/server/referrals/referral.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAgencyMembership();
    const { id } = await params;

    const referral = await getReferralDetail(id, session.agencyId);
    if (!referral) {
      return apiError('RESOURCE_NOT_FOUND', 'Referral not found', 404);
    }

    return NextResponse.json(referral);
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API/REFERRALS/[ID]] GET error:', error);
    return apiError('INVALID_INPUT', 'Failed to fetch referral details', 500);
  }
}
