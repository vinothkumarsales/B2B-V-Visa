-- Admin console foundation: roles, support sessions, and partner-specific pricing overrides.
DO $$
BEGIN
  CREATE TYPE "AdminRole" AS ENUM (
    'super_admin',
    'catalog_admin',
    'operations_admin',
    'finance_admin',
    'support_admin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AdminImpersonationMode" AS ENUM (
    'view_only',
    'support',
    'operations'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AdminSessionStatus" AS ENUM (
    'active',
    'expired',
    'revoked',
    'ended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PartnerPriceOverrideStatus" AS ENUM (
    'draft',
    'active',
    'expired',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'support_admin',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminUser_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_userId_key"
  ON "AdminUser"("userId");

CREATE TABLE IF NOT EXISTS "AdminImpersonationSession" (
  "id" TEXT NOT NULL,
  "actorAdminUid" TEXT NOT NULL,
  "actorAdminEmail" TEXT NOT NULL,
  "subjectAgencyId" TEXT NOT NULL,
  "mode" "AdminImpersonationMode" NOT NULL,
  "reason" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "status" "AdminSessionStatus" NOT NULL DEFAULT 'active',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "AdminImpersonationSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminImpersonationSession_subjectAgencyId_fkey"
    FOREIGN KEY ("subjectAgencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminImpersonationSession_actorAdminUid_status_idx"
  ON "AdminImpersonationSession"("actorAdminUid", "status");
CREATE INDEX IF NOT EXISTS "AdminImpersonationSession_subjectAgencyId_status_idx"
  ON "AdminImpersonationSession"("subjectAgencyId", "status");

CREATE TABLE IF NOT EXISTS "PartnerPriceOverride" (
  "id" TEXT NOT NULL,
  "partnerUid" TEXT NOT NULL,
  "productId" TEXT,
  "countryCode" TEXT,
  "serviceCode" TEXT,
  "overrideType" TEXT NOT NULL,
  "valueMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "status" "PartnerPriceOverrideStatus" NOT NULL DEFAULT 'draft',
  "reason" TEXT NOT NULL,
  "internalNotes" TEXT,
  "createdByAdminUserId" TEXT NOT NULL,
  "approvedByAdminUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPriceOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerPriceOverride_partnerUid_fkey"
    FOREIGN KEY ("partnerUid") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerPriceOverride_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PartnerPriceOverride_partnerUid_status_idx"
  ON "PartnerPriceOverride"("partnerUid", "status");
CREATE INDEX IF NOT EXISTS "PartnerPriceOverride_productId_status_idx"
  ON "PartnerPriceOverride"("productId", "status");
