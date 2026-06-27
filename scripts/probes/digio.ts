import { loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const configured = Boolean(process.env.DIGIO_CLIENT_ID && process.env.DIGIO_CLIENT_SECRET);

printProbe('digio', {
  configured,
  credentials_valid: null,
  provider_reachable: null,
  environment: process.env.DIGIO_ENVIRONMENT || 'sandbox',
  base_url_configured: Boolean(process.env.DIGIO_BASE_URL || 'https://api.digio.in'),
  required_keys: requiredEnvPresent(['DIGIO_CLIENT_ID', 'DIGIO_CLIENT_SECRET']),
  read_probe_passed: false,
  write_probe_enabled: false,
  note: configured
    ? 'credentials_present_live_ocr_probe_not_run_without_test_document'
    : 'missing_digio_credentials',
});
