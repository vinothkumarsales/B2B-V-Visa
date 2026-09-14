import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decideCareerPaymentWebhookTransition,
  isRawWebhookBodyTooLarge,
  mapWebhookEventToPaymentStatus,
} from '../src/server/careers/payment-webhook-policy.ts';
import { signFixtureCareersWebhook, FixtureCareersPaymentWebhookProvider } from '../src/server/careers/payment-webhook-fixture.ts';

const secret = 'fixture_webhook_secret_for_tests_only';

test('webhook flags default to disabled', async () => {
  const { careersFeatureSnapshot } = await import('../src/server/careers/feature-flags.ts');
  const snapshot = careersFeatureSnapshot();
  assert.equal(snapshot.CAREERS_PAYMENT_WEBHOOKS_ENABLED, false);
  assert.equal(snapshot.CAREERS_FIXTURE_WEBHOOKS_ENABLED, false);
});

test('fixture webhook rejects missing, malformed, invalid, and altered signatures', async () => {
  process.env.CAREERS_FIXTURE_WEBHOOK_SECRET = secret;
  const provider = new FixtureCareersPaymentWebhookProvider();
  const rawBody = JSON.stringify({ id: 'evt_1', type: 'payment_captured' });
  await assert.rejects(() => provider.verifyAndParse({ rawBody, headers: new Headers() }), /Missing/);
  await assert.rejects(() => provider.verifyAndParse({
    rawBody,
    headers: new Headers({ 'x-careers-fixture-signature': 'not-a-signature' }),
  }), /Malformed/);
  await assert.rejects(() => provider.verifyAndParse({
    rawBody,
    headers: new Headers({ 'x-careers-fixture-signature': signFixtureCareersWebhook(rawBody, 'wrong') }),
  }), /Invalid/);
  await assert.rejects(() => provider.verifyAndParse({
    rawBody: JSON.stringify({ id: 'evt_1', type: 'payment_failed' }),
    headers: new Headers({ 'x-careers-fixture-signature': signFixtureCareersWebhook(rawBody, secret) }),
  }), /Invalid/);
});

test('fixture webhook accepts a valid signature and normalizes safe fields', async () => {
  process.env.CAREERS_FIXTURE_WEBHOOK_SECRET = secret;
  const rawBody = JSON.stringify({
    id: 'evt_valid',
    type: 'payment_captured',
    providerCheckoutId: 'fixture_checkout_1',
    providerPaymentIntentId: 'fixture_pi_1',
    providerPaymentId: 'fixture_pay_1',
    amountMinor: 10000,
    currency: 'INR',
    metadata: { paymentIntentId: 'intent_1', candidateId: 'candidate_1', serviceRequestId: 'service_1' },
    safeReference: 'fixture:evt_valid',
  });
  const event = await new FixtureCareersPaymentWebhookProvider().verifyAndParse({
    rawBody,
    headers: new Headers({ 'x-careers-fixture-signature': signFixtureCareersWebhook(rawBody, secret) }),
  });
  assert.equal(event.provider, 'fixture');
  assert.equal(event.providerEventId, 'evt_valid');
  assert.equal(event.eventType, 'payment_captured');
  assert.equal(event.currency, 'INR');
  assert.equal(event.metadata.paymentIntentId, 'intent_1');
});

test('unsupported webhook events do not map to a payment status', () => {
  assert.equal(mapWebhookEventToPaymentStatus('unsupported'), null);
  assert.equal(mapWebhookEventToPaymentStatus('refund_completed'), null);
});

test('webhook transitions allow valid provider payment progress', () => {
  assert.deepEqual(decideCareerPaymentWebhookTransition({
    currentStatus: 'checkout_created',
    eventType: 'payment_authorised',
    currentAmountMinor: 100,
    currentCurrency: 'INR',
    eventAmountMinor: 100,
    eventCurrency: 'INR',
  }), { status: 'processed', nextStatus: 'payment_pending' });
  assert.deepEqual(decideCareerPaymentWebhookTransition({
    currentStatus: 'payment_pending',
    eventType: 'payment_captured',
    currentAmountMinor: 100,
    currentCurrency: 'INR',
    eventAmountMinor: 100,
    eventCurrency: 'INR',
  }), { status: 'processed', nextStatus: 'paid' });
});

test('webhook transitions block amount mismatch, currency mismatch, and invalid backward transition', () => {
  assert.equal(decideCareerPaymentWebhookTransition({
    currentStatus: 'checkout_created',
    eventType: 'payment_captured',
    currentAmountMinor: 100,
    currentCurrency: 'INR',
    eventAmountMinor: 200,
    eventCurrency: 'INR',
  }).failureCode, 'amount_mismatch');
  assert.equal(decideCareerPaymentWebhookTransition({
    currentStatus: 'checkout_created',
    eventType: 'payment_captured',
    currentAmountMinor: 100,
    currentCurrency: 'INR',
    eventAmountMinor: 100,
    eventCurrency: 'EUR',
  }).failureCode, 'currency_mismatch');
  assert.equal(decideCareerPaymentWebhookTransition({
    currentStatus: 'paid',
    eventType: 'payment_failed',
    currentAmountMinor: 100,
    currentCurrency: 'INR',
  }).failureCode, 'invalid_state_transition');
});

test('duplicate captured events are idempotent and raw payload size is bounded', () => {
  assert.deepEqual(decideCareerPaymentWebhookTransition({
    currentStatus: 'paid',
    eventType: 'payment_captured',
    currentAmountMinor: 100,
    currentCurrency: 'INR',
    eventAmountMinor: 100,
    eventCurrency: 'INR',
  }), { status: 'ignored', nextStatus: 'paid' });
  assert.equal(isRawWebhookBodyTooLarge('a'.repeat(128 * 1024 + 1)), true);
});
