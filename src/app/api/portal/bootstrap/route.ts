import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAgencyMembership } from '@/server/auth/session';

export async function GET() {
  try {
    const session = await requireAgencyMembership();
    const [applications, wallet] = await Promise.all([
      db.visaApplication.findMany({
        where: { agencyId: session.agencyId },
        include: { applicants: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.wallet.findUnique({
        where: { agencyId_currency: { agencyId: session.agencyId, currency: 'INR' } },
        include: { entries: { orderBy: { createdAt: 'desc' }, take: 50 } },
      }),
    ]);

    const balance = wallet
      ? await db.walletLedgerEntry.aggregate({
          where: { walletId: wallet.id },
          _sum: { amountMinor: true },
        })
      : null;

    return NextResponse.json({
      user: { id: session.user.id, name: session.user.name, email: session.user.email },
      agency: session.agency,
      role: session.role,
      applications,
      transactions: wallet?.entries ?? [],
      walletBalanceMinor: balance?._sum.amountMinor ?? 0,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('PORTAL_BOOTSTRAP_FAILED', error instanceof Error ? error.message : 'Unknown error');
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to load the partner workspace.', 500);
  }
}
