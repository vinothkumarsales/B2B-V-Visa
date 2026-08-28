import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { getSession } from '@/server/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiError('AUTH_REQUIRED', 'Authentication required', 401);

    if (!session.activeMembership || !session.activeAgencyId) {
      return NextResponse.json({
        user: { id: session.user.id, name: session.user.name, email: session.user.email },
        onboarded: false,
      });
    }

    const [applications, wallet] = await Promise.all([
      db.visaApplication.findMany({
        where: { agencyId: session.activeAgencyId },
        include: { applicants: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.wallet.findUnique({
        where: { agencyId_currency: { agencyId: session.activeAgencyId, currency: 'INR' } },
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
      agency: session.activeMembership.agency,
      role: session.role,
      onboarded: true,
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
