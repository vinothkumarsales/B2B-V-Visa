import { createHmac, timingSafeEqual } from 'crypto';
import { env, isDemoMode } from '@/lib/env';
import {
  amountDecimalToMinor,
  amountToZohoDecimal,
  firstString,
  firstValue,
  isSuccessfulZohoPaymentStatus,
  objectValue,
  parseZohoPaymentWebhookPayload,
} from './payment-provider-utils';

const PAYMENT_TIMEOUT_MS = 12_000;

export interface ZohoPaymentSessionInput {
  paymentOrderId: string;
  amountMinor: number;
  currency: string;
  agencyName: string;
  agencyEmail: string;
  successUrl?: string;
  failureUrl?: string;
}

export type PaymentSessionResult = {
  providerOrderId: string;
  providerSessionUrl: string;
  providerReference?: string;
  raw?: unknown;
};

export type PaymentWebhookEvent = {
  webhookEventId: string;
  providerOrderId: string;
  providerPaymentId?: string;
  status: string;
  raw: Record<string, unknown>;
};

export type PaymentVerificationInput = {
  paymentOrderId: string;
  providerOrderId: string;
  providerPaymentId?: string;
  amountMinor: number;
  currency: string;
};

export type PaymentVerificationResult = {
  verified: boolean;
  status: string;
  providerAmountMinor?: number;
  providerCurrency?: string;
  providerReference?: string;
  raw?: unknown;
  reason?: string;
};

