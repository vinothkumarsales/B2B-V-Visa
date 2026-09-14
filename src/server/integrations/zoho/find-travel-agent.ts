import { env } from '@/lib/env';
import { zohoCrmFetch } from './oauth';

export type ZohoTravelAgentMatch = {
  zohoRecordId: string;
  vvisaUid: string | null;
};

/**
 * Synchronously search Zoho CRM Travel Agents by email.
 * Called BEFORE creating a local Agency record during registration.
 *
 * Returns null  — no match found (new partner, safe to create)
 * Returns match — existing Zoho record; vvisaUid may be null if Zoho has no VVA UID yet
 * Throws ZohoCrmUnavailableError — Zoho API is unreachable (caller must return 503)
 */
export async function findZohoTravelAgentByEmail(
  email: string,
): Promise<ZohoTravelAgentMatch | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const module = env.ZOHO_CRM_TRAVEL_AGENTS_MODULE;
  const uidField = env.ZOHO_CRM_TRAVEL_AGENT_PORTAL_ID_FIELD ?? 'UID';

  const criteria = `(Email:equals:${normalizedEmail})`;
  const path = `/${module}/search?criteria=${encodeURIComponent(criteria)}&fields=id,Email,${encodeURIComponent(uidField)}`;

  let response: Response;
  try {
    response = await zohoCrmFetch(path);
  } catch (error) {
    // Network failure, token refresh failure, timeout, etc.
    const message = error instanceof Error ? error.message : String(error);
    const err = new Error(`ZOHO_UNREACHABLE: ${message}`);
    err.name = 'ZohoCrmUnavailableError';
    throw err;
  }

  // 204 = no records found, 404 = module not found
  if (response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const err = new Error(`ZOHO_SEARCH_FAILED_${response.status}`);
    err.name = 'ZohoCrmUnavailableError';
    throw err;
  }

  type ZohoRecord = { id?: string; [key: string]: unknown };
  const payload = (await response.json().catch(() => ({}))) as { data?: ZohoRecord[] };
  const first = payload.data?.[0];
  if (!first?.id) return null;

  const zohoRecordId = String(first.id);
  const rawUid = first[uidField];
  const vvisaUid =
    typeof rawUid === 'string' && rawUid.trim().startsWith('VVA') ? rawUid.trim() : null;

  return { zohoRecordId, vvisaUid };
}
