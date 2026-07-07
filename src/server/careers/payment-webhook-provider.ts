import { apiError } from '../../lib/api-response.ts';
import { env } from '../../lib/env.ts';
import type { CareerSupportedCurrency } from './packages.ts';
import { FixtureCareersPaymentWebhookProvider } from './payment-webhook-fixture.ts';
import { careersFeatureEnabled } from './feature-flags.ts';

export type CareersPaymentWebhookEventType =
  | 'checkout_created'
  | 'payment_authorised'
  | 'payment_captured'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'
  | 'refund_created'
  | 'refund_completed'
  | 'dispute_created'
  | 'unsupported';

export type CareersPaymentWebhookEvent = {
  provider: string;
  providerEventId: string;
  eventType: CareersPaymentWebhookEventType;
  providerCheckoutId?: string | null;
  providerPaymentIntentId?: string | null;
  providerPaymentId?: string | null;
  amountMinor?: number | null;
  currency?: CareerSupportedCurrency | null;
  occurredAt: Date;
  metadata: {
    paymentIntentId?: string | null;
    candidateId?: string | null;
    serviceRequestId?: string | null;
  };
  safeReference?: string | null;
};

export interface CareersPaymentWebhookProvider {
  readonly id: string;
  verifyAndParse(input: {
    rawBody: string;
    headers: Headers;
  }): Promise<CareersPaymentWebhookEvent>;
}

export function resolveCareersPaymentWebhookProvider(providerId: string): CareersPaymentWebhookProvider {
  if (providerId !== 'fixture') {
    throw apiError('PROVIDER_UNAVAILABLE', 'Careers payment webhook provider is not available.', 404);
  }
  if (!careersFeatureEnabled('CAREERS_FIXTURE_WEBHOOKS_ENABLED')) {
    throw apiError('FORBIDDEN', 'Fixture Careers payment webhooks are disabled.', 403);
  }
  return new FixtureCareersPaymentWebhookProvider();
}
