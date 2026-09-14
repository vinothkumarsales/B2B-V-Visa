import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { validateZohoOAuthState } from '@/server/integrations/zoho/oauth-state';

export const dynamic = 'force-dynamic';

type ZohoTokenExchangeResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  api_domain?: string;
  token_type?: string;
  error?: string;
};

const TOKEN_HANDOFF_DIR = join(process.cwd(), '.runtime', 'zoho-oauth');
const TOKEN_HANDOFF_FILE = join(TOKEN_HANDOFF_DIR, 'latest-token-response.json');

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const redirectUri = `${url.origin}/api/integrations/zoho/oauth/callback`;

  if (error) {
    return redirectToStatus(url, 'failed', 'zoho_authorization_denied');
  }

  if (!code) {
    return redirectToStatus(url, 'failed', 'missing_authorization_code');
  }

  const stateSecret = getStateSecret();
  const stateValidation = stateSecret ? validateZohoOAuthState(state, stateSecret) : { valid: false };
  if (!stateValidation.valid) {
    return redirectToStatus(url, 'failed', 'invalid_oauth_state');
  }

  const isPaymentsTarget = stateValidation.target === 'payments';
  const clientId = isPaymentsTarget ? env.ZOHO_PAYMENTS_CLIENT_ID : env.ZOHO_CRM_CLIENT_ID;
  const clientSecret = isPaymentsTarget ? env.ZOHO_PAYMENTS_CLIENT_SECRET : env.ZOHO_CRM_CLIENT_SECRET;
  const accountsBase = env.ZOHO_CRM_ACCOUNTS_URL || 'https://accounts.zoho.in';

  if (!clientId || !clientSecret) {
    return redirectToStatus(url, 'failed', isPaymentsTarget ? 'zoho_payments_client_not_configured' : 'zoho_client_not_configured');
  }

  let tokenResponse = await exchangeAuthorizationCode({
    code,
    redirectUri,
    clientId,
    clientSecret,
    accountsBase,
  });

  // If initial exchange failed and other client credentials exist, try the other client
  if (!tokenResponse.refresh_token) {
    const fallbackClientId = isPaymentsTarget ? env.ZOHO_CRM_CLIENT_ID : env.ZOHO_PAYMENTS_CLIENT_ID;
    const fallbackClientSecret = isPaymentsTarget ? env.ZOHO_CRM_CLIENT_SECRET : env.ZOHO_PAYMENTS_CLIENT_SECRET;
    if (fallbackClientId && fallbackClientSecret && fallbackClientId !== clientId) {
      const fallbackResponse = await exchangeAuthorizationCode({
        code,
        redirectUri,
        clientId: fallbackClientId,
        clientSecret: fallbackClientSecret,
        accountsBase,
      });
      if (fallbackResponse.refresh_token) {
        tokenResponse = fallbackResponse;
      }
    }
  }

  if (!tokenResponse.refresh_token) {
    return redirectToStatus(url, 'failed', tokenResponse.error || 'refresh_token_not_returned');
  }

  await writeLocalTokenHandoff(tokenResponse, isPaymentsTarget ? 'payments' : 'crm');
  return redirectToStatus(url, 'success', 'refresh_token_stored_locally');
}

function getStateSecret() {
  return process.env.ZOHO_OAUTH_STATE_SECRET || process.env.SESSION_SECRET || env.ZOHO_CRM_CLIENT_SECRET;
}

async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  accountsBase: string;
}) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    code: input.code,
  });

  const response = await fetch(`${input.accountsBase.replace(/\/$/, '')}/oauth/v2/token`, {
    method: 'POST',
    body: params,
  });

  return (await response.json().catch(() => ({}))) as ZohoTokenExchangeResponse;
}

async function writeLocalTokenHandoff(response: ZohoTokenExchangeResponse, target: 'crm' | 'payments' = 'crm') {
  await mkdir(TOKEN_HANDOFF_DIR, { recursive: true });
  const payload = {
    target,
    createdAt: new Date().toISOString(),
    apiDomain: response.api_domain ?? null,
    tokenType: response.token_type ?? null,
    expiresIn: response.expires_in ?? null,
    refreshToken: response.refresh_token,
  };
  await writeFile(TOKEN_HANDOFF_FILE, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  if (target === 'payments' && response.refresh_token) {
    const envPath = join(process.cwd(), '.env.local');
    try {
      const { readFile } = await import('node:fs/promises');
      let envContent = await readFile(envPath, 'utf8');
      if (/^ZOHO_PAYMENT_REFRESH_TOKEN=.*$/m.test(envContent)) {
        envContent = envContent.replace(/^ZOHO_PAYMENT_REFRESH_TOKEN=.*$/m, `ZOHO_PAYMENT_REFRESH_TOKEN="${response.refresh_token}"`);
      } else {
        envContent += `\nZOHO_PAYMENT_REFRESH_TOKEN="${response.refresh_token}"\n`;
      }
      await writeFile(envPath, envContent, 'utf8');
    } catch {
      // Best-effort file sync
    }
  }
}

function redirectToStatus(sourceUrl: URL, status: 'success' | 'failed', reason: string) {
  const target = new URL('/integration-status', sourceUrl.origin);
  target.searchParams.set('provider', 'zoho');
  target.searchParams.set('status', status);
  target.searchParams.set('reason', reason);
  return NextResponse.redirect(target);
}
