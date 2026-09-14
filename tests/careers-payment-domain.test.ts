import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTransitionCareerPaymentIntent,
  canTransitionCareerSubscription,
  careerPaymentIntentInitialStatus,
  careerSubscriptionInitialStatus,
} from '../src/server/careers/payment-domain.ts';

test('career payment intent starts in draft and blocks direct paid transition', () => {
  assert.equal(careerPaymentIntentInitialStatus(), 'draft');
  assert.equal(canTransitionCareerPaymentIntent('draft', 'awaiting_checkout'), true);
  assert.equal(canTransitionCareerPaymentIntent('draft', 'paid'), false);
});

test('career payment intent allows pending payment to settle or fail', () => {
  assert.equal(canTransitionCareerPaymentIntent('payment_pending', 'paid'), true);
  assert.equal(canTransitionCareerPaymentIntent('payment_pending', 'failed'), true);
  assert.equal(canTransitionCareerPaymentIntent('paid', 'failed'), false);
});

test('career subscription requires payment activation before active state', () => {
  assert.equal(careerSubscriptionInitialStatus(), 'draft');
  assert.equal(canTransitionCareerSubscription('draft', 'pending_payment'), true);
  assert.equal(canTransitionCareerSubscription('draft', 'active'), false);
  assert.equal(canTransitionCareerSubscription('pending_payment', 'active'), true);
});
