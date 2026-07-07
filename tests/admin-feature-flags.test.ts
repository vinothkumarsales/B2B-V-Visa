import assert from 'node:assert/strict';
import test from 'node:test';
import { adminFeatureEnabled, adminFeatureSnapshot } from '../src/server/admin/feature-flags.ts';

test('admin feature flags default to disabled', () => {
  const previous = process.env.ADMIN_DASHBOARD_WRITES_ENABLED;
  delete process.env.ADMIN_DASHBOARD_WRITES_ENABLED;
  assert.equal(adminFeatureEnabled('ADMIN_DASHBOARD_WRITES_ENABLED'), false);
  process.env.ADMIN_DASHBOARD_WRITES_ENABLED = previous;
});

test('admin feature snapshot only enables explicit true values', () => {
  const previousGlobal = process.env.ADMIN_WRITES_ENABLED;
  const previousStatus = process.env.ADMIN_STATUS_WRITES_ENABLED;
  process.env.ADMIN_WRITES_ENABLED = 'true';
  process.env.ADMIN_STATUS_WRITES_ENABLED = 'false';
  const snapshot = adminFeatureSnapshot();
  assert.equal(snapshot.ADMIN_WRITES_ENABLED, true);
  assert.equal(snapshot.ADMIN_STATUS_WRITES_ENABLED, false);
  process.env.ADMIN_WRITES_ENABLED = previousGlobal;
  process.env.ADMIN_STATUS_WRITES_ENABLED = previousStatus;
});
