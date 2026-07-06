import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const modules = [
  process.env.ZOHO_CRM_TRAVEL_AGENTS_MODULE || 'Travel_Agents',
  process.env.ZOHO_CRM_SERVICES_MODULE || 'Service_Requests',
  process.env.ZOHO_CRM_LEADS_MODULE || 'Leads',
  process.env.ZOHO_CRM_CONTACTS_MODULE || 'Contacts',
  process.env.ZOHO_CRM_ACCOUNTS_MODULE || 'Accounts',
  process.env.ZOHO_CRM_DEALS_MODULE || 'Deals',
];

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('zoho-modules', {
    configured: false,
    credentials_valid: false,
    provider_reachable: false,
    modules_checked: modules,
    module_available: false,
    error_code: token.errorCode || 'missing_or_invalid_zoho_credentials',
  });
} else {
  const baseUrl = (process.env.ZOHO_CRM_API_BASE_URL || 'https://www.zohoapis.in').replace(/\/$/, '');
  const apiVersion = process.env.ZOHO_CRM_API_VERSION || 'v8';
  const results: string[] = [];

  for (const moduleName of modules) {
    const response = await fetchWithTimeout(`${baseUrl}/crm/${apiVersion}/${moduleName}?page=1&per_page=1&fields=id`, {
      headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
    });
    if (response.ok) {
      results.push(`${moduleName}:available`);
    } else {
      const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
      results.push(`${moduleName}:failed_${response.status}_${payload.code || 'unknown'}`);
    }
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
}
