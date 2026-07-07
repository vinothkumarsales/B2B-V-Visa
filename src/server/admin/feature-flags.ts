export type AdminFeatureFlag =
  | 'ADMIN_WRITES_ENABLED'
  | 'ADMIN_DASHBOARD_WRITES_ENABLED'
  | 'ADMIN_STATUS_WRITES_ENABLED'
  | 'ADMIN_PARTNER_SUPPORT_ENABLED'
  | 'ADMIN_APPLICATION_ON_BEHALF_ENABLED'
  | 'ADMIN_WALLET_WRITES_ENABLED';

export const ADMIN_FEATURE_FLAGS: AdminFeatureFlag[] = [
  'ADMIN_WRITES_ENABLED',
  'ADMIN_DASHBOARD_WRITES_ENABLED',
  'ADMIN_STATUS_WRITES_ENABLED',
  'ADMIN_PARTNER_SUPPORT_ENABLED',
  'ADMIN_APPLICATION_ON_BEHALF_ENABLED',
  'ADMIN_WALLET_WRITES_ENABLED',
];

export function adminFeatureEnabled(name: AdminFeatureFlag) {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

export function adminFeatureSnapshot() {
  return Object.fromEntries(ADMIN_FEATURE_FLAGS.map((flag) => [flag, adminFeatureEnabled(flag)])) as Record<AdminFeatureFlag, boolean>;
}
