import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdmin('partner.read');
    const { uid } = await params;
    const agency = await db.agency.findUnique({ where: { id: uid } });
    if (!agency) return apiError('RESOURCE_NOT_FOUND', 'Partner not found.', 404);

    const [applications, wallet] = await Promise.all([
      db.visaApplication.findMany({
        where: { agencyId: agency.id },
        include: { applicants: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.wallet.findUnique({
        where: { agencyId_currency: { agencyId: agency.id, currency: 'INR' } },
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
      user: { id: admin.user.id, name: admin.user.name, email: admin.user.email, adminViewingPartner: true },
      agency,
      role: 'VVISAS_ADMIN',
      applications,
      transactions: wallet?.entries ?? [],
      walletBalanceMinor: balance?._sum.amountMinor ?? 0,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to load the partner workspace for admin support.', 500);
  }
}
