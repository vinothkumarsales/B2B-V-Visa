import { getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const serverSideConfigured = Boolean(
  process.env.ZOHO_PAYMENTS_CLIENT_ID &&
    process.env.ZOHO_PAYMENTS_CLIENT_SECRET &&
    process.env.ZOHO_PAYMENTS_REFRESH_TOKEN &&
    process.env.ZOHO_PAYMENTS_ACCOUNT_ID,
);
const clientWidgetConfigured = Boolean(
  process.env.NEXT_PUBLIC_ZOHO_PAYMENT_ACCOUNT_ID &&
    process.env.NEXT_PUBLIC_ZOHO_PAYMENT_API_KEY,
);
const webhookConfigured = Boolean(process.env.ZOHO_PAYMENTS_WEBHOOK_SECRET);
const configured = serverSideConfigured && clientWidgetConfigured && webhookConfigured;
const token = await getZohoCrmAccessTokenForProbe();

printProbe('zoho-payments', {
  configured,
  server_side_configured: serverSideConfigured,
  client_widget_configured: clientWidgetConfigured,
  webhook_configured: webhookConfigured,
  credentials_valid: token.ok,
  provider_reachable: null,
  required_keys: requiredEnvPresent([
    'ZOHO_PAYMENTS_CLIENT_ID',
    'ZOHO_PAYMENTS_CLIENT_SECRET',
    'ZOHO_PAYMENTS_REFRESH_TOKEN',
    'ZOHO_PAYMENTS_ACCOUNT_ID',
    'NEXT_PUBLIC_ZOHO_PAYMENT_ACCOUNT_ID',
    'NEXT_PUBLIC_ZOHO_PAYMENT_API_KEY',
    'ZOHO_PAYMENTS_WEBHOOK_SECRET',
  ]),
  write_probe_enabled: false,
  note: configured
    ? 'credentials_present_payment_operation_not_run_without merchant endpoint validation'
    : 'missing_zoho_payments_credentials',
});
