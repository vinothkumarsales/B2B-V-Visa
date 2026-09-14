import { getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();

printProbe('zoho-auth', {
  configured: token.ok || !('missing' in token),
  credentials_valid: token.ok,
  provider_reachable: 'status' in token ? token.status !== 0 : false,
  required_keys: requiredEnvPresent([
    'ZOHO_CRM_CLIENT_ID',
    'ZOHO_CRM_CLIENT_SECRET',
    'ZOHO_CRM_REFRESH_TOKEN',
  ]),
  status_code: 'status' in token ? token.status ?? null : null,
  error_code: 'errorCode' in token ? token.errorCode ?? null : null,
  missing_keys: 'missing' in token ? token.missing ?? [] : [],
});
