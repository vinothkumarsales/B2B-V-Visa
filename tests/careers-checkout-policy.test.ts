import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCareerCheckoutAttemptGroupKey,
  canReuseCareerCheckout,
  canReuseCareerPaymentIntentDraft,
} from '../src/server/careers/checkout-policy.ts';
import { FixtureCareersPaymentProvider } from '../src/server/careers/checkout-fixture-provider.ts';

test('career checkout attempt group key is deterministic and excludes amount', () => {
  const input = {
    candidateId: 'candidate_1',
    serviceRequestId: 'service_1',
    packageCode: 'EUROPE_JOB_SEARCH_ASSIST',
    currency: 'INR',
  };
  assert.equal(buildCareerCheckoutAttemptGroupKey(input), buildCareerCheckoutAttemptGroupKey(input));
});

test('career checkout reuse requires a non-expired checkout URL', () => {
  const now = new Date('2026-07-08T10:00:00.000Z');
  assert.equal(canReuseCareerCheckout({
    status: 'checkout_created',
    expiresAt: new Date('2026-07-08T10:10:00.000Z'),
    checkoutUrl: '/careers/checkout/fixture/ok',
    amountMinor: 100,
    currency: 'INR',
  }, now), true);
  assert.equal(canReuseCareerCheckout({
    status: 'checkout_created',
    expiresAt: new Date('2026-07-08T09:59:00.000Z'),
    checkoutUrl: '/careers/checkout/fixture/old',
    amountMinor: 100,
    currency: 'INR',
  }, now), false);
});

test('career checkout draft reuse requires same amount and currency', () => {
  const intent = {
    status: 'draft',
    expiresAt: null,
    checkoutUrl: null,
    amountMinor: 100,
    currency: 'INR',
  };
  assert.equal(canReuseCareerPaymentIntentDraft({ intent, amountMinor: 100, currency: 'INR' }), true);
  assert.equal(canReuseCareerPaymentIntentDraft({ intent, amountMinor: 200, currency: 'INR' }), false);
  assert.equal(canReuseCareerPaymentIntentDraft({ intent, amountMinor: 100, currency: 'EUR' }), false);
});

test('fixture checkout provider returns sanitized fixture references', async () => {
  const provider = new FixtureCareersPaymentProvider();
  const checkout = await provider.createCheckout({
    paymentIntentId: 'intent_1',
    candidateId: 'candidate_1',
    serviceRequestId: 'service_1',
    packageCode: 'EUROPE_JOB_SEARCH_ASSIST',
    amountMinor: 100,
    currency: 'INR',
    customer: { name: 'Test Candidate', email: 'candidate@example.test' },
    successUrl: 'http://localhost:3000/careers/dashboard?checkout=success',
    cancelUrl: 'http://localhost:3000/careers/dashboard?checkout=cancelled',
    idempotencyKey: 'career-checkout:test',
    metadata: {
      candidateId: 'candidate_1',
      serviceRequestId: 'service_1',
      pricingSnapshotId: 'snapshot_1',
    },
  });
  assert.equal(checkout.provider, 'fixture');
  assert.equal(checkout.mode, 'fixture');
  assert.match(checkout.providerCheckoutId, /^fixture_checkout_/);
  assert.match(checkout.checkoutUrl ?? '', /^\/careers\/checkout\/fixture\//);
  assert.equal(checkout.clientSecret, undefined);
});

test('fixture checkout provider supports controlled failure testing', async () => {
  const provider = new FixtureCareersPaymentProvider();
  await assert.rejects(() => provider.createCheckout({
    paymentIntentId: 'intent_1',
    candidateId: 'candidate_1',
    serviceRequestId: 'service_1',
    packageCode: 'EUROPE_JOB_SEARCH_ASSIST',
    amountMinor: 100,
    currency: 'INR',
    customer: { name: 'Test Candidate', email: 'candidate@example.test' },
    successUrl: 'http://localhost:3000/careers/dashboard?checkout=success',
    cancelUrl: 'http://localhost:3000/careers/dashboard?checkout=cancelled',
    idempotencyKey: 'fixture-fail',
    metadata: {
      candidateId: 'candidate_1',
      serviceRequestId: 'service_1',
      pricingSnapshotId: 'snapshot_1',
    },
  }), /Fixture checkout failure/);
});
