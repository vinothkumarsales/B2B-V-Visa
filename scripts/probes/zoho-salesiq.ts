import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const serverUri = process.env.ZOHO_SALESIQ_SERVER_URI;
const screenName = process.env.ZOHO_SALESIQ_SCREEN_NAME;
const brandId = process.env.ZOHO_SALESIQ_BRAND_ID;

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('zoho-salesiq', {
    configured: Boolean(serverUri && screenName),
    credentials_valid: false,
    provider_reachable: false,
    required_keys: requiredEnvPresent(['ZOHO_SALESIQ_SERVER_URI', 'ZOHO_SALESIQ_SCREEN_NAME']),
    read_probe_passed: false,
    error_code: token.errorCode || 'missing_or_invalid_zoho_credentials',
  });
} else if (!serverUri || !screenName) {
  printProbe('zoho-salesiq', {
    configured: false,
    credentials_valid: true,
    provider_reachable: null,
    required_keys: requiredEnvPresent(['ZOHO_SALESIQ_SERVER_URI', 'ZOHO_SALESIQ_SCREEN_NAME']),
    read_probe_passed: false,
    error_code: 'missing_salesiq_configuration',
  });
} else {
  const base = `${serverUri.replace(/\/$/, '')}/api/v2/${encodeURIComponent(screenName)}`;
  const url = brandId ? `${base}/apps/${encodeURIComponent(brandId)}` : `${base}/apps`;
  const response = await fetchWithTimeout(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
  });
  const payload = response.ok ? null : ((await response.json().catch(() => ({}))) as { code?: string; error_code?: string });

  printProbe('zoho-salesiq', {
    configured: true,
    credentials_valid: true,
    provider_reachable: true,
    module_available: response.ok,
    read_probe_passed: response.ok,
    status_code: response.status,
    error_code: payload?.code || payload?.error_code || null,
    write_probe_enabled: false,
  });
}
