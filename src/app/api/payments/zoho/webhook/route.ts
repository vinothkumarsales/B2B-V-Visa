import { after, NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { createLedgerEntry } from '@/server/wallet/wallet-ledger';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';
import {
  isSuccessfulZohoPaymentStatus,
  parseZohoPaymentsWebhook,
  verifyZohoPaymentSuccess,
  verifyZohoPaymentsWebhook,
} from '@/server/integrations/zoho/payments';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-zoho-signature');

  if (!verifyZohoPaymentsWebhook(rawBody, signature)) {
    return apiError('FORBIDDEN', 'Invalid webhook signature', 403);
  }

  const event = parseZohoPaymentsWebhook(rawBody);

  const paymentOrder = await db.paymentOrder.findFirst({
    where: { providerOrderId: event.providerOrderId },
    include: { agency: true },
  });

  if (!paymentOrder) return apiError('RESOURCE_NOT_FOUND', 'Payment order not found', 404);

  const existing = await db.paymentTransaction.findUnique({ where: { webhookEventId: event.webhookEventId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const successfulWebhook = isSuccessfulZohoPaymentStatus(event.status);
  const verification = successfulWebhook
    ? await verifyZohoPaymentSuccess({
        paymentOrderId: paymentOrder.id,
        providerOrderId: event.providerOrderId,
        providerPaymentId: event.providerPaymentId,
        amountMinor: paymentOrder.amountMinor,
        currency: paymentOrder.currency,
      })
    : { verified: false, status: event.status, raw: event.raw };
  const confirmed = successfulWebhook && verification.verified;

  await db.$transaction(async (tx) => {
    await tx.paymentTransaction.create({
      data: {
        paymentOrderId: paymentOrder.id,
        providerPaymentId: event.providerPaymentId ?? verification.providerReference,
        webhookEventId: event.webhookEventId,
        amountMinor: paymentOrder.amountMinor,
        currency: paymentOrder.currency,
        status: confirmed ? verification.status : event.status || verification.status,
        rawWebhook: toJsonValue({
          webhook: event.raw,
          verification,
        }),
      },
    });

    if (confirmed) {
      await tx.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'CONFIRMED' },
      });
      if (paymentOrder.applicationId) {
        await tx.visaApplication.update({
          where: { id: paymentOrder.applicationId },
          data: { status: 'PAID' },
        });
        await tx.visaInterest.updateMany({
          where: {
            agencyId: paymentOrder.agencyId,
            applicationId: paymentOrder.applicationId,
            status: { notIn: ['CONVERTED', 'EXPIRED', 'CANCELLED'] },
          },
          data: {
            status: 'PAID',
            paymentOrderId: paymentOrder.id,
            lastActivityAt: new Date(),
          },
        });
      }
    } else if (successfulWebhook) {
      await tx.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'FAILED' },
      });
    }
  });

  if (confirmed) {
    await createLedgerEntry({
      agencyId: paymentOrder.agencyId,
      paymentOrderId: paymentOrder.id,
      applicationId: paymentOrder.applicationId ?? undefined,
      type: paymentOrder.applicationId ? 'APPLICATION_DEBIT' : 'DEPOSIT_CONFIRMED',
      amountMinor: paymentOrder.applicationId ? -paymentOrder.amountMinor : paymentOrder.amountMinor,
      currency: paymentOrder.currency,
      idempotencyKey: `wallet:zoho-payment:${event.webhookEventId}`,
      description: paymentOrder.applicationId ? 'Application payment confirmed' : 'Wallet top-up confirmed',
    });

    await queueZohoCrmEvent({
      agencyId: paymentOrder.agencyId,
      eventType: 'TRANSACTION_CREATE',
      idempotencyKey: `zoho-crm:payment-confirmed:${paymentOrder.id}`,
      entityType: 'PaymentOrder',
      entityId: paymentOrder.id,
      aggregateId: paymentOrder.applicationId ?? paymentOrder.id,
      payload: { paymentOrderId: paymentOrder.id, applicationId: paymentOrder.applicationId },
    });
    await queueZohoCrmEvent({
      agencyId: paymentOrder.agencyId,
      eventType: 'ZOHO_BOOKS_PAYMENT_SYNC',
      idempotencyKey: `zoho-books:payment-confirmed:${paymentOrder.id}`,
      entityType: 'PaymentOrder',
      entityId: paymentOrder.id,
      aggregateId: paymentOrder.applicationId ?? paymentOrder.id,
      payload: { paymentOrderId: paymentOrder.id, applicationId: paymentOrder.applicationId, source: 'zoho_payments' },
    });
    if (paymentOrder.applicationId) {
      await queueZohoCrmEvent({
        agencyId: paymentOrder.agencyId,
        eventType: 'LEAD_CONVERT',
        idempotencyKey: `zoho-crm:lead-convert:${paymentOrder.id}`,
        entityType: 'VisaApplication',
        entityId: paymentOrder.applicationId,
        aggregateId: paymentOrder.applicationId,
        payload: { paymentOrderId: paymentOrder.id, applicationId: paymentOrder.applicationId },
      });
    }
    after(async () => {
      try {
        await drainZohoCrmOutbox(10);
      } catch (error) {
        console.error('CRM_PAYMENT_DRAIN_FAILED', error instanceof Error ? error.message : 'CRM drain failed');
      }
    });
  }

  return NextResponse.json({
    ok: true,
    confirmed,
    status: confirmed ? verification.status : event.status,
    verificationReason: verification.reason,
  });
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
