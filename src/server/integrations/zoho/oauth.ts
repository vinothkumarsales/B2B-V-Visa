import { env } from '@/lib/env';

const TOKEN_SAFETY_WINDOW_MS = 90_000;
const TOKEN_TIMEOUT_MS = 12_000;

type ZohoTokenState = {
  accessToken: string;
  expiresAt: number;
};

type ZohoTokenResponse = {
  access_token?: string;
  expires_in?: number;
  api_domain?: string;
  error?: string;
};

let tokenState: ZohoTokenState | null = null;
let refreshInFlight: Promise<ZohoTokenState> | null = null;

export type ZohoReadiness = {
  configured: boolean;
  credentialsValid: boolean | null;
  providerReachable: boolean | null;
  reason?: string;
};

export function getZohoCrmReadiness(): ZohoReadiness {
  const configured = Boolean(
    env.ZOHO_CRM_CLIENT_ID &&
      env.ZOHO_CRM_CLIENT_SECRET &&
      env.ZOHO_CRM_REFRESH_TOKEN,
  );

  return {
    configured,
    credentialsValid: null,
    providerReachable: null,
    reason: configured ? undefined : 'missing_zoho_crm_credentials',
  };
}

export function getZohoReadiness(): ZohoReadiness {
  return getZohoCrmReadiness();
}

export async function getZohoAccessToken(): Promise<string> {
  return getZohoCrmAccessToken();
}

export async function getZohoCrmAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenState && tokenState.expiresAt - TOKEN_SAFETY_WINDOW_MS > now) {
    return tokenState.accessToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshZohoCrmToken().finally(() => {
      refreshInFlight = null;
    });
  }

  tokenState = await refreshInFlight;
  return tokenState.accessToken;
}

async function refreshZohoCrmToken(): Promise<ZohoTokenState> {
  if (!env.ZOHO_CRM_CLIENT_ID || !env.ZOHO_CRM_CLIENT_SECRET || !env.ZOHO_CRM_REFRESH_TOKEN) {
    throw sanitizedZohoError('ZOHO_NOT_CONFIGURED');
  }

  const params = new URLSearchParams({
    refresh_token: env.ZOHO_CRM_REFRESH_TOKEN,
    client_id: env.ZOHO_CRM_CLIENT_ID,
    client_secret: env.ZOHO_CRM_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const response = await fetchWithTimeout(`${env.ZOHO_CRM_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    body: params,
  });
  const data = (await response.json().catch(() => ({}))) as ZohoTokenResponse;

  if (!response.ok || !data.access_token) {
    throw sanitizedZohoError(data.error || 'ZOHO_TOKEN_REFRESH_FAILED');
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
}

export async function zohoCrmFetch(path: string, init: RequestInit = {}) {
  const token = await getZohoCrmAccessToken();
  const url = buildZohoCrmUrl(path);
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (response.status !== 401) return response;

  tokenState = null;
  const retryToken = await getZohoCrmAccessToken();
  return fetchWithTimeout(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${retryToken}`,
      ...(init.headers ?? {}),
    },
  });
}

export function buildZohoCrmUrl(path: string) {
  return `${env.ZOHO_CRM_API_BASE_URL.replace(/\/$/, '')}/crm/${env.ZOHO_CRM_API_VERSION}/${path.replace(/^\//, '')}`;
}

export async function zohoProductFetch(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
) {
  const token = await getZohoAccessToken();
  const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (response.status !== 401) return response;

  tokenState = null;
  const retryToken = await getZohoAccessToken();
  return fetchWithTimeout(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${retryToken}`,
      ...(init.headers ?? {}),
    },
  });
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizedZohoError(code: string) {
  const error = new Error(`Zoho provider error: ${code}`);
  error.name = 'ZohoProviderError';
  return error;
}
