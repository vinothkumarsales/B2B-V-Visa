import { env } from '@/lib/env';
import { apiError } from '@/lib/api-response';
import type { CareerSupportedCurrency } from './packages';
import { FixtureCareersPaymentProvider } from './checkout-fixture-provider';

export type CareersPaymentMode = 'fixture' | 'sandbox' | 'live';

export type CareersCreateCheckoutInput = {
  paymentIntentId: string;
  candidateId: string;
  serviceRequestId: string;
  packageCode: string;
  amountMinor: number;
  currency: CareerSupportedCurrency;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  metadata: {
    candidateId: string;
    serviceRequestId: string;
    pricingSnapshotId: string;
  };
};

export type CareersCheckoutResult = {
  provider: string;
  providerCheckoutId: string;
  providerPaymentIntentId?: string | null;
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  expiresAt?: Date | null;
  mode: CareersPaymentMode;
  rawReference?: string | null;
};

export interface CareersPaymentProvider {
  readonly id: string;
  createCheckout(input: CareersCreateCheckoutInput): Promise<CareersCheckoutResult>;
}

export function resolveCareersPaymentProvider(): CareersPaymentProvider {
  if (env.CAREERS_PAYMENT_MODE === 'live' && !env.CAREERS_LIVE_PAYMENTS_ENABLED) {
    throw apiError('PRODUCTION_CONFIGURATION_REQUIRED', 'Live Careers payments are not enabled.', 403);
  }
  if (env.CAREERS_PAYMENT_PROVIDER !== 'fixture') {
    throw apiError('PROVIDER_UNAVAILABLE', 'Configured Careers payment provider is not available in this phase.', 503);
  }
  if (env.CAREERS_PAYMENT_MODE !== 'fixture') {
    throw apiError('PROVIDER_UNAVAILABLE', 'Only fixture Careers checkout is available in this phase.', 503);
  }
  return new FixtureCareersPaymentProvider();
}
