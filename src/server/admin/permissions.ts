import type { AdminRole, MembershipRole } from '@prisma/client';

const BOOTSTRAP_ADMIN_EMAIL = 'vinodhvijay490@gmail.com';
const COMPANY_ADMIN_DOMAIN = 'digidocsindia.com';

export type AdminPermission =
  | 'admin.manage'
  | 'catalog.read'
  | 'catalog.write'
  | 'pricing.read'
  | 'pricing.write'
  | 'dashboard.read'
  | 'dashboard.write'
  | 'dashboard.publish'
  | 'application_status.read'
  | 'application_status.write'
  | 'application_status.publish'
  | 'application.read'
  | 'partner.read'
  | 'partner.write'
  | 'partner.impersonate'
  | 'application.bulk_update'
  | 'application.assign'
  | 'application.create_on_behalf'
  | 'application.submit_on_behalf'
  | 'application.update'
  | 'wallet.read'
  | 'wallet.adjust'
  | 'dashboard_content.write'
  | 'audit.read'
  | 'settings.write';

export const ADMIN_PERMISSION_MATRIX: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'admin.manage',
    'catalog.read',
    'catalog.write',
    'pricing.read',
    'pricing.write',
    'dashboard.read',
    'dashboard.write',
    'dashboard.publish',
    'application_status.read',
    'application_status.write',
    'application_status.publish',
    'application.read',
    'partner.read',
    'partner.write',
    'partner.impersonate',
    'application.bulk_update',
    'application.assign',
    'application.create_on_behalf',
    'application.submit_on_behalf',
    'application.update',
    'wallet.read',
    'wallet.adjust',
    'dashboard_content.write',
    'audit.read',
    'settings.write',
  ],
  catalog_admin: [
    'catalog.read',
    'catalog.write',
    'dashboard.read',
    'dashboard.write',
    'dashboard_content.write',
    'application_status.read',
    'audit.read',
  ],
  operations_admin: [
    'application.read',
    'application.update',
    'application.assign',
    'application_status.read',
    'partner.read',
    'partner.write',
    'partner.impersonate',
    'application.create_on_behalf',
    'application.update',
    'catalog.read',
    'pricing.read',
    'audit.read',
  ],
  finance_admin: ['pricing.read', 'pricing.write', 'wallet.read', 'wallet.adjust', 'partner.read', 'application.read', 'audit.read'],
  support_admin: ['partner.read', 'catalog.read', 'pricing.read', 'wallet.read', 'dashboard.read', 'application_status.read', 'application.read', 'audit.read'],
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return ADMIN_PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function roleFromMembership(role: MembershipRole | null | undefined): AdminRole | null {
  if (role === 'VVISAS_ADMIN') return 'super_admin';
  if (role === 'VVISAS_OPERATIONS') return 'operations_admin';
  if (role === 'VVISAS_FINANCE') return 'finance_admin';
  return null;
}

function emailDomain(email: string) {
  return email.toLowerCase().split('@').at(1) ?? '';
}

export function isBootstrapAdminEmail(email: string) {
  const normalized = email.toLowerCase();
  return normalized === BOOTSTRAP_ADMIN_EMAIL || emailDomain(normalized) === COMPANY_ADMIN_DOMAIN;
}

export function isPrimaryBootstrapAdminEmail(email: string) {
  return email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}

export function isCompanyAdminEmail(email: string) {
  return emailDomain(email) === COMPANY_ADMIN_DOMAIN;
}
