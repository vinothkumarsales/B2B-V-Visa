import type { CareerPaymentIntentStatus } from '@prisma/client';
import type { CareersPaymentWebhookEvent } from './payment-webhook-provider';
import { canTransitionCareerPaymentIntent } from './payment-domain.ts';

export type CareersWebhookDecision = {
  status: 'processed' | 'rejected' | 'ignored';
  failureCode?: string;
  failureMessageSafe?: string;
  nextStatus?: CareerPaymentIntentStatus;
};

const terminalStatuses: CareerPaymentIntentStatus[] = ['paid', 'cancelled', 'expired'];

export function mapWebhookEventToPaymentStatus(eventType: CareersPaymentWebhookEvent['eventType']): CareerPaymentIntentStatus | null {
  if (eventType === 'checkout_created') return 'checkout_created';
  if (eventType === 'payment_authorised') return 'payment_pending';
  if (eventType === 'payment_captured') return 'paid';
  if (eventType === 'payment_failed') return 'failed';
  if (eventType === 'payment_cancelled') return 'cancelled';
  if (eventType === 'payment_expired') return 'expired';
  return null;
}

export function decideCareerPaymentWebhookTransition(input: {
  currentStatus: CareerPaymentIntentStatus;
  eventType: CareersPaymentWebhookEvent['eventType'];
  currentAmountMinor: number;
  currentCurrency: string;
  eventAmountMinor?: number | null;
  eventCurrency?: string | null;
}): CareersWebhookDecision {
  const nextStatus = mapWebhookEventToPaymentStatus(input.eventType);
  if (!nextStatus) {
    return reject('unsupported_event', 'Unsupported Careers payment webhook event.');
  }
  if (input.eventAmountMinor != null && input.eventAmountMinor !== input.currentAmountMinor) {
    return reject('amount_mismatch', 'Webhook amount does not match the payment intent.');
  }
  if (input.eventCurrency && input.eventCurrency !== input.currentCurrency) {
    return reject('currency_mismatch', 'Webhook currency does not match the payment intent.');
  }
  if (input.currentStatus === nextStatus) {
    return { status: 'ignored', nextStatus } satisfies CareersWebhookDecision;
  }
  if (terminalStatuses.includes(input.currentStatus)) {
    return reject('invalid_state_transition', 'Webhook cannot overwrite a terminal payment state.');
  }
  if (!canTransitionCareerPaymentIntent(input.currentStatus, nextStatus)) {
    return reject('invalid_state_transition', 'Webhook payment state transition is not allowed.');
  }
  return { status: 'processed', nextStatus } satisfies CareersWebhookDecision;
}

export function isRawWebhookBodyTooLarge(rawBody: string, limitBytes = 128 * 1024) {
  return Buffer.byteLength(rawBody, 'utf8') > limitBytes;
}

function reject(failureCode: string, failureMessageSafe: string): CareersWebhookDecision {
  return { status: 'rejected', failureCode, failureMessageSafe };
}