export interface ZohoPaymentProvider {
  readonly name: 'zoho-payments-demo' | 'zoho-payments';
  createSession(input: ZohoPaymentSessionInput): Promise<PaymentSessionResult>;
  parseWebhook(rawBody: string): PaymentWebhookEvent;
  verifySuccess(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}

export function isZohoPaymentsLiveConfigured() {
  return Boolean(
    env.ZOHO_PAYMENTS_CLIENT_ID &&
      env.ZOHO_PAYMENTS_CLIENT_SECRET &&
      env.ZOHO_PAYMENTS_REFRESH_TOKEN &&
      env.ZOHO_PAYMENTS_ACCOUNT_ID,
  );
}

export function getZohoPaymentProvider(): ZohoPaymentProvider {
  return !isDemoMode || isZohoPaymentsLiveConfigured() ? liveZohoPaymentProvider : demoZohoPaymentProvider;
}

export async function createZohoPaymentSession(input: ZohoPaymentSessionInput) {
  return getZohoPaymentProvider().createSession(input);
}

export async function verifyZohoPaymentSuccess(input: PaymentVerificationInput) {
  return getZohoPaymentProvider().verifySuccess(input);
}

export function parseZohoPaymentsWebhook(rawBody: string) {
  return getZohoPaymentProvider().parseWebhook(rawBody);
}

export function verifyZohoPaymentsWebhook(rawBody: string, signature: string | null) {
  return getZohoPaymentProvider().verifyWebhookSignature(rawBody, signature);
}

export { amountDecimalToMinor, amountToZohoDecimal, isSuccessfulZohoPaymentStatus };

const demoZohoPaymentProvider: ZohoPaymentProvider = {
  name: 'zoho-payments-demo',
  async createSession(input) {
    return {
      providerOrderId: `demo-zoho-session-${input.paymentOrderId}`,
      providerSessionUrl: `/wallet?demoPaymentOrderId=${input.paymentOrderId}`,
      providerReference: input.paymentOrderId,
    };
  },
  parseWebhook(rawBody) {
    return parseWebhookPayload(rawBody);
  },
  async verifySuccess(input) {
    return {
      verified: true,
      status: 'CONFIRMED',
      providerAmountMinor: input.amountMinor,
      providerCurrency: input.currency,
      providerReference: input.providerPaymentId ?? input.providerOrderId,
    };
  },
  verifyWebhookSignature() {
    return true;
  },
};

const liveZohoPaymentProvider: ZohoPaymentProvider = {
  name: 'zoho-payments',
  async createSession(input) {
    assertZohoPaymentsConfigured();
    const payload = {
      amount: amountToZohoDecimal(input.amountMinor),
      currency: input.currency,
      expires_in: 900,
      description: `V-Visa payment ${input.paymentOrderId}`,
      reference_number: input.paymentOrderId,
      meta_data: [
        { key: 'portal_payment_order_id', value: input.paymentOrderId },
      ],
      configurations: {
        hosted_checkout_parameters: {
          name: input.agencyName,
          email: input.agencyEmail,
          description: `V-Visa payment ${input.paymentOrderId}`,
          success_url: input.successUrl,
          failure_url: input.failureUrl,
          udf1: input.paymentOrderId,
        },
      },
    };

    const response = await zohoPaymentsFetch('/paymentsessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw zohoPaymentError(data, `ZOHO_PAYMENT_SESSION_${response.status}`);

    const session = unwrapZohoData(data);
    const providerOrderId = firstString(session, ['payment_session_id', 'payment_sessionId', 'paymentSessionId', 'id']);
    const accessKey = firstString(session, ['access_key', 'accessKey']);
    const checkoutUrl = firstString(session, ['hosted_checkout_url', 'hostedCheckoutUrl', 'payment_url', 'paymentUrl', 'url', 'redirect_url']);
    if (!providerOrderId) throw new Error('ZOHO_PAYMENT_SESSION_ID_MISSING');
    if (!checkoutUrl && !accessKey) throw new Error('ZOHO_PAYMENT_SESSION_URL_MISSING');

    return {
      providerOrderId,
      providerSessionUrl: checkoutUrl ?? buildHostedCheckoutUrl(accessKey),
      providerReference: accessKey,
      raw: data,
    };
  },
  parseWebhook(rawBody) {
    return parseWebhookPayload(rawBody);
  },
  async verifySuccess(input) {
    assertZohoPaymentsConfigured();
    const response = await zohoPaymentsFetch(`/paymentsessions/${encodeURIComponent(input.providerOrderId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        verified: false,
        status: `READ_FAILED_${response.status}`,
        reason: 'provider_read_failed',
        raw: data,
      };
    }

    const session = unwrapZohoData(data);
    const providerStatus = firstString(session, ['status', 'payment_status', 'paymentStatus']) ?? 'UNKNOWN';
    const providerAmountMinor = amountDecimalToMinor(firstValue(session, ['amount', 'payment_amount', 'paymentAmount']));
    const providerCurrency = firstString(session, ['currency']);
    const amountMatches = providerAmountMinor === undefined || providerAmountMinor === input.amountMinor;
    const currencyMatches = !providerCurrency || providerCurrency.toUpperCase() === input.currency.toUpperCase();
    const verified = isSuccessfulZohoPaymentStatus(providerStatus) && amountMatches && currencyMatches;

    return {
      verified,
      status: providerStatus.toUpperCase(),
      providerAmountMinor,
      providerCurrency,
      providerReference: firstString(session, ['reference_number', 'referenceNumber', 'payment_id', 'paymentId']),
      raw: data,
      reason: verified ? undefined : !amountMatches ? 'amount_mismatch' : !currencyMatches ? 'currency_mismatch' : 'payment_not_successful',
    };
  },
  verifyWebhookSignature(rawBody, signature) {
    if (!env.ZOHO_PAYMENTS_WEBHOOK_SECRET || !signature) return false;
    const expected = createHmac('sha256', env.ZOHO_PAYMENTS_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  },
};

let paymentsTokenState: { accessToken: string; expiresAt: number } | null = null;
let paymentsRefreshInFlight: Promise<{ accessToken: string; expiresAt: number }> | null = null;

async function getZohoPaymentsAccessToken() {
  const now = Date.now();
  if (paymentsTokenState && paymentsTokenState.expiresAt - 90_000 > now) return paymentsTokenState.accessToken;
  if (!paymentsRefreshInFlight) {
    paymentsRefreshInFlight = refreshZohoPaymentsToken().finally(() => {
      paymentsRefreshInFlight = null;
    });
  }
  paymentsTokenState = await paymentsRefreshInFlight;
  return paymentsTokenState.accessToken;
}

async function refreshZohoPaymentsToken() {
  assertZohoPaymentsConfigured();
  const params = new URLSearchParams({
    refresh_token: env.ZOHO_PAYMENTS_REFRESH_TOKEN as string,
    client_id: env.ZOHO_PAYMENTS_CLIENT_ID as string,
    client_secret: env.ZOHO_PAYMENTS_CLIENT_SECRET as string,
    grant_type: 'refresh_token',
  });

  const response = await fetchWithTimeout(`${env.ZOHO_CRM_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    body: params,
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token) throw new Error(`ZOHO_PAYMENTS_TOKEN_${data.error ?? response.status}`);
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
}

async function zohoPaymentsFetch(path: string, init: RequestInit = {}) {
  const token = await getZohoPaymentsAccessToken();
  const response = await fetchWithTimeout(buildZohoPaymentsUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (response.status !== 401) return response;

  paymentsTokenState = null;
  const retryToken = await getZohoPaymentsAccessToken();
  return fetchWithTimeout(buildZohoPaymentsUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${retryToken}`,
      ...(init.headers ?? {}),
    },
  });
}

function buildZohoPaymentsUrl(path: string) {
  const base = env.ZOHO_PAYMENTS_API_BASE_URL ?? 'https://payments.zoho.in/api/v1';
  const url = new URL(`${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  if (env.ZOHO_PAYMENTS_ACCOUNT_ID) url.searchParams.set('account_id', env.ZOHO_PAYMENTS_ACCOUNT_ID);
  return url.toString();
}

function parseWebhookPayload(rawBody: string): PaymentWebhookEvent {
  return parseZohoPaymentWebhookPayload(rawBody);
}

function assertZohoPaymentsConfigured() {
  if (!env.ZOHO_PAYMENTS_CLIENT_ID || !env.ZOHO_PAYMENTS_CLIENT_SECRET || !env.ZOHO_PAYMENTS_REFRESH_TOKEN || !env.ZOHO_PAYMENTS_ACCOUNT_ID) {
    throw new Error('ZOHO_PAYMENTS_NOT_CONFIGURED');
  }
}

function unwrapZohoData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const root = data as Record<string, unknown>;
  const nested = root.data;
  if (Array.isArray(nested)) return objectValue(nested[0]) ?? root;
  return objectValue(nested) ?? root;
}

function buildHostedCheckoutUrl(accessKey?: string) {
  if (!accessKey) throw new Error('ZOHO_PAYMENT_SESSION_URL_MISSING');
  return `https://payments.zoho.in/hostedpages/payment?access_key=${encodeURIComponent(accessKey)}`;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYMENT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function zohoPaymentError(data: unknown, fallback: string) {
  const payload = objectValue(data);
  const error = new Error(String(payload?.code ?? payload?.message ?? fallback));
  error.name = 'ZohoPaymentError';
  return error;
}
