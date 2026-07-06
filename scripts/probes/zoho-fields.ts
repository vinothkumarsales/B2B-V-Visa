import { crmFieldMappings, getUnresolvedRequiredCrmFields } from '../../src/server/integrations/zoho/crm-field-mappings.ts';
import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const moduleEnv = {
  Travel_Agents: process.env.ZOHO_CRM_TRAVEL_AGENTS_MODULE || 'Travel_Agents',
  Service_Requests: process.env.ZOHO_CRM_SERVICES_MODULE || 'Service_Requests',
  Leads: process.env.ZOHO_CRM_LEADS_MODULE || 'Leads',
  Contacts: process.env.ZOHO_CRM_CONTACTS_MODULE || 'Contacts',
  Accounts: process.env.ZOHO_CRM_ACCOUNTS_MODULE || 'Accounts',
  Deals: process.env.ZOHO_CRM_DEALS_MODULE || 'Deals',
} as const;

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('zoho-fields', {
    configured: false,
    credentials_valid: false,
    provider_reachable: false,
    field_mapping_valid: false,
    error_code: token.errorCode || 'missing_or_invalid_zoho_credentials',
    unresolved_required_fields: getUnresolvedRequiredCrmFields().map(
      (field) => `${field.moduleKey}.${field.portalField}`,
    ),
  });
} else {
  const baseUrl = (process.env.ZOHO_CRM_API_BASE_URL || 'https://www.zohoapis.in').replace(/\/$/, '');
  const apiVersion = process.env.ZOHO_CRM_API_VERSION || 'v8';
  const checked: string[] = [];
  const confirmed: string[] = [];
  const missing: string[] = [];
  const candidatePassportFields: Record<string, Array<{ api_name: string; display_label?: string; data_type?: string }>> = {};
  const candidateNeedles = ['passport', 'document', 'dob', 'birth', 'expiry', 'expiration', 'issue', 'nationality', 'gender', 'sex', 'marital', 'service', 'destination', 'father', 'mother', 'address', 'description'];

  for (const [mappingKey, moduleName] of Object.entries(moduleEnv)) {
    const response = await fetchWithTimeout(`${baseUrl}/crm/${apiVersion}/settings/fields?module=${moduleName}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
    });
    if (!response.ok) {
      missing.push(`${mappingKey}:fields_endpoint_${response.status}`);
      continue;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      fields?: Array<{ api_name?: string; display_label?: string; data_type?: string }>;
    };
    const fields = payload.fields ?? [];
    if (mappingKey === 'Leads' || mappingKey === 'Contacts') {
      candidatePassportFields[mappingKey] = fields
        .filter((field) => {
          const haystack = `${field.api_name ?? ''} ${field.display_label ?? ''}`.toLowerCase();
          return candidateNeedles.some((needle) => haystack.includes(needle));
        })
        .map((field) => ({
          api_name: field.api_name ?? '',
          display_label: field.display_label,
          data_type: field.data_type,
        }))
        .filter((field) => field.api_name);
    }

    const available = new Set(fields.map((field) => field.api_name).filter(Boolean));
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
    candidate_passport_fields: candidatePassportFields,
  });
}
