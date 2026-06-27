import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const moduleName = process.env.ZOHO_CRM_TRAVEL_AGENTS_MODULE || 'Travel_Agents';

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('travel-agent-read', {
    configured: false,
    credentials_valid: false,
    provider_reachable: false,
    module_available: false,
    read_probe_passed: false,
    error_code: 'missing_or_invalid_zoho_credentials',
  });
  process.exit(0);
}

const baseUrl = (process.env.ZOHO_CRM_API_BASE_URL || 'https://www.zohoapis.in').replace(/\/$/, '');
const response = await fetchWithTimeout(`${baseUrl}/crm/v2/${moduleName}?page=1&per_page=1`, {
  headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
});

printProbe('travel-agent-read', {
  configured: true,
  credentials_valid: true,
  provider_reachable: true,
  module_available: response.ok,
  read_probe_passed: response.ok,
  status_code: response.status,
  write_probe_enabled: false,
});
