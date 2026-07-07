import { z } from 'zod';

const envWithAliases = {
  ...process.env,
  ZOHO_CRM_CLIENT_ID: process.env.ZOHO_CRM_CLIENT_ID || process.env.ZOHO_CLIENT_ID,
  ZOHO_CRM_CLIENT_SECRET: process.env.ZOHO_CRM_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET,
  ZOHO_CRM_REFRESH_TOKEN: process.env.ZOHO_CRM_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN,
  ZOHO_CRM_ACCOUNTS_URL:
    process.env.ZOHO_CRM_ACCOUNTS_URL || process.env.ZOHO_ACCOUNTS_BASE,
  ZOHO_CRM_API_BASE_URL:
    process.env.ZOHO_CRM_API_BASE_URL || process.env.ZOHO_API_DOMAIN || process.env.ZOHO_BASE_URL,
  ZOHO_PAYMENTS_CLIENT_ID:
    process.env.ZOHO_PAYMENTS_CLIENT_ID || process.env.ZOHO_PAYMENT_CLIENT_ID,
  ZOHO_PAYMENTS_CLIENT_SECRET:
    process.env.ZOHO_PAYMENTS_CLIENT_SECRET || process.env.ZOHO_PAYMENT_CLIENT_SECRET,
  ZOHO_PAYMENTS_REFRESH_TOKEN:
    process.env.ZOHO_PAYMENTS_REFRESH_TOKEN || process.env.ZOHO_PAYMENT_REFRESH_TOKEN,
  ZOHO_PAYMENTS_ACCOUNT_ID:
    process.env.ZOHO_PAYMENTS_ACCOUNT_ID ||
    process.env.ZOHO_PAYMENT_ACCOUNT_ID ||
    process.env.NEXT_PUBLIC_ZOHO_PAYMENT_ACCOUNT_ID,
  ZOHO_PAYMENTS_WEBHOOK_SECRET:
    process.env.ZOHO_PAYMENTS_WEBHOOK_SECRET || process.env.ZOHO_PAYMENT_WEBHOOK_SECRET,
};

const aliasConflicts = [
  ['ZOHO_CLIENT_ID', 'ZOHO_CRM_CLIENT_ID'],
  ['ZOHO_CLIENT_SECRET', 'ZOHO_CRM_CLIENT_SECRET'],
  ['ZOHO_REFRESH_TOKEN', 'ZOHO_CRM_REFRESH_TOKEN'],
  ['ZOHO_ACCOUNTS_BASE', 'ZOHO_CRM_ACCOUNTS_URL'],
  ['ZOHO_API_DOMAIN', 'ZOHO_CRM_API_BASE_URL'],
  ['ZOHO_CLIENT_ID', 'ZOHO_PAYMENTS_CLIENT_ID'],
  ['ZOHO_CLIENT_SECRET', 'ZOHO_PAYMENTS_CLIENT_SECRET'],
  ['ZOHO_REFRESH_TOKEN', 'ZOHO_PAYMENTS_REFRESH_TOKEN'],
  ['ZOHO_PAYMENT_ACCOUNT_ID', 'ZOHO_PAYMENTS_ACCOUNT_ID'],
  ['ZOHO_PAYMENT_WEBHOOK_SECRET', 'ZOHO_PAYMENTS_WEBHOOK_SECRET'],
] as const;

for (const [canonicalOrShared, productSpecific] of aliasConflicts) {
  const sharedValue = process.env[canonicalOrShared];
  const productValue = process.env[productSpecific];
  if (sharedValue && productValue && sharedValue !== productValue) {
    throw new Error(
      `Conflicting Zoho environment variables: ${canonicalOrShared} and ${productSpecific}`,
    );
  }
}

