import { createHmac, timingSafeEqual } from 'crypto';
import { env, isDemoMode } from '@/lib/env';

export interface ZohoPaymentSessionInput {
  paymentOrderId: string;
  amountMinor: number;
  currency: string;
  agencyName: string;
  agencyEmail: string;
}

export async function createZohoPaymentSession(input: ZohoPaymentSessionInput) {
  if (isDemoMode) {
    return {
      providerOrderId: `demo-zoho-${input.paymentOrderId}`,
      providerSessionUrl: `/wallet?demoPaymentOrderId=${input.paymentOrderId}`,
    };
  }

  if (!env.ZOHO_PAYMENTS_CLIENT_ID || !env.ZOHO_PAYMENTS_CLIENT_SECRET) {
    throw new Error('Zoho Payments is not configured');
  }

  // The adapter boundary is intentionally isolated. Wire the live Zoho Payments
  // HTTP request here once the merchant account endpoint shape is confirmed.
  throw new Error('Live Zoho Payments session creation is not implemented yet');
}

export function verifyZohoPaymentsWebhook(rawBody: string, signature: string | null) {
  if (isDemoMode) return true;
  if (!env.ZOHO_PAYMENTS_WEBHOOK_SECRET || !signature) return false;

  const expected = createHmac('sha256', env.ZOHO_PAYMENTS_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
