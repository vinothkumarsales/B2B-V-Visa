import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createZohoOAuthState } from '../../src/server/integrations/zoho/oauth-state.ts';

function loadLocalEnv() {
  for (const file of ['.env', '.env.local']) {
    const path = resolve(file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] ??= value;
    }
  }
}

loadLocalEnv();

const clientId = process.env.ZOHO_CLIENT_ID || process.env.ZOHO_CRM_CLIENT_ID;
const accountsBase = process.env.ZOHO_ACCOUNTS_BASE || process.env.ZOHO_CRM_ACCOUNTS_URL || 'https://accounts.zoho.in';
const redirectUri =
  process.argv.find((arg) => arg.startsWith('--redirect-uri='))?.split('=', 2)[1] ||
  process.env.ZOHO_OAUTH_REDIRECT_URI ||
  'http://localhost:3000/api/integrations/zoho/oauth/callback';
const scopeSet =
  process.argv.find((arg) => arg.startsWith('--scope-set='))?.split('=', 2)[1] ||
  'crm-core';
const stateSecret =
  process.env.ZOHO_OAUTH_STATE_SECRET ||
  process.env.SESSION_SECRET ||
  process.env.ZOHO_CLIENT_SECRET ||
  process.env.ZOHO_CRM_CLIENT_SECRET;

if (!clientId) {
  throw new Error('Missing ZOHO_CLIENT_ID');
}

if (!stateSecret) {
  throw new Error('Missing ZOHO_OAUTH_STATE_SECRET, SESSION_SECRET, or ZOHO_CLIENT_SECRET');
}

const scopeSets: Record<string, string[]> = {
  'crm-core': [
    'ZohoCRM.modules.ALL',
    'ZohoCRM.settings.ALL',
  ],
  'crm-granular': [
    'ZohoCRM.modules.ALL',
    'ZohoCRM.settings.modules.READ',
    'ZohoCRM.settings.fields.READ',
    'ZohoCRM.modules.attachments.ALL',
  ],
  books: [
    'ZohoBooks.settings.READ',
    'ZohoBooks.contacts.ALL',
    'ZohoBooks.invoices.ALL',
    'ZohoBooks.customerpayments.ALL',
    'ZohoBooks.creditnotes.ALL',
  ],
  salesiq: [
    'SalesIQ.apps.READ',
    'SalesIQ.visitors.READ',
    'SalesIQ.conversations.READ',
    'SalesIQ.operators.READ',
    'SalesIQ.departments.READ',
  ],
  payments: [
    // Zoho Payments scope names are account/product specific and are not
    // documented consistently like CRM/Books/SalesIQ. Keep this phase empty
    // until the accepted scope names are copied from the Payments API console.
  ],
};

const scopes = scopeSet
  .split(',')
  .flatMap((set) => scopeSets[set.trim()] ?? [set.trim()])
  .filter(Boolean);

const url = new URL(`${accountsBase.replace(/\/$/, '')}/oauth/v2/auth`);
url.searchParams.set('scope', scopes.join(','));
url.searchParams.set('client_id', clientId);
url.searchParams.set('response_type', 'code');
url.searchParams.set('access_type', 'offline');
url.searchParams.set('prompt', 'consent');
url.searchParams.set('redirect_uri', redirectUri);
url.searchParams.set('state', createZohoOAuthState(stateSecret));

console.log('Zoho OAuth approval URL');
console.log(url.toString());
console.log('');
console.log('Redirect URI used');
console.log(redirectUri);
console.log('');
console.log('Scopes requested');
for (const scope of scopes) console.log(`- ${scope}`);
