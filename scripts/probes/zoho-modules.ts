import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const modules = [
  process.env.ZOHO_CRM_TRAVEL_AGENTS_MODULE || 'Travel_Agents',
  process.env.ZOHO_CRM_LEADS_MODULE || 'Leads',
  process.env.ZOHO_CRM_CONTACTS_MODULE || 'Contacts',
];

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('zoho-modules', {
    configured: false,
    credentials_valid: false,
    provider_reachable: false,
    modules_checked: modules,
    module_available: false,
    error_code: 'missing_or_invalid_zoho_credentials',
  });
  process.exit(0);
}

const baseUrl = (process.env.ZOHO_CRM_API_BASE_URL || 'https://www.zohoapis.in').replace(/\/$/, '');
const results: string[] = [];

for (const moduleName of modules) {
  const response = await fetchWithTimeout(`${baseUrl}/crm/v2/${moduleName}?page=1&per_page=1`, {
    headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
  });
  results.push(`${moduleName}:${response.ok ? 'available' : `failed_${response.status}`}`);
}

printProbe('zoho-modules', {
  configured: true,
  credentials_valid: true,
  provider_reachable: true,
  modules_checked: modules,
  module_results: results,
  module_available: results.every((result) => result.endsWith(':available')),
  write_probe_enabled: false,
});
