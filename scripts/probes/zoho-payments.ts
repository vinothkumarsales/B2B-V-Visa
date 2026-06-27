import { loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const configured = Boolean(
  process.env.ZOHO_PAYMENTS_CLIENT_ID &&
    process.env.ZOHO_PAYMENTS_CLIENT_SECRET &&
    process.env.ZOHO_PAYMENTS_REFRESH_TOKEN &&
    process.env.ZOHO_PAYMENTS_ACCOUNT_ID &&
    process.env.ZOHO_PAYMENTS_WEBHOOK_SECRET,
);

printProbe('zoho-payments', {
  configured,
  credentials_valid: null,
  provider_reachable: null,
  required_keys: requiredEnvPresent([
    'ZOHO_PAYMENTS_CLIENT_ID',
    'ZOHO_PAYMENTS_CLIENT_SECRET',
    'ZOHO_PAYMENTS_REFRESH_TOKEN',
    'ZOHO_PAYMENTS_ACCOUNT_ID',
    'ZOHO_PAYMENTS_WEBHOOK_SECRET',
  ]),
  write_probe_enabled: false,
  note: configured
    ? 'credentials_present_payment_operation_not_run_without merchant endpoint validation'
    : 'missing_zoho_payments_credentials',
});
