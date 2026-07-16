import { NextResponse } from 'next/server';
import { isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdmin('wallet.read');
    const { uid } = await params;
    const wallets = await db.wallet.findMany({ where: { agencyId: uid }, include: { entries: { orderBy: { createdAt: 'desc' }, take: 100 } } });
    return NextResponse.json({ wallets: wallets.map((wallet) => ({ ...wallet, balanceMinor: wallet.entries.reduce((sum, entry) => sum + entry.amountMinor, 0) })), adjustmentsEnabled: false });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
