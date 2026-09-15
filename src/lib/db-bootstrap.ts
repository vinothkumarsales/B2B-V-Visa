import { db } from './db';

let schemaEnsured = false;
let schemaPromise: Promise<void> | null = null;

/**
 * Ensures critical tables and columns exist in the PostgreSQL database.
 * Completely idempotent: uses IF NOT EXISTS and DO blocks.
 * Runs once per server process lifetime.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (schemaEnsured) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    try {
      const statements = [
        // Agency columns
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "billingType" TEXT DEFAULT 'NON_GST'`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "vvisaUid" TEXT`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3)`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "loginCount" INTEGER DEFAULT 0`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastActiveCountry" TEXT`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastActivePage" TEXT`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastSearchedCountry" TEXT`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastViewedProduct" TEXT`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "totalVisasSubmitted" INTEGER DEFAULT 0`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "totalRevenueMinor" BIGINT DEFAULT 0`,
        `ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "disabledVisaCategories" JSONB`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Agency_vvisaUid_key" ON "Agency"("vvisaUid")`,

        // User columns
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aadhaarName" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aadhaarAddress" TEXT`,
      ];

      for (const stmt of statements) {
        await db.$executeRawUnsafe(stmt).catch((err) => {
          console.warn('[DB_BOOTSTRAP] Non-critical statement error:', err?.message);
        });
      }

      schemaEnsured = true;
      console.log('[DB_BOOTSTRAP] Critical database schema columns verified.');
    } catch (err) {
      console.warn('[DB_BOOTSTRAP] Schema verification failed (may lack DDL permissions):', err);
    } finally {
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}
