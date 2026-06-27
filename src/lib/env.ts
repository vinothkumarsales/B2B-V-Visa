import { z } from 'zod';

const envSchema = z.object({
  APP_MODE: z.enum(['demo', 'production']).default('demo'),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),

  ZOHO_CRM_CLIENT_ID: z.string().optional(),
  ZOHO_CRM_CLIENT_SECRET: z.string().optional(),
  ZOHO_CRM_REFRESH_TOKEN: z.string().optional(),
  ZOHO_CRM_ACCOUNTS_URL: z.string().url().default('https://accounts.zoho.in'),
  ZOHO_CRM_API_BASE_URL: z.string().url().default('https://www.zohoapis.in'),
  ZOHO_CRM_TRAVEL_AGENTS_MODULE: z.string().default('Travel_Agents'),
  ZOHO_CRM_LEADS_MODULE: z.string().default('Leads'),
  ZOHO_CRM_CONTACTS_MODULE: z.string().default('Contacts'),
  ZOHO_CRM_DEALS_MODULE: z.string().default('Deals'),
  ZOHO_CRM_TASKS_MODULE: z.string().default('Tasks'),
  ZOHO_CRM_NOTES_MODULE: z.string().default('Notes'),
  ZOHO_CRM_TRANSACTIONS_MODULE: z.string().optional(),
  ZOHO_CRM_APPLICATIONS_MODULE: z.string().optional(),
  ZOHO_CRM_SERVICES_MODULE: z.string().optional(),

  ZOHO_PAYMENTS_CLIENT_ID: z.string().optional(),
  ZOHO_PAYMENTS_CLIENT_SECRET: z.string().optional(),
  ZOHO_PAYMENTS_REFRESH_TOKEN: z.string().optional(),
  ZOHO_PAYMENTS_ACCOUNT_ID: z.string().optional(),
  ZOHO_PAYMENTS_ORG_ID: z.string().optional(),
  ZOHO_PAYMENTS_API_BASE_URL: z.string().url().optional(),
  ZOHO_PAYMENTS_WEBHOOK_SECRET: z.string().optional(),

  DIGIO_CLIENT_ID: z.string().optional(),
  DIGIO_CLIENT_SECRET: z.string().optional(),
  DIGIO_BASE_URL: z.string().url().default('https://api.digio.in'),
  DIGIO_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs', 'azure']).default('local'),
  STORAGE_PRIVATE_ROOT: z.string().default('upload/private'),

  CRM_SYNC_ENABLED: z.coerce.boolean().default(false),
  CRM_WRITE_ENABLED: z.coerce.boolean().default(false),
  CRM_ATTACHMENT_SYNC_ENABLED: z.coerce.boolean().default(false),
  CRM_ABANDONED_LEAD_ENABLED: z.coerce.boolean().default(false),
  CRM_ABANDONED_LEAD_DELAY_MINUTES: z.coerce.number().int().min(1).default(15),
  CRM_PAYMENT_CONVERSION_ENABLED: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

const data = parsed.data;

function assertRequired(
  keys: readonly (keyof typeof data)[],
  reason: string,
) {
  const missing = keys.filter((key) => !data[key]);
  if (missing.length > 0) {
    throw new Error(`Missing ${reason} environment variables: ${missing.join(', ')}`);
  }
}

const requiredWhenProduction = ['DATABASE_URL', 'SESSION_SECRET'] as const;
const requiredWhenCrmEnabled = [
  'ZOHO_CRM_CLIENT_ID',
  'ZOHO_CRM_CLIENT_SECRET',
  'ZOHO_CRM_REFRESH_TOKEN',
] as const;
const requiredWhenCrmWriteEnabled = [
  ...requiredWhenCrmEnabled,
  'ZOHO_CRM_TRAVEL_AGENTS_MODULE',
  'ZOHO_CRM_LEADS_MODULE',
  'ZOHO_CRM_CONTACTS_MODULE',
] as const;
const requiredWhenPaymentsLive = [
  'ZOHO_PAYMENTS_CLIENT_ID',
  'ZOHO_PAYMENTS_CLIENT_SECRET',
  'ZOHO_PAYMENTS_REFRESH_TOKEN',
  'ZOHO_PAYMENTS_ACCOUNT_ID',
  'ZOHO_PAYMENTS_WEBHOOK_SECRET',
] as const;
const requiredWhenAttachmentSyncEnabled = [
  ...requiredWhenCrmEnabled,
  'STORAGE_PRIVATE_ROOT',
] as const;

if (data.APP_MODE === 'production') {
  assertRequired(requiredWhenProduction, 'production');
}

if (data.CRM_SYNC_ENABLED) {
  assertRequired(requiredWhenCrmEnabled, 'CRM sync');
}

if (data.CRM_WRITE_ENABLED) {
  assertRequired(requiredWhenCrmWriteEnabled, 'CRM write');
}

if (data.CRM_ATTACHMENT_SYNC_ENABLED) {
  assertRequired(requiredWhenAttachmentSyncEnabled, 'CRM attachment sync');
}

if (data.CRM_PAYMENT_CONVERSION_ENABLED && !data.CRM_WRITE_ENABLED) {
  throw new Error('CRM_PAYMENT_CONVERSION_ENABLED requires CRM_WRITE_ENABLED=true');
}

if (data.ZOHO_PAYMENTS_API_BASE_URL) {
  assertRequired(requiredWhenPaymentsLive, 'Zoho Payments');
}

export const env = data;
export const isDemoMode = env.APP_MODE === 'demo';
export const isProductionMode = env.APP_MODE === 'production';
