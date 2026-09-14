import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartSupportMode, validSupportReason } from '../src/server/admin/support-session-policy.ts';

test('all admin roles may use view-only partner support', () => {
  for (const role of ['super_admin', 'operations_admin', 'finance_admin', 'support_admin', 'catalog_admin'] as const) {
    assert.equal(canStartSupportMode(role, 'view_only'), true);
  }
});

test('operations mode is restricted to operations and super admins', () => {
  assert.equal(canStartSupportMode('super_admin', 'operations'), true);
  assert.equal(canStartSupportMode('operations_admin', 'operations'), true);
  assert.equal(canStartSupportMode('support_admin', 'operations'), false);
  assert.equal(canStartSupportMode('finance_admin', 'operations'), false);
});

test('support reasons must be meaningful and bounded', () => {
  assert.equal(validSupportReason('Check application documents'), true);
  assert.equal(validSupportReason('short'), false);
  assert.equal(validSupportReason('x'.repeat(501)), false);
  assert.equal(validSupportReason(null), false);
});
