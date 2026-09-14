import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { apiError, isApiResponse } from '@/lib/api-response';
import { creditReferralReward } from '@/server/referrals/referral.service';
import { auditLog } from '@/server/audit/audit-log';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin('wallet.adjust');
    const { id } = await params;

    const result = await creditReferralReward(id, admin.user.email || 'Admin');

    await auditLog({
      actorUserId: admin.user.id,
      action: 'REFERRAL_REWARD_CREDITED',
      resourceType: 'Referral',
      resourceId: id,
      metadata: {
        adminEmail: admin.user.email,
        referralId: id,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API/ADMIN/REFERRALS/REWARD] POST error:', error);
    return apiError('INVALID_INPUT', error instanceof Error ? error.message : 'Failed to credit referral reward', 500);
  }
}
