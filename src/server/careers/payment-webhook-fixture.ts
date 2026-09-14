import { createHmac, timingSafeEqual } from 'crypto';
import type { CareersPaymentWebhookEvent, CareersPaymentWebhookProvider, CareersPaymentWebhookEventType } from './payment-webhook-provider';

const SIGNATURE_HEADER = 'x-careers-fixture-signature';
const SUPPORTED_CURRENCIES = ['INR', 'EUR', 'USD'] as const;

export class CareersWebhookVerificationError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export class FixtureCareersPaymentWebhookProvider implements CareersPaymentWebhookProvider {
  readonly id = 'fixture';

  async verifyAndParse(input: { rawBody: string; headers: Headers }): Promise<CareersPaymentWebhookEvent> {
    verifyFixtureSignature(input.rawBody, input.headers.get(SIGNATURE_HEADER));
    const payload = parseFixturePayload(input.rawBody);
    const eventType = normalizeFixtureEventType(payload.eventType ?? payload.type);
    return {
      provider: this.id,
      providerEventId: readRequiredString(payload.providerEventId ?? payload.id, 'Webhook event ID is required.'),
      eventType,
      providerCheckoutId: readOptionalString(payload.providerCheckoutId),
      providerPaymentIntentId: readOptionalString(payload.providerPaymentIntentId),
      providerPaymentId: readOptionalString(payload.providerPaymentId),
      amountMinor: readOptionalNumber(payload.amountMinor),
      currency: payload.currency ? normalizeCurrency(String(payload.currency)) : null,
      occurredAt: payload.occurredAt ? new Date(String(payload.occurredAt)) : new Date(),
      metadata: {
        paymentIntentId: readOptionalString(payload.metadata?.paymentIntentId),
        candidateId: readOptionalString(payload.metadata?.candidateId),
        serviceRequestId: readOptionalString(payload.metadata?.serviceRequestId),
      },
      safeReference: readOptionalString(payload.safeReference),
    };
  }
}

export function signFixtureCareersWebhook(rawBody: string, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

function verifyFixtureSignature(rawBody: string, signature: string | null) {
  const secret = process.env.CAREERS_FIXTURE_WEBHOOK_SECRET;
  if (!secret) {
    throw new CareersWebhookVerificationError('Fixture Careers webhook secret is not configured.', 500);
  }
  if (!signature) {
    throw new CareersWebhookVerificationError('Missing Careers fixture webhook signature.');
  }
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) {
    throw new CareersWebhookVerificationError('Malformed Careers fixture webhook signature.');
  }
  const expected = signFixtureCareersWebhook(rawBody, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new CareersWebhookVerificationError('Invalid Careers fixture webhook signature.');
  }
}

function parseFixturePayload(rawBody: string): Record<string, any> {
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid body');
    }
    return parsed;
  } catch {
    throw new CareersWebhookVerificationError('Invalid Careers webhook payload.', 400);
  }
}

function normalizeFixtureEventType(value: unknown): CareersPaymentWebhookEventType {
  const eventType = String(value ?? 'unsupported');
  const supported: CareersPaymentWebhookEventType[] = [
    'checkout_created',
    'payment_authorised',
    'payment_captured',
    'payment_failed',
    'payment_cancelled',
    'payment_expired',
    'refund_created',
    'refund_completed',
    'dispute_created',
    'unsupported',
  ];
  return supported.includes(eventType as CareersPaymentWebhookEventType) ? eventType as CareersPaymentWebhookEventType : 'unsupported';
}

function readRequiredString(value: unknown, message: string) {
  const text = readOptionalString(value);
  if (!text) throw new CareersWebhookVerificationError(message, 400);
  return text;
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCurrency(value: string) {
  const normalized = value.trim().toUpperCase();
  if (SUPPORTED_CURRENCIES.includes(normalized as (typeof SUPPORTED_CURRENCIES)[number])) {
    return normalized as (typeof SUPPORTED_CURRENCIES)[number];
  }
  throw new CareersWebhookVerificationError('Unsupported Careers webhook currency.', 400);
}
