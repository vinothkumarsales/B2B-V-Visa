import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { careersFeatureEnabled } from './feature-flags';
import { decideCareerPaymentWebhookTransition, isRawWebhookBodyTooLarge } from './payment-webhook-policy';
import type { CareersWebhookDecision } from './payment-webhook-policy';
import { resolveCareersPaymentWebhookProvider } from './payment-webhook-provider';
import type { CareersPaymentWebhookEvent } from './payment-webhook-provider';

export type ProcessCareerPaymentWebhookInput = {
  providerId: string;
  rawBody: string;
  headers: Headers;
};

export async function processCareerPaymentWebhook(input: ProcessCareerPaymentWebhookInput) {
  if (!careersFeatureEnabled('CAREERS_PAYMENT_WEBHOOKS_ENABLED')) {
    throw apiError('FORBIDDEN', 'Careers payment webhooks are disabled.', 403);
  }
  if (isRawWebhookBodyTooLarge(input.rawBody)) {
    throw apiError('INVALID_INPUT', 'Careers payment webhook payload is too large.', 413);
  }

  const provider = resolveCareersPaymentWebhookProvider(input.providerId);
  const event = await provider.verifyAndParse({ rawBody: input.rawBody, headers: input.headers });
  const payloadChecksum = checksum(input.rawBody);

  const duplicate = await db.careerPaymentWebhookEvent.findUnique({
    where: { provider_providerEventId: { provider: event.provider, providerEventId: event.providerEventId } },
  });
  if (duplicate) {
    await auditWebhook('career_payment_webhook_duplicate', event, duplicate.paymentIntentId, {
      processingStatus: duplicate.processingStatus,
      duplicate: true,
    });
    return { ok: true, duplicate: true, processingStatus: duplicate.processingStatus };
  }

  const paymentIntent = await findPaymentIntent(event);
  if (!paymentIntent) {
    const record = await createWebhookRecord(event, payloadChecksum, {
      processingStatus: 'rejected',
      signatureVerified: true,
      failureCode: 'payment_intent_not_found',
      failureMessageSafe: 'Payment intent was not found for the verified webhook event.',
    });
    await auditWebhook('career_payment_webhook_rejected', event, null, {
      processingStatus: record.processingStatus,
      failureCode: record.failureCode,
    });
    return { ok: true, processingStatus: record.processingStatus, failureCode: record.failureCode };
  }

  const referenceFailure = validateProviderReference(event, paymentIntent);
  const snapshotFailure = validatePricingSnapshot(event, paymentIntent.pricingSnapshot);
  const decision = referenceFailure ?? snapshotFailure ?? decideCareerPaymentWebhookTransition({
    currentStatus: paymentIntent.status,
    eventType: event.eventType,
    currentAmountMinor: paymentIntent.amountMinor,
    currentCurrency: paymentIntent.currency,
    eventAmountMinor: event.amountMinor,
    eventCurrency: event.currency,
  });

  try {
    const result = await db.$transaction(async (tx) => {
      const record = await tx.careerPaymentWebhookEvent.create({
        data: webhookRecordData(event, payloadChecksum, {
          paymentIntentId: paymentIntent.id,
          processingStatus: decision.status,
          signatureVerified: true,
          failureCode: decision.failureCode,
          failureMessageSafe: decision.failureMessageSafe,
        }),
      });

      if (decision.status === 'processed' && decision.nextStatus) {
        await tx.careerPaymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            status: decision.nextStatus,
            providerPaymentId: event.providerPaymentId ?? paymentIntent.providerPaymentId,
            failureCode: null,
            failureMessageSafe: null,
          },
        });
      }

      return record;
    });

    await auditWebhook(auditActionForDecision(decision), event, paymentIntent.id, {
      processingStatus: result.processingStatus,
      failureCode: result.failureCode,
      nextStatus: decision.nextStatus,
    });
    return { ok: true, processingStatus: result.processingStatus, failureCode: result.failureCode };
  } catch (error) {
    if (isUniqueProviderEventError(error)) {
      return { ok: true, duplicate: true, processingStatus: 'duplicate' };
    }
    throw error;
  }
}

function findPaymentIntent(event: CareersPaymentWebhookEvent) {
  if (event.metadata.paymentIntentId) {
    return db.careerPaymentIntent.findUnique({ where: { id: event.metadata.paymentIntentId } });
  }
  if (event.providerCheckoutId) {
    return db.careerPaymentIntent.findFirst({
      where: { provider: event.provider, providerCheckoutId: event.providerCheckoutId },
    });
  }
  if (event.providerPaymentIntentId) {
    return db.careerPaymentIntent.findFirst({
      where: { provider: event.provider, providerPaymentIntentId: event.providerPaymentIntentId },
    });
  }
  if (event.providerPaymentId) {
    return db.careerPaymentIntent.findFirst({
      where: { provider: event.provider, providerPaymentId: event.providerPaymentId },
    });
  }
  return null;
}

