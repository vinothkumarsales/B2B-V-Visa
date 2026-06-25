export type AppMode = 'demo' | 'production';

export function getAppMode(): AppMode {
  const mode = process.env.NEXT_PUBLIC_APP_MODE || process.env.APP_MODE || 'demo';
  return mode === 'production' ? 'production' : 'demo';
}

export function isDemoMode() {
  return getAppMode() === 'demo';
}

export function requireProductionConfig() {
  if (getAppMode() !== 'production') return;

  const required = ['DATABASE_URL', 'SESSION_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing production configuration: ${missing.join(', ')}`);
  }
}
