import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { createLedgerEntry } from '@/server/wallet/wallet-ledger';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';
import { verifyZohoPaymentsWebhook } from '@/server/integrations/zoho/payments';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-zoho-signature');

  if (!verifyZohoPaymentsWebhook(rawBody, signature)) {
    return apiError('FORBIDDEN', 'Invalid webhook signature', 403);
  }

  const payload = JSON.parse(rawBody || '{}');
  const webhookEventId = String(payload.event_id ?? payload.id ?? '');
  const providerOrderId = String(payload.order_id ?? payload.providerOrderId ?? '');
  const providerPaymentId = String(payload.payment_id ?? payload.providerPaymentId ?? '');
  const status = String(payload.status ?? '').toUpperCase();

  if (!webhookEventId || !providerOrderId) {
    return apiError('INVALID_INPUT', 'Webhook is missing identifiers', 400);
  }

  const paymentOrder = await db.paymentOrder.findFirst({
    where: { providerOrderId },
    include: { agency: true },
  });

  if (!paymentOrder) return apiError('RESOURCE_NOT_FOUND', 'Payment order not found', 404);

  const existing = await db.paymentTransaction.findUnique({ where: { webhookEventId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  await db.$transaction(async (tx) => {
    await tx.paymentTransaction.create({
      data: {
        paymentOrderId: paymentOrder.id,
        providerPaymentId,
        webhookEventId,
        amountMinor: paymentOrder.amountMinor,
        currency: paymentOrder.currency,
        status,
        rawWebhook: payload,
      },
    });

    if (status === 'SUCCESS' || status === 'CONFIRMED' || status === 'PAID') {
      await tx.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'CONFIRMED' },
      });
    }
  });

  if (status === 'SUCCESS' || status === 'CONFIRMED' || status === 'PAID') {
    await createLedgerEntry({
      agencyId: paymentOrder.agencyId,
      paymentOrderId: paymentOrder.id,
      applicationId: paymentOrder.applicationId ?? undefined,
      type: paymentOrder.applicationId ? 'APPLICATION_DEBIT' : 'DEPOSIT_CONFIRMED',
      amountMinor: paymentOrder.applicationId ? -paymentOrder.amountMinor : paymentOrder.amountMinor,
      currency: paymentOrder.currency,
      idempotencyKey: `wallet:zoho-payment:${webhookEventId}`,
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
  }

  return NextResponse.json({ ok: true });
}
