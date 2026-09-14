export function isSuccessfulZohoPaymentStatus(status: string) {
  return ['SUCCESS', 'CONFIRMED', 'PAID', 'COMPLETED', 'CAPTURED'].includes(status.toUpperCase());
}

export function amountToZohoDecimal(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

export function amountDecimalToMinor(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return undefined;
  return Math.round(numeric * 100);
}

export type ParsedPaymentWebhookEvent = {
  webhookEventId: string;
  providerOrderId: string;
  providerPaymentId?: string;
  status: string;
  raw: Record<string, unknown>;
};

export function parseZohoPaymentWebhookPayload(rawBody: string): ParsedPaymentWebhookEvent {
  const payload = JSON.parse(rawBody || '{}') as Record<string, unknown>;
  const nestedPayment = objectValue(payload.payment) ?? objectValue(payload.data) ?? {};
  const source = { ...payload, ...nestedPayment };
  const webhookEventId = firstString(source, ['event_id', 'eventId', 'id']);
  const providerOrderId = firstString(source, ['payment_session_id', 'paymentSessionId', 'order_id', 'orderId', 'providerOrderId', 'reference_number', 'referenceNumber']);
  if (!webhookEventId || !providerOrderId) throw new Error('ZOHO_PAYMENT_WEBHOOK_IDENTIFIERS_MISSING');
  return {
    webhookEventId,
    providerOrderId,
    providerPaymentId: firstString(source, ['payment_id', 'paymentId', 'providerPaymentId']),
    status: (firstString(source, ['status', 'payment_status', 'paymentStatus']) ?? '').toUpperCase(),
    raw: payload,
  };
}

export function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function firstValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function firstString(source: Record<string, unknown>, keys: string[]) {
  const value = firstValue(source, keys);
  return value === undefined ? undefined : String(value);
}
