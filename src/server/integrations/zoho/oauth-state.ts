import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const STATE_TTL_MS = 15 * 60 * 1000;

export function createZohoOAuthState(secret: string, now = Date.now()) {
  const timestamp = String(now);
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}`;
  const signature = signState(payload, secret);
  return `${payload}.${signature}`;
}

export function validateZohoOAuthState(state: string | null, secret: string, now = Date.now()) {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length !== 3) return false;

  const [timestamp, nonce, signature] = parts;
  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || now - issuedAt > STATE_TTL_MS || issuedAt - now > 60_000) {
    return false;
  }

  const payload = `${timestamp}.${nonce}`;
  const expected = signState(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function signState(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
