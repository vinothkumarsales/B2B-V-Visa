import { crmFieldMappings, getUnresolvedRequiredCrmFields } from '../../src/server/integrations/zoho/crm-field-mappings.ts';
import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const moduleEnv = {
  Travel_Agents: process.env.ZOHO_CRM_TRAVEL_AGENTS_MODULE || 'Travel_Agents',
  Leads: process.env.ZOHO_CRM_LEADS_MODULE || 'Leads',
  Contacts: process.env.ZOHO_CRM_CONTACTS_MODULE || 'Contacts',
} as const;

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('zoho-fields', {
    configured: false,
    credentials_valid: false,
    provider_reachable: false,
    field_mapping_valid: false,
    error_code: 'missing_or_invalid_zoho_credentials',
    unresolved_required_fields: getUnresolvedRequiredCrmFields().map(
      (field) => `${field.moduleKey}.${field.portalField}`,
    ),
  });
  process.exit(0);
}

const baseUrl = (process.env.ZOHO_CRM_API_BASE_URL || 'https://www.zohoapis.in').replace(/\/$/, '');
const checked: string[] = [];
const confirmed: string[] = [];
const missing: string[] = [];

for (const [mappingKey, moduleName] of Object.entries(moduleEnv)) {
  const response = await fetchWithTimeout(`${baseUrl}/crm/v2/settings/fields?module=${moduleName}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
  });
  if (!response.ok) {
    missing.push(`${mappingKey}:fields_endpoint_${response.status}`);
    continue;
  }

  const payload = (await response.json().catch(() => ({}))) as { fields?: Array<{ api_name?: string }> };
  const available = new Set((payload.fields ?? []).map((field) => field.api_name).filter(Boolean));
  const moduleMapping = crmFieldMappings[mappingKey as keyof typeof crmFieldMappings];
  for (const field of moduleMapping.fields) {
    if (!field.zohoFieldApiName) continue;
    const key = `${mappingKey}.${field.portalField}->${field.zohoFieldApiName}`;
    checked.push(key);
    if (available.has(field.zohoFieldApiName)) confirmed.push(key);
    else missing.push(key);
  }
}

const unresolved = getUnresolvedRequiredCrmFields().map(
  (field) => `${field.moduleKey}.${field.portalField}`,
);

printProbe('zoho-fields', {
  configured: true,
  credentials_valid: true,
  provider_reachable: true,
  field_mapping_valid: missing.length === 0 && unresolved.length === 0,
  confirmed_field_count: confirmed.length,
  checked_field_count: checked.length,
  missing_or_unconfirmed_fields: missing,
  unresolved_required_fields: unresolved,
});
