import { db } from '@/lib/db';

export async function getWalletBalanceMinor(agencyId: string, currency = 'INR') {
  const wallet = await db.wallet.findUnique({
    where: { agencyId_currency: { agencyId, currency } },
    include: { entries: true },
  });

  if (!wallet) return 0;
  return wallet.entries.reduce((sum, entry) => sum + entry.amountMinor, 0);
}

export async function getOrCreateWallet(agencyId: string, currency = 'INR') {
  return db.wallet.upsert({
    where: { agencyId_currency: { agencyId, currency } },
    update: {},
    create: { agencyId, currency },
  });
}

export async function createLedgerEntry(input: {
  agencyId: string;
  applicationId?: string;
  paymentOrderId?: string;
  type:
    | 'DEPOSIT_PENDING'
    | 'DEPOSIT_CONFIRMED'
    | 'APPLICATION_DEBIT'
    | 'APPLICATION_REVERSAL'
    | 'REFUND_CREDIT'
    | 'WITHDRAWAL_HOLD'
    | 'WITHDRAWAL_COMPLETED'
    | 'WITHDRAWAL_RELEASED'
    | 'MANUAL_ADJUSTMENT';
  amountMinor: number;
  currency?: string;
  idempotencyKey: string;
  description?: string;
}) {
  const currency = input.currency ?? 'INR';
  const wallet = await getOrCreateWallet(input.agencyId, currency);

  return db.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      applicationId: input.applicationId,
      paymentOrderId: input.paymentOrderId,
      type: input.type,
      amountMinor: input.amountMinor,
      currency,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
    },
  });
}
