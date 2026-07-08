import type { Prisma } from '@prisma/client';

export type ActivationDisplayStatus =
  | 'payment_awaiting_confirmation'
  | 'payment_confirmed'
  | 'activating_service'
  | 'service_active'
  | 'setup_queued'
  | 'activation_needs_attention';

export function careerActivationDisplayStatus(input: {
  paymentStatus: string | null;
  subscriptionStatus: string | null;
  activationStatus: string | null;
  handoffStatus: string | null;
}): ActivationDisplayStatus {
  if (input.handoffStatus === 'failed' || input.handoffStatus === 'blocked') return 'activation_needs_attention';
  if (input.handoffStatus === 'pending') return 'setup_queued';
  if (input.handoffStatus === 'processed' || input.subscriptionStatus === 'active' || input.activationStatus === 'service_active') {
    return 'service_active';
  }
  if (input.paymentStatus === 'paid') return 'payment_confirmed';
  if (input.paymentStatus === 'payment_pending' || input.paymentStatus === 'checkout_created') return 'payment_awaiting_confirmation';
  return 'activating_service';
}

export function parsePaymentPricingSnapshot(value: Prisma.JsonValue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (
    typeof snapshot.id !== 'string' ||
    typeof snapshot.packageCode !== 'string' ||
    typeof snapshot.amountMinor !== 'number' ||
    typeof snapshot.currency !== 'string'
  ) {
    return null;
  }
  return {
    id: snapshot.id,
    packageCode: snapshot.packageCode,
    packageName: typeof snapshot.packageName === 'string' ? snapshot.packageName : null,
    amountMinor: snapshot.amountMinor,
    currency: snapshot.currency,
    billingMode: typeof snapshot.billingMode === 'string' ? snapshot.billingMode : null,
  };
}
