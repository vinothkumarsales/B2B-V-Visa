import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAdminPermission, isBootstrapAdminEmail, roleFromMembership } from '../src/server/admin/permissions.ts';

test('admin bootstrap email checks use exact company domain', () => {
  assert.equal(isBootstrapAdminEmail('vinodhvijay490@gmail.com'), true);
  assert.equal(isBootstrapAdminEmail('owner@digidocsindia.com'), true);
  assert.equal(isBootstrapAdminEmail('owner@digidocsindia.com.attacker.com'), false);
  assert.equal(isBootstrapAdminEmail('owner@mydigidocsindia.com'), false);
  assert.equal(isBootstrapAdminEmail('owner@digidocsindia.co'), false);
});

test('permission matrix blocks support admins from high-risk writes', () => {
  assert.equal(hasAdminPermission('support_admin', 'partner.read'), true);
  assert.equal(hasAdminPermission('support_admin', 'application.create_on_behalf'), false);
  assert.equal(hasAdminPermission('support_admin', 'wallet.adjust'), false);
  assert.equal(hasAdminPermission('catalog_admin', 'wallet.adjust'), false);
  assert.equal(hasAdminPermission('super_admin', 'admin.manage'), true);
});

test('existing VVisa membership roles map to admin roles', () => {
  assert.equal(roleFromMembership('VVISAS_ADMIN'), 'super_admin');
  assert.equal(roleFromMembership('VVISAS_OPERATIONS'), 'operations_admin');
  assert.equal(roleFromMembership('VVISAS_FINANCE'), 'finance_admin');
  assert.equal(roleFromMembership('AGENCY_OWNER'), null);
});
