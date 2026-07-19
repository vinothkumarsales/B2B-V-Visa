import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockTransactions } from '@/lib/mock-data';
import { requireAgencyMembership } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit-log';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';
import { createLedgerEntry, getWalletBalanceMinor } from '@/server/wallet/wallet-ledger';

const listSchema = z.object({
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const walletPaymentSchema = z.object({
  applicationId: z.string().min(1),
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

export async function POST(request: NextRequest) {
  try {
    const parsed = walletPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid wallet payment request', 400);

    const session = await requireAgencyMembership([
      'AGENCY_OWNER',
      'AGENCY_ADMIN',
      'AGENCY_FINANCE',
      'AGENCY_OPERATOR',
    ]);

    const application = await db.visaApplication.findFirst({
      where: { id: parsed.data.applicationId, agencyId: session.agencyId },
    });
    if (!application) return apiError('RESOURCE_NOT_FOUND', 'Application not found', 404);
    if (application.status === 'PAID') {
      const balanceMinor = await getWalletBalanceMinor(session.agencyId, application.currency);
      return NextResponse.json({ ok: true, alreadyPaid: true, balanceMinor, balance: balanceMinor / 100 });
    }

    const balanceMinor = await getWalletBalanceMinor(session.agencyId, application.currency);
    if (balanceMinor < application.totalAmountMinor) {
      return apiError('PAYMENT_NOT_CONFIRMED', 'Insufficient wallet balance. Use Pay Now or add funds.', 409);
    }

    const paymentOrder = await db.paymentOrder.upsert({
      where: { idempotencyKey: `wallet-payment:${application.id}` },
      update: { status: 'CONFIRMED' },
      create: {
        agencyId: session.agencyId,
        applicationId: application.id,
        amountMinor: application.totalAmountMinor,
        currency: application.currency,
        status: 'CONFIRMED',
        idempotencyKey: `wallet-payment:${application.id}`,
      },
    });

    await db.visaApplication.update({
      where: { id: application.id },
      data: { status: 'PAID' },
    });

    await db.paymentTransaction.create({
      data: {
        paymentOrderId: paymentOrder.id,
        providerPaymentId: `wallet:${paymentOrder.id}`,
        amountMinor: application.totalAmountMinor,
        currency: application.currency,
        status: 'CONFIRMED',
        rawWebhook: { source: 'wallet' },
      },
    }).catch(() => null);

    await createLedgerEntry({
      agencyId: session.agencyId,
      paymentOrderId: paymentOrder.id,
      applicationId: application.id,
      type: 'APPLICATION_DEBIT',
      amountMinor: -application.totalAmountMinor,
      currency: application.currency,
      idempotencyKey: `wallet:application-payment:${application.id}`,
      description: 'Application payment from wallet',
    }).catch(() => null);

    await db.visaInterest.updateMany({
      where: {
        agencyId: session.agencyId,
        applicationId: application.id,
        status: { notIn: ['CONVERTED', 'EXPIRED', 'CANCELLED'] },
      },
      data: {
        status: 'PAID',
        paymentOrderId: paymentOrder.id,
        lastActivityAt: new Date(),
      },
    });

    await queueZohoCrmEvent({
      agencyId: session.agencyId,
      eventType: 'TRANSACTION_CREATE',
      idempotencyKey: `zoho-crm:wallet-payment-confirmed:${paymentOrder.id}`,
      entityType: 'PaymentOrder',
      entityId: paymentOrder.id,
      aggregateId: application.id,
      payload: { paymentOrderId: paymentOrder.id, applicationId: application.id },
    });

    await queueZohoCrmEvent({
      agencyId: session.agencyId,
      eventType: 'LEAD_CONVERT',
      idempotencyKey: `zoho-crm:wallet-lead-convert:${paymentOrder.id}`,
      entityType: 'VisaApplication',
      entityId: application.id,
      aggregateId: application.id,
      payload: { paymentOrderId: paymentOrder.id, applicationId: application.id },
    });

    await queueZohoCrmEvent({
      agencyId: session.agencyId,
      eventType: 'ZOHO_BOOKS_PAYMENT_SYNC',
      idempotencyKey: `zoho-books:wallet-payment:${paymentOrder.id}`,
      entityType: 'PaymentOrder',
      entityId: paymentOrder.id,
      aggregateId: application.id,
      payload: { paymentOrderId: paymentOrder.id, applicationId: application.id, source: 'wallet' },
    });

    await auditLog({
      agencyId: session.agencyId,
      actorUserId: session.user.id,
      action: 'APPLICATION_WALLET_PAYMENT_CONFIRMED',
      resourceType: 'VisaApplication',
      resourceId: application.id,
      metadata: { paymentOrderId: paymentOrder.id, amountMinor: application.totalAmountMinor },
    });

    const nextBalanceMinor = await getWalletBalanceMinor(session.agencyId, application.currency);
    return NextResponse.json({
      ok: true,
      paymentOrder,
      balanceMinor: nextBalanceMinor,
      balance: nextBalanceMinor / 100,
    });
  } catch {
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to process wallet payment', 503);
  }
}