const envSchema = z.object({
  APP_MODE: z.enum(['demo', 'production']).default('demo'),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),

  ZOHO_CRM_CLIENT_ID: z.string().optional(),
  ZOHO_CRM_CLIENT_SECRET: z.string().optional(),
  ZOHO_CRM_REFRESH_TOKEN: z.string().optional(),
  ZOHO_CRM_ACCOUNTS_URL: z.string().url().default('https://accounts.zoho.in'),
  ZOHO_CRM_API_BASE_URL: z.string().url().default('https://www.zohoapis.in'),
  ZOHO_CRM_API_VERSION: z.string().default('v8'),
  ZOHO_CRM_TRAVEL_AGENTS_MODULE: z.string().default('Travel_Agents'),
  ZOHO_CRM_LEADS_MODULE: z.string().default('Leads'),
  ZOHO_CRM_CONTACTS_MODULE: z.string().default('Contacts'),
  ZOHO_CRM_ACCOUNTS_MODULE: z.string().default('Accounts'),
  ZOHO_CRM_DEALS_MODULE: z.string().default('Deals'),
  ZOHO_CRM_TASKS_MODULE: z.string().default('Tasks'),
  ZOHO_CRM_NOTES_MODULE: z.string().default('Notes'),
  ZOHO_CRM_TRANSACTIONS_MODULE: z.string().optional(),
  ZOHO_CRM_APPLICATIONS_MODULE: z.string().optional(),
  ZOHO_CRM_SERVICES_MODULE: z.string().default('Service_Requests'),


  ZOHO_CRM_CONTACT_DOCUMENT_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_DESCRIPTION_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_SERVICE_REQUESTED_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_FATHER_FIRST_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_FATHER_LAST_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_MOTHER_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_DESTINATION_COUNTRY_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_ADDRESS_LINE_1_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_ADDRESS_LINE_2_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_NUMBER_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_NATIONALITY_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_SEX_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_DOB_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_PLACE_OF_BIRTH_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_PLACE_OF_ISSUE_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_MARITAL_STATUS_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_ISSUE_DATE_FIELD: z.string().optional(),
  ZOHO_CRM_CONTACT_PASSPORT_EXPIRY_DATE_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_COUNTRY_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_VISA_TYPE_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_CATEGORY_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PORTAL_VISA_INTEREST_ID_FIELD: z.string().optional(),  ZOHO_CRM_LEAD_DOCUMENT_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_DESCRIPTION_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_SERVICE_REQUESTED_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_FATHER_FIRST_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_FATHER_LAST_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_MOTHER_NAME_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_DESTINATION_COUNTRY_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_ADDRESS_LINE_1_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_ADDRESS_LINE_2_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_NUMBER_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_NATIONALITY_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_SEX_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_DOB_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_PLACE_OF_BIRTH_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_PLACE_OF_ISSUE_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_MARITAL_STATUS_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_ISSUE_DATE_FIELD: z.string().optional(),
  ZOHO_CRM_LEAD_PASSPORT_EXPIRY_DATE_FIELD: z.string().optional(),
  ZOHO_CRM_TRAVEL_AGENT_PORTAL_ID_FIELD: z.string().optional(),
  ZOHO_CRM_TRAVEL_AGENT_GST_FIELD: z.string().optional(),
  ZOHO_CRM_TRAVEL_AGENT_PAN_FIELD: z.string().optional(),
  ZOHO_CRM_TRAVEL_AGENT_POSTAL_CODE_FIELD: z.string().optional(),
  ZOHO_CRM_TRAVEL_AGENT_SOURCE_FIELD: z.string().optional(),  ZOHO_BOOKS_ORGANIZATION_ID: z.string().optional(),
  ZOHO_BOOKS_API_BASE: z.string().url().default('https://www.zohoapis.in/books/v3'),
  ZOHO_SALESIQ_SERVER_URI: z.string().url().optional(),
  ZOHO_SALESIQ_SCREEN_NAME: z.string().optional(),
  ZOHO_SALESIQ_BRAND_ID: z.string().optional(),
  ZOHO_SALESIQ_WIDGET_CODE: z.string().optional(),

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

  CAREERS_SAAS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_PACKAGES_ENABLED: z.coerce.boolean().default(false),
  CAREERS_PAYMENTS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_CHECKOUT_ENABLED: z.coerce.boolean().default(false),
  CAREERS_PAYMENT_PROVIDER: z.enum(['fixture', 'razorpay', 'stripe']).default('fixture'),
  CAREERS_PAYMENT_MODE: z.enum(['fixture', 'sandbox', 'live']).default('fixture'),
  CAREERS_LIVE_PAYMENTS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_PAYMENT_WEBHOOKS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_FIXTURE_WEBHOOKS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_FIXTURE_WEBHOOK_SECRET: z.string().optional(),
  CAREERS_ONBOARDING_ENABLED: z.coerce.boolean().default(false),
  CAREERS_RESUME_UPLOAD_ENABLED: z.coerce.boolean().default(false),
  CAREERS_INTERNAL_CONSOLE_ENABLED: z.coerce.boolean().default(false),
  CAREERS_LIVE_DISCOVERY_ENABLED: z.coerce.boolean().default(false),
  CAREERS_APPLICATION_KIT_ENABLED: z.coerce.boolean().default(false),
  CAREERS_BROWSER_EXECUTION_ENABLED: z.coerce.boolean().default(false),
  CAREERS_AUTO_SUBMIT_ENABLED: z.coerce.boolean().default(false),
  CAREERS_EMAIL_DRAFTS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_EMAIL_SEND_ENABLED: z.coerce.boolean().default(false),
  CAREERS_REPLY_SYNC_ENABLED: z.coerce.boolean().default(false),
  CAREERS_CRM_SYNC_ENABLED: z.coerce.boolean().default(false),
  CAREERS_WORKDRIVE_UPLOAD_ENABLED: z.coerce.boolean().default(false),
  CAREERS_GOOGLE_CALENDAR_ENABLED: z.coerce.boolean().default(false),
  CAREERS_OUTLOOK_CALENDAR_ENABLED: z.coerce.boolean().default(false),
  CAREERS_ZOHO_CALENDAR_ENABLED: z.coerce.boolean().default(false),
  CAREERS_GOOGLE_MEET_ENABLED: z.coerce.boolean().default(false),
  CAREERS_ZOOM_ENABLED: z.coerce.boolean().default(false),
  CAREERS_TEAMS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_CALENDAR_EVENT_CREATION_ENABLED: z.coerce.boolean().default(false),
  CAREERS_CALENDAR_REMINDERS_ENABLED: z.coerce.boolean().default(false),
  CAREERS_EMPLOYER_RESPONSE_SYNC_ENABLED: z.coerce.boolean().default(false),
  CAREERS_INTERVIEW_DETECTION_ENABLED: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(envWithAliases);

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
