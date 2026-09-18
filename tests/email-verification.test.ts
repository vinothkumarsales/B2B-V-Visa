import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateVerificationToken,
  verifyTokenOrCode,
  isEmailVerified,
  generateNumericCode,
  generateSecureToken,
} from '../src/server/auth/verification-token.ts';

test('generates secure 64-character hex tokens and 6-digit numeric OTP codes', () => {
  const token = generateSecureToken();
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]{64}$/);

  const code = generateNumericCode();
  assert.equal(typeof code, 'string');
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test('generates, stores, and verifies an email verification token via link', async () => {
  const testEmail = `test.traveler.${Date.now()}@agency.com`;

  // Before verification
  const initialStatus = await isEmailVerified(testEmail);
  assert.equal(initialStatus, false);

  // Generate token
  const { token, code, expiresAt } = await generateVerificationToken(testEmail);
  assert.ok(token);
  assert.equal(code.length, 6);
  assert.ok(expiresAt instanceof Date);
  assert.ok(expiresAt.getTime() > Date.now());

  // Verify via link token
  const verifyResult = await verifyTokenOrCode({ token });
  assert.equal(verifyResult.success, true);
  assert.equal(verifyResult.email, testEmail);

  // After verification, status must be true
  const afterStatus = await isEmailVerified(testEmail);
  assert.equal(afterStatus, true);
});

test('verifies an email using the 6-digit numeric OTP code', async () => {
  const testEmail = `otp.test.${Date.now()}@partner.in`;

  // Generate token + code
  const { code } = await generateVerificationToken(testEmail);

  // Wrong code should fail
  const failResult = await verifyTokenOrCode({ email: testEmail, code: '000000' });
  assert.equal(failResult.success, false);
  assert.ok(failResult.error?.includes('Invalid'));

  // Correct code should succeed
  const successResult = await verifyTokenOrCode({ email: testEmail, code });
  assert.equal(successResult.success, true);
  assert.equal(successResult.email, testEmail);

  // Status must now be verified
  const verified = await isEmailVerified(testEmail);
  assert.equal(verified, true);
});

test('rejects non-existent or expired tokens gracefully', async () => {
  const badResult = await verifyTokenOrCode({ token: 'nonexistent-token-hex-1234567890' });
  assert.equal(badResult.success, false);
  assert.ok(badResult.error);
});
