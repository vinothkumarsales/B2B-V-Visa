import { createHash } from 'crypto';
import type { CareersCheckoutResult, CareersCreateCheckoutInput, CareersPaymentProvider } from './checkout-provider';

export class FixtureCareersPaymentProvider implements CareersPaymentProvider {
  readonly id = 'fixture';

  async createCheckout(input: CareersCreateCheckoutInput): Promise<CareersCheckoutResult> {
    if (input.idempotencyKey.includes('fixture-fail')) {
      throw new Error('Fixture checkout failure');
    }
    const digest = createHash('sha256')
      .update(input.idempotencyKey)
      .digest('hex')
      .slice(0, 24);
    const providerCheckoutId = `fixture_checkout_${digest}`;
    return {
      provider: this.id,
      providerCheckoutId,
      providerPaymentIntentId: `fixture_pi_${digest}`,
      checkoutUrl: `/careers/checkout/fixture/${providerCheckoutId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      mode: 'fixture',
      rawReference: `fixture:${input.paymentIntentId}`,
    };
  }
}
