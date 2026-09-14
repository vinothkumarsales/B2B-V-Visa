import assert from 'node:assert/strict';
import test from 'node:test';
import {
  careerActivationDisplayStatus,
  parsePaymentPricingSnapshot,
} from '../src/server/careers/activation-policy.ts';

test('career activation display status reflects dashboard lifecycle', () => {
  assert.equal(careerActivationDisplayStatus({
    paymentStatus: 'checkout_created',
    subscriptionStatus: null,
    activationStatus: 'not_started',
    handoffStatus: null,
  }), 'payment_awaiting_confirmation');
  assert.equal(careerActivationDisplayStatus({
    paymentStatus: 'paid',
    subscriptionStatus: null,
    activationStatus: 'not_started',
    handoffStatus: null,
  }), 'payment_confirmed');
  assert.equal(careerActivationDisplayStatus({
    paymentStatus: 'paid',
    subscriptionStatus: 'active',
    activationStatus: 'service_active',
    handoffStatus: null,
  }), 'service_active');
  assert.equal(careerActivationDisplayStatus({
    paymentStatus: 'paid',
    subscriptionStatus: 'active',
    activationStatus: 'service_active',
    handoffStatus: 'pending',
  }), 'setup_queued');
  assert.equal(careerActivationDisplayStatus({
    paymentStatus: 'paid',
    subscriptionStatus: 'active',
    activationStatus: 'service_active',
    handoffStatus: 'failed',
  }), 'activation_needs_attention');
});

test('career activation pricing snapshot parser requires immutable payment fields', () => {
  assert.deepEqual(parsePaymentPricingSnapshot({
    id: 'snapshot_1',
    packageCode: 'EUROPE_JOB_SEARCH_ASSIST',
    packageName: 'Assist',
    amountMinor: 10000,
    currency: 'INR',
    billingMode: 'one_time',
  }), {
    id: 'snapshot_1',
    packageCode: 'EUROPE_JOB_SEARCH_ASSIST',
    packageName: 'Assist',
    amountMinor: 10000,
    currency: 'INR',
    billingMode: 'one_time',
  });
  assert.equal(parsePaymentPricingSnapshot({ id: 'snapshot_1', amountMinor: 10000, currency: 'INR' }), null);
  assert.equal(parsePaymentPricingSnapshot(null), null);
});
