import { db } from '@/lib/db';

type DbClient = Parameters<Parameters<typeof db.$transaction>[0]>[0] | typeof db;

export async function getWalletBalanceMinor(agencyId: string, currency = 'INR', client: DbClient = db) {
  const wallet = await client.wallet.findUnique({
    where: { agencyId_currency: { agencyId, currency } },
    include: { entries: true },
  });

  if (!wallet) return 0;
  return wallet.entries.reduce((sum, entry) => sum + entry.amountMinor, 0);
}

export async function getOrCreateWallet(agencyId: string, currency = 'INR', client: DbClient = db) {
  return client.wallet.upsert({
    where: { agencyId_currency: { agencyId, currency } },
    update: {},
    create: { agencyId, currency },
  });
}

export async function createLedgerEntry(
  input: {
    agencyId: string;
    applicationId?: string;
    paymentOrderId?: string;
    referralId?: string;
    type:
      | 'DEPOSIT_PENDING'
      | 'DEPOSIT_CONFIRMED'
      | 'APPLICATION_DEBIT'
      | 'APPLICATION_REVERSAL'
      | 'REFUND_CREDIT'
      | 'WITHDRAWAL_HOLD'
      | 'WITHDRAWAL_COMPLETED'
      | 'WITHDRAWAL_RELEASED'
      | 'MANUAL_ADJUSTMENT'
      | 'REFERRAL_REWARD';
    amountMinor: number;
    currency?: string;
    idempotencyKey: string;
    description?: string;
  },
  client: DbClient = db,
) {
  const currency = input.currency ?? 'INR';
  const wallet = await getOrCreateWallet(input.agencyId, currency, client);

  return client.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      applicationId: input.applicationId,
      paymentOrderId: input.paymentOrderId,
      referralId: input.referralId,
      type: input.type,
      amountMinor: input.amountMinor,
      currency,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
    },
  });
}
