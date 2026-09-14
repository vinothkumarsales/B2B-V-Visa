import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const STATE_TTL_MS = 15 * 60 * 1000;

export type ZohoOAuthTarget = 'crm' | 'payments';

export function createZohoOAuthState(secret: string, target: ZohoOAuthTarget = 'crm', now = Date.now()) {
  const timestamp = String(now);
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}.${target}`;
  const signature = signState(payload, secret);
  return `${payload}.${signature}`;
}

export function validateZohoOAuthState(
  state: string | null,
  secret: string,
  now = Date.now(),
): { valid: boolean; target?: ZohoOAuthTarget } {
  if (!state) return { valid: false };
  const parts = state.split('.');
  
  // Legacy format: timestamp.nonce.signature (3 parts) -> target 'crm'
  if (parts.length === 3) {
    const [timestamp, nonce, signature] = parts;
    const issuedAt = Number(timestamp);
    if (!Number.isFinite(issuedAt) || now - issuedAt > STATE_TTL_MS || issuedAt - now > 60_000) {
      return { valid: false };
    }
    const payload = `${timestamp}.${nonce}`;
    const expected = signState(payload, secret);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    const valid = expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
    return { valid, target: 'crm' };
  }

  // Target-aware format: timestamp.nonce.target.signature (4 parts)
  if (parts.length === 4) {
    const [timestamp, nonce, targetStr, signature] = parts;
    const issuedAt = Number(timestamp);
    if (!Number.isFinite(issuedAt) || now - issuedAt > STATE_TTL_MS || issuedAt - now > 60_000) {
      return { valid: false };
    }
    if (targetStr !== 'crm' && targetStr !== 'payments') {
      return { valid: false };
    }
    const payload = `${timestamp}.${nonce}.${targetStr}`;
    const expected = signState(payload, secret);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    const valid = expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
    return { valid, target: targetStr as ZohoOAuthTarget };
  }

  return { valid: false };
}

function signState(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
