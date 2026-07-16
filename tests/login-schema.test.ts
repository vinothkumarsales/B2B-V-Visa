import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema } from '../src/lib/auth/login-schema.ts';

test('login schema accepts valid email and password payload', () => {
  const parsed = loginSchema.safeParse({
    identifier: 'ADMIN@DigiDocsIndia.com',
    password: 'secret',
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.identifier, 'ADMIN@DigiDocsIndia.com');
    assert.equal(parsed.data.password, 'secret');
  }
});

test('login schema accepts mobile and rejects missing credentials', () => {
  assert.equal(loginSchema.safeParse({ identifier: '+91 98765 43210', password: 'secret' }).success, true);
  assert.equal(loginSchema.safeParse({ password: 'secret' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'admin@digidocsindia.com' }).success, false);
});

test('login schema rejects invalid email and empty password', () => {
  assert.equal(loginSchema.safeParse({ identifier: 'not-an-email', password: 'secret' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'admin@digidocsindia.com', password: '' }).success, false);
});
