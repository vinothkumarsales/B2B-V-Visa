import { z } from 'zod';

const envSchema = z.object({
  APP_MODE: z.enum(['demo', 'production']).default('demo'),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  ZOHO_CRM_CLIENT_ID: z.string().optional(),
  ZOHO_CRM_CLIENT_SECRET: z.string().optional(),
  ZOHO_CRM_REFRESH_TOKEN: z.string().optional(),
  ZOHO_PAYMENTS_CLIENT_ID: z.string().optional(),
  ZOHO_PAYMENTS_CLIENT_SECRET: z.string().optional(),
  ZOHO_PAYMENTS_WEBHOOK_SECRET: z.string().optional(),
  DIGIO_CLIENT_ID: z.string().optional(),
  DIGIO_CLIENT_SECRET: z.string().optional(),
  STORAGE_PRIVATE_ROOT: z.string().default('upload/private'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

const data = parsed.data;

if (data.APP_MODE === 'production') {
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ZOHO_CRM_CLIENT_ID',
    'ZOHO_CRM_CLIENT_SECRET',
    'ZOHO_CRM_REFRESH_TOKEN',
    'ZOHO_PAYMENTS_CLIENT_ID',
    'ZOHO_PAYMENTS_CLIENT_SECRET',
    'ZOHO_PAYMENTS_WEBHOOK_SECRET',
    'DIGIO_CLIENT_ID',
    'DIGIO_CLIENT_SECRET',
  ] as const;

  const missing = required.filter((key) => !data[key]);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
}

export const env = data;
export const isDemoMode = env.APP_MODE === 'demo';
export const isProductionMode = env.APP_MODE === 'production';
