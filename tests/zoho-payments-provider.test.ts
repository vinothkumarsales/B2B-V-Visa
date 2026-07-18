import assert from 'node:assert/strict';
import test from 'node:test';
import {
  amountDecimalToMinor,
  amountToZohoDecimal,
  isSuccessfulZohoPaymentStatus,
  parseZohoPaymentWebhookPayload,
} from '../src/server/integrations/zoho/payment-provider-utils.ts';

test('normalizes Zoho Payments amount units without floating point drift', () => {
  assert.equal(amountToZohoDecimal(982800), 9828);
  assert.equal(amountToZohoDecimal(10050), 100.5);
  assert.equal(amountDecimalToMinor(100.5), 10050);
  assert.equal(amountDecimalToMinor('9,828.00'), 982800);
});

test('classifies only settled Zoho payment statuses as successful', () => {
  assert.equal(isSuccessfulZohoPaymentStatus('paid'), true);
  assert.equal(isSuccessfulZohoPaymentStatus('CAPTURED'), true);
  assert.equal(isSuccessfulZohoPaymentStatus('created'), false);
  assert.equal(isSuccessfulZohoPaymentStatus('failed'), false);
});

test('parses Zoho Payments webhook identifiers from flat and nested payloads', () => {
  assert.deepEqual(
    parseZohoPaymentWebhookPayload(JSON.stringify({
      event_id: 'evt_1',
      payment_session_id: 'ps_1',
      payment_id: 'pay_1',
      status: 'paid',
    })),
    {
      webhookEventId: 'evt_1',
      providerOrderId: 'ps_1',
      providerPaymentId: 'pay_1',
      status: 'PAID',
      raw: {
        event_id: 'evt_1',
        payment_session_id: 'ps_1',
        payment_id: 'pay_1',
        status: 'paid',
      },
    },
  );

  const nested = parseZohoPaymentWebhookPayload(JSON.stringify({
    id: 'evt_2',
    data: {
      paymentSessionId: 'ps_2',
      paymentId: 'pay_2',
      paymentStatus: 'captured',
    },
  }));

  assert.equal(nested.webhookEventId, 'evt_2');
  assert.equal(nested.providerOrderId, 'ps_2');
  assert.equal(nested.providerPaymentId, 'pay_2');
  assert.equal(nested.status, 'CAPTURED');
});
