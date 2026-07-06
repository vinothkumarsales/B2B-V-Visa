import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema } from '../src/lib/auth/login-schema.ts';

test('login schema accepts valid email and password payload', () => {
  const parsed = loginSchema.safeParse({
    email: '  ADMIN@DigiDocsIndia.com ',
    password: 'secret',
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, 'admin@digidocsindia.com');
    assert.equal(parsed.data.password, 'secret');
  }
});

test('login schema rejects missing email and missing password', () => {
  assert.equal(loginSchema.safeParse({ password: 'secret' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'admin@digidocsindia.com' }).success, false);
});

test('login schema rejects invalid email and empty password', () => {
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'admin@digidocsindia.com', password: '' }).success, false);
});
