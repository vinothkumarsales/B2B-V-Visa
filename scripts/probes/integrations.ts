import { loadLocalEnv, printProbe, probeStorageRoot, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const crmConfigured = Boolean(
  process.env.ZOHO_CRM_CLIENT_ID &&
    process.env.ZOHO_CRM_CLIENT_SECRET &&
    process.env.ZOHO_CRM_REFRESH_TOKEN,
);
const paymentsConfigured = Boolean(
  process.env.ZOHO_PAYMENTS_CLIENT_ID &&
    process.env.ZOHO_PAYMENTS_CLIENT_SECRET &&
    process.env.ZOHO_PAYMENTS_REFRESH_TOKEN &&
    process.env.ZOHO_PAYMENTS_ACCOUNT_ID &&
    process.env.NEXT_PUBLIC_ZOHO_PAYMENT_ACCOUNT_ID &&
    process.env.NEXT_PUBLIC_ZOHO_PAYMENT_API_KEY &&
    process.env.ZOHO_PAYMENTS_WEBHOOK_SECRET,
);
const paymentsServerConfigured = Boolean(
  process.env.ZOHO_PAYMENTS_CLIENT_ID &&
    process.env.ZOHO_PAYMENTS_CLIENT_SECRET &&
    process.env.ZOHO_PAYMENTS_REFRESH_TOKEN &&
    process.env.ZOHO_PAYMENTS_ACCOUNT_ID,
);
const paymentsWidgetConfigured = Boolean(
  process.env.NEXT_PUBLIC_ZOHO_PAYMENT_ACCOUNT_ID &&
    process.env.NEXT_PUBLIC_ZOHO_PAYMENT_API_KEY,
);
const digioConfigured = Boolean(process.env.DIGIO_CLIENT_ID && process.env.DIGIO_CLIENT_SECRET);
const storage = probeStorageRoot();

printProbe('integrations', {
  crm_configured: crmConfigured,
  crm_write_enabled: ['1', 'true', 'yes', 'on'].includes((process.env.CRM_WRITE_ENABLED || '').toLowerCase()),
  crm_attachment_sync_enabled: ['1', 'true', 'yes', 'on'].includes((process.env.CRM_ATTACHMENT_SYNC_ENABLED || '').toLowerCase()),
  zoho_payments_configured: paymentsConfigured,
  zoho_payments_server_configured: paymentsServerConfigured,
  zoho_payments_widget_configured: paymentsWidgetConfigured,
  zoho_payments_webhook_configured: Boolean(process.env.ZOHO_PAYMENTS_WEBHOOK_SECRET),
  digio_configured: digioConfigured,
  storage_configured: storage.write_probe_passed && storage.cleanup_verified,
  storage_provider: process.env.STORAGE_PROVIDER || 'local',
  required_key_status: requiredEnvPresent([
    'ZOHO_CRM_CLIENT_ID',
    'ZOHO_CRM_CLIENT_SECRET',
    'ZOHO_CRM_REFRESH_TOKEN',
    'ZOHO_PAYMENTS_CLIENT_ID',
    'ZOHO_PAYMENTS_CLIENT_SECRET',
    'ZOHO_PAYMENTS_REFRESH_TOKEN',
    'ZOHO_PAYMENTS_ACCOUNT_ID',
    'NEXT_PUBLIC_ZOHO_PAYMENT_ACCOUNT_ID',
    'NEXT_PUBLIC_ZOHO_PAYMENT_API_KEY',
    'ZOHO_PAYMENTS_WEBHOOK_SECRET',
    'DIGIO_CLIENT_ID',
    'DIGIO_CLIENT_SECRET',
  ]),
});
