export type CareerPaymentIntentState =
  | 'draft'
  | 'awaiting_checkout'
  | 'checkout_created'
  | 'payment_pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type CareerSubscriptionState =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

const paymentIntentTransitions: Record<CareerPaymentIntentState, CareerPaymentIntentState[]> = {
  draft: ['awaiting_checkout', 'cancelled'],
  awaiting_checkout: ['checkout_created', 'cancelled', 'expired'],
  checkout_created: ['payment_pending', 'paid', 'failed', 'cancelled', 'expired'],
  payment_pending: ['paid', 'failed', 'cancelled', 'expired'],
  paid: [],
  failed: ['awaiting_checkout', 'cancelled'],
  cancelled: [],
  expired: ['awaiting_checkout', 'cancelled'],
};

const subscriptionTransitions: Record<CareerSubscriptionState, CareerSubscriptionState[]> = {
  draft: ['pending_payment', 'cancelled'],
  pending_payment: ['active', 'cancelled', 'expired'],
  active: ['past_due', 'cancelled', 'expired'],
  past_due: ['active', 'cancelled', 'expired'],
  cancelled: [],
  expired: [],
};

export function canTransitionCareerPaymentIntent(
  from: CareerPaymentIntentState,
  to: CareerPaymentIntentState,
) {
  return paymentIntentTransitions[from]?.includes(to) ?? false;
}

export function canTransitionCareerSubscription(
  from: CareerSubscriptionState,
  to: CareerSubscriptionState,
) {
  return subscriptionTransitions[from]?.includes(to) ?? false;
}

export function careerPaymentIntentInitialStatus(): CareerPaymentIntentState {
  return 'draft';
}

export function careerSubscriptionInitialStatus(): CareerSubscriptionState {
  return 'draft';
}
