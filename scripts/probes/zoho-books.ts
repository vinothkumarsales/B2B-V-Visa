import { fetchWithTimeout, getZohoCrmAccessTokenForProbe, loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const token = await getZohoCrmAccessTokenForProbe();
const organizationId = process.env.ZOHO_BOOKS_ORGANIZATION_ID || process.env.ZOHO_PAYMENTS_ORG_ID;
const booksBase = process.env.ZOHO_BOOKS_API_BASE || 'https://www.zohoapis.in/books/v3';

if (!token.ok || !('token' in token) || !token.token) {
  printProbe('zoho-books', {
    configured: Boolean(organizationId),
    credentials_valid: false,
    provider_reachable: false,
    required_keys: requiredEnvPresent(['ZOHO_BOOKS_ORGANIZATION_ID']),
    read_probe_passed: false,
    error_code: token.errorCode || 'missing_or_invalid_zoho_credentials',
  });
} else if (!organizationId) {
  printProbe('zoho-books', {
    configured: false,
    credentials_valid: true,
    provider_reachable: null,
    required_keys: requiredEnvPresent(['ZOHO_BOOKS_ORGANIZATION_ID']),
    read_probe_passed: false,
    error_code: 'missing_books_organization_id',
  });
} else {
  const response = await fetchWithTimeout(`${booksBase.replace(/\/$/, '')}/organizations?organization_id=${encodeURIComponent(organizationId)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token.token}` },
  });
  const payload = response.ok ? null : ((await response.json().catch(() => ({}))) as { code?: number; message?: string });

  printProbe('zoho-books', {
    configured: true,
    credentials_valid: true,
    provider_reachable: true,
    module_available: response.ok,
    read_probe_passed: response.ok,
    status_code: response.status,
    error_code: payload?.code == null ? null : String(payload.code),
    write_probe_enabled: false,
  });
}
