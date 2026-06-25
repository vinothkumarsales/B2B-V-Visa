import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockTransactions } from '@/lib/mock-data';
import { requireAgencyMembership } from '@/server/auth/session';
import { getWalletBalanceMinor } from '@/server/wallet/wallet-ledger';

const listSchema = z.object({
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const parsed = listSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid wallet parameters', 400);

  const { type = '', page, limit } = parsed.data;

  if (isDemoMode) {
    const filtered = type ? mockTransactions.filter((txn) => txn.type === type) : mockTransactions;
    const start = (page - 1) * limit;
    return NextResponse.json({
      transactions: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      balance: mockTransactions.reduce((sum, txn) => sum + txn.amount, 0),
      mode: 'demo',
    });
  }

  const session = await requireAgencyMembership();
  const wallet = await db.wallet.findUnique({
    where: { agencyId_currency: { agencyId: session.agencyId, currency: 'INR' } },
  });

  const entries = wallet
    ? await db.walletLedgerEntry.findMany({
        where: {
          walletId: wallet.id,
          ...(type ? { type: type as never } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })
    : [];

  const balanceMinor = await getWalletBalanceMinor(session.agencyId);

  return NextResponse.json({
    transactions: entries,
    total: entries.length,
    page,
    limit,
    balanceMinor,
    balance: balanceMinor / 100,
  });
}

export async function POST() {
  return apiError(
    'PAYMENT_NOT_CONFIRMED',
    'Wallet credits must be created through a verified payment order and signed webhook',
    405
  );
}
