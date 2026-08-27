import { NextResponse } from 'next/server';
import { isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { z } from 'zod';
import { auditLog } from '@/server/audit/audit-log';
import { createLedgerEntry } from '@/server/wallet/wallet-ledger';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdmin('wallet.read');
    const { uid } = await params;
    const wallets = await db.wallet.findMany({ where: { agencyId: uid }, include: { entries: { orderBy: { createdAt: 'desc' }, take: 100 } } });
    const canAdjust = admin.permissions.includes('wallet.adjust');
    return NextResponse.json({ wallets: wallets.map((wallet) => ({ ...wallet, balanceMinor: wallet.entries.reduce((sum, entry) => sum + entry.amountMinor, 0) })), adjustmentsEnabled: canAdjust });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}

const adjustmentSchema = z.object({
  amountMinor: z.number().int(),
  type: z.enum(['CREDIT', 'DEBIT']),
  reason: z.string().min(5).max(255),
});

export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdmin('wallet.adjust');
    const { uid } = await params;
    
    const parsed = adjustmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid adjustment payload', details: parsed.error.issues }, { status: 400 });
    }

    const { amountMinor, type, reason } = parsed.data;
    
    // Convert to actual ledger amount (Credit = positive, Debit = negative)
    const ledgerAmount = type === 'CREDIT' ? amountMinor : -amountMinor;

    const entry = await createLedgerEntry({
      agencyId: uid,
      type: 'MANUAL_ADJUSTMENT',
      amountMinor: ledgerAmount,
      idempotencyKey: `manual-adj-${admin.id}-${Date.now()}`,
      description: `[Admin Adjustment] ${reason}`,
    });

    await auditLog({
      agencyId: uid,
      actorUserId: admin.user.id,
      action: 'ADMIN_WALLET_ADJUSTMENT',
      resourceType: 'Wallet',
      resourceId: entry.walletId,
      metadata: {
        amountMinor: ledgerAmount,
        reason,
        transactionId: entry.id,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