function validateProviderReference(
  event: CareersPaymentWebhookEvent,
  paymentIntent: {
    provider: string;
    providerCheckoutId: string | null;
    providerPaymentIntentId: string | null;
    providerPaymentId: string | null;
  },
): CareersWebhookDecision | null {
  if (paymentIntent.provider !== event.provider) {
    return rejection('provider_reference_mismatch', 'Webhook provider does not match the payment intent.');
  }
  if (event.providerCheckoutId && paymentIntent.providerCheckoutId && event.providerCheckoutId !== paymentIntent.providerCheckoutId) {
    return rejection('provider_reference_mismatch', 'Webhook checkout reference does not match the payment intent.');
  }
  if (event.providerPaymentIntentId && paymentIntent.providerPaymentIntentId && event.providerPaymentIntentId !== paymentIntent.providerPaymentIntentId) {
    return rejection('provider_reference_mismatch', 'Webhook provider intent reference does not match the payment intent.');
  }
  if (event.providerPaymentId && paymentIntent.providerPaymentId && event.providerPaymentId !== paymentIntent.providerPaymentId) {
    return rejection('provider_reference_mismatch', 'Webhook payment reference does not match the payment intent.');
  }
  return null;
}

function validatePricingSnapshot(event: CareersPaymentWebhookEvent, pricingSnapshot: Prisma.JsonValue): CareersWebhookDecision | null {
  if (!pricingSnapshot || typeof pricingSnapshot !== 'object' || Array.isArray(pricingSnapshot)) return null;
  const snapshot = pricingSnapshot as Record<string, unknown>;
  if (event.amountMinor != null && typeof snapshot.amountMinor === 'number' && event.amountMinor !== snapshot.amountMinor) {
    return rejection('amount_mismatch', 'Webhook amount does not match the pricing snapshot.');
  }
  if (event.currency && typeof snapshot.currency === 'string' && event.currency !== snapshot.currency) {
    return rejection('currency_mismatch', 'Webhook currency does not match the pricing snapshot.');
  }
  return null;
}

function createWebhookRecord(
  event: CareersPaymentWebhookEvent,
  payloadChecksum: string,
  result: {
    paymentIntentId?: string | null;
    processingStatus: string;
    signatureVerified: boolean;
    failureCode?: string | null;
    failureMessageSafe?: string | null;
  },
) {
  return db.careerPaymentWebhookEvent.create({
    data: webhookRecordData(event, payloadChecksum, result),
  });
}

function webhookRecordData(
  event: CareersPaymentWebhookEvent,
  payloadChecksum: string,
  result: {
    paymentIntentId?: string | null;
    processingStatus: string;
    signatureVerified: boolean;
    failureCode?: string | null;
    failureMessageSafe?: string | null;
  },
) {
  return {
    provider: event.provider,
    providerEventId: event.providerEventId,
    eventType: event.eventType,
    paymentIntentId: result.paymentIntentId ?? null,
    providerCheckoutId: event.providerCheckoutId ?? null,
    providerPaymentIntentId: event.providerPaymentIntentId ?? null,
    providerPaymentId: event.providerPaymentId ?? null,
    amountMinor: event.amountMinor ?? null,
    currency: event.currency ?? null,
    occurredAt: event.occurredAt,
    processingStatus: result.processingStatus,
    signatureVerified: result.signatureVerified,
    safeReference: event.safeReference ?? null,
    failureCode: result.failureCode ?? null,
    failureMessageSafe: result.failureMessageSafe ?? null,
    payloadChecksum,
  };
}

function rejection(failureCode: string, failureMessageSafe: string): CareersWebhookDecision {
  return { status: 'rejected' as const, failureCode, failureMessageSafe };
}

function checksum(rawBody: string) {
  return createHash('sha256').update(rawBody).digest('hex');
}

function isUniqueProviderEventError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function auditActionForDecision(decision: { status: string; failureCode?: string }) {
  if (decision.status === 'processed') return 'career_payment_state_updated';
  if (decision.status === 'ignored') return 'career_payment_webhook_duplicate';
  if (decision.failureCode === 'amount_mismatch') return 'career_payment_amount_mismatch';
  if (decision.failureCode === 'currency_mismatch') return 'career_payment_currency_mismatch';
  if (decision.failureCode === 'invalid_state_transition') return 'career_payment_transition_blocked';
  return 'career_payment_webhook_rejected';
}

async function auditWebhook(
  action: string,
  event: CareersPaymentWebhookEvent,
  paymentIntentId: string | null,
  metadata: Record<string, unknown>,
) {
  await auditLog({
    actorUserId: null,
    action,
    resourceType: 'CareerPaymentWebhookEvent',
    resourceId: paymentIntentId,
    metadata: {
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      paymentIntentId,
      ...metadata,
    },
  });
}
