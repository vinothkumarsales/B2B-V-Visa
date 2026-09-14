export type CheckoutIntentLike = {
  status: string;
  expiresAt: Date | null;
  checkoutUrl: string | null;
  amountMinor: number;
  currency: string;
};

export function buildCareerCheckoutAttemptGroupKey(input: {
  candidateId: string;
  serviceRequestId: string;
  packageCode: string;
  currency: string;
}) {
  return `career-checkout:${input.candidateId}:${input.serviceRequestId}:${input.packageCode}:${input.currency}`;
}

export function canReuseCareerCheckout(intent: CheckoutIntentLike | null, now = new Date()) {
  return Boolean(
    intent &&
    intent.status === 'checkout_created' &&
    intent.expiresAt &&
    intent.expiresAt > now &&
    intent.checkoutUrl,
  );
}

export function canReuseCareerPaymentIntentDraft(input: {
  intent: CheckoutIntentLike | null;
  amountMinor: number;
  currency: string;
}) {
  return Boolean(
    input.intent &&
    ['draft', 'awaiting_checkout'].includes(input.intent.status) &&
    input.intent.amountMinor === input.amountMinor &&
    input.intent.currency === input.currency,
  );
}
