import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const COMPLETE_SCHEMA_SQL = `
-- 1. Agency columns
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "billingType" TEXT DEFAULT 'NON_GST';
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "vvisaUid" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "loginCount" INTEGER DEFAULT 0;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastActiveCountry" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastActivePage" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastSearchedCountry" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "lastViewedProduct" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "totalVisasSubmitted" INTEGER DEFAULT 0;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "totalRevenueMinor" BIGINT DEFAULT 0;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "disabledVisaCategories" JSONB;

-- Agency vvisaUid unique index
CREATE UNIQUE INDEX IF NOT EXISTS "Agency_vvisaUid_key" ON "Agency"("vvisaUid");

-- 2. User columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aadhaarName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aadhaarAddress" TEXT;

-- 3. WalletLedgerType enum value
ALTER TYPE "WalletLedgerType" ADD VALUE IF NOT EXISTS 'REFERRAL_REWARD';
ALTER TABLE "WalletLedgerEntry" ADD COLUMN IF NOT EXISTS "referralId" TEXT;

-- 4. Referral Enums
DO $$ BEGIN
    CREATE TYPE "ReferralStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ONBOARDED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReferralRewardStatus" AS ENUM ('ESTIMATED', 'PENDING', 'APPROVED', 'CREDITED', 'REVERSED', 'DISPUTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReferralRewardCondition" AS ENUM ('ONBOARDING', 'INITIAL_PAYMENT', 'FULL_PAYMENT', 'SERVICE_SUBMISSION', 'SERVICE_COMPLETION', 'MANUAL_APPROVAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Referral Tables
CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "partnerAgencyId" TEXT NOT NULL,
    "partnerUid" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "referralLinkId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientMobile" TEXT NOT NULL,
    "clientWhatsapp" TEXT,
    "clientEmail" TEXT NOT NULL,
    "clientCountry" TEXT,
    "clientCity" TEXT,
    "clientNationality" TEXT DEFAULT 'Indian',
    "clientLanguage" TEXT,
    "notes" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT true,
    "travelDate" TIMESTAMP(3),
    "numberOfApplicants" INTEGER DEFAULT 1,
    "urgency" TEXT,
    "passportAvailable" BOOLEAN,
    "budget" TEXT,
    "existingRefusal" BOOLEAN,
    "attachments" JSONB,
    "status" "ReferralStatus" NOT NULL DEFAULT 'NEW',
    "internalStatus" TEXT,
    "duplicateFlag" BOOLEAN NOT NULL DEFAULT false,
    "assignedAdvisor" TEXT,
    "nextAction" TEXT,
    "rewardAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "rewardStatus" "ReferralRewardStatus" NOT NULL DEFAULT 'ESTIMATED',
    "rewardRuleId" TEXT,
    "rewardCondition" "ReferralRewardCondition" NOT NULL DEFAULT 'FULL_PAYMENT',
    "rewardApprovedAt" TIMESTAMP(3),
    "rewardCreditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralEvent" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "stage" "ReferralStatus",
    "event" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "partnerVisibleNote" TEXT,
    "internalNote" TEXT,
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "partnerAgencyId" TEXT NOT NULL,
    "partnerUid" TEXT NOT NULL,
    "productId" TEXT,
    "campaign" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "submittedLeads" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralRewardRule" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "productCategory" TEXT,
    "rewardType" TEXT NOT NULL DEFAULT 'FIXED',
    "rewardAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "rewardCondition" "ReferralRewardCondition" NOT NULL DEFAULT 'FULL_PAYMENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferralRewardRule_pkey" PRIMARY KEY ("id")
);

-- Referral Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referralCode_key" ON "Referral"("referralCode");
CREATE INDEX IF NOT EXISTS "Referral_partnerAgencyId_status_idx" ON "Referral"("partnerAgencyId", "status");
CREATE INDEX IF NOT EXISTS "Referral_partnerUid_idx" ON "Referral"("partnerUid");
CREATE INDEX IF NOT EXISTS "Referral_clientEmail_idx" ON "Referral"("clientEmail");
CREATE INDEX IF NOT EXISTS "Referral_clientMobile_idx" ON "Referral"("clientMobile");
CREATE INDEX IF NOT EXISTS "ReferralEvent_referralId_createdAt_idx" ON "ReferralEvent"("referralId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE INDEX IF NOT EXISTS "ReferralLink_partnerAgencyId_idx" ON "ReferralLink"("partnerAgencyId");
CREATE INDEX IF NOT EXISTS "ReferralLink_partnerUid_idx" ON "ReferralLink"("partnerUid");
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_productId_isActive_idx" ON "ReferralRewardRule"("productId", "isActive");
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_productCategory_isActive_idx" ON "ReferralRewardRule"("productCategory", "isActive");

-- 6. Vendor & Marketplace Enums
DO $$ BEGIN
    CREATE TYPE "VendorKycStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFICATION_PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "VendorStatus" AS ENUM ('DRAFT', 'VERIFICATION_PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DEACTIVATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MarketplaceProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MarketplaceSourceType" AS ENUM ('PLATFORM', 'VENDOR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. Vendor & Marketplace Tables
CREATE TABLE IF NOT EXISTS "VendorProfile" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT DEFAULT 'PVT_LTD',
    "contactPerson" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gstNumber" TEXT,
    "panCard" TEXT,
    "categories" JSONB,
    "kycStatus" "VendorKycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "vendorStatus" "VendorStatus" NOT NULL DEFAULT 'DRAFT',
    "digioKycId" TEXT,
    "digioKycStatus" TEXT,
    "digioWorkflowName" TEXT DEFAULT 'Vendor Onboarding',
    "kycStartedAt" TIMESTAMP(3),
    "kycCompletedAt" TIMESTAMP(3),
    "kycExpiresAt" TIMESTAMP(3),
    "kycFailureReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "reputationScore" INTEGER NOT NULL DEFAULT 100,
    "totalOrdersFulfilled" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VendorAgreementAcceptance" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL DEFAULT 'v1.0-vendor-marketplace',
    "penaltyMaxAmountMinor" BIGINT NOT NULL DEFAULT 100000000,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT true,
    "fraudDeclarationAccepted" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorAgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketplaceProduct" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "sourceType" "MarketplaceSourceType" NOT NULL DEFAULT 'VENDOR',
    "status" "MarketplaceProductStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "inclusions" JSONB,
    "exclusions" JSONB,
    "destinationCountry" TEXT,
    "cityOrRegion" TEXT,
    "validityDays" INTEGER DEFAULT 30,
    "processingTimeDays" INTEGER DEFAULT 3,
    "cancellationPolicy" TEXT,
    "termsAndConditions" TEXT,
    "basePriceMinor" INTEGER NOT NULL,
    "gstMinor" INTEGER NOT NULL,
    "platformFeeMinor" INTEGER NOT NULL,
    "sellingPriceMinor" INTEGER NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'PER_PERSON',
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 100,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "buyerAgencyId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "basePriceMinor" INTEGER NOT NULL,
    "gstMinor" INTEGER NOT NULL,
    "platformFeeMinor" INTEGER NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "travellerDetails" JSONB,
    "notes" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VendorRating" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorAgencyId" TEXT NOT NULL,
    "serviceQualityRating" INTEGER NOT NULL,
    "responseTimeRating" INTEGER NOT NULL,
    "accuracyRating" INTEGER NOT NULL,
    "overallRating" DOUBLE PRECISION NOT NULL,
    "reviewText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorRating_pkey" PRIMARY KEY ("id")
);

-- Vendor & Marketplace Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_agencyId_key" ON "VendorProfile"("agencyId");
CREATE INDEX IF NOT EXISTS "VendorProfile_kycStatus_idx" ON "VendorProfile"("kycStatus");
CREATE INDEX IF NOT EXISTS "VendorProfile_vendorStatus_idx" ON "VendorProfile"("vendorStatus");
CREATE INDEX IF NOT EXISTS "VendorAgreementAcceptance_vendorProfileId_idx" ON "VendorAgreementAcceptance"("vendorProfileId");
CREATE INDEX IF NOT EXISTS "VendorAgreementAcceptance_userId_idx" ON "VendorAgreementAcceptance"("userId");
CREATE INDEX IF NOT EXISTS "MarketplaceProduct_category_status_idx" ON "MarketplaceProduct"("category", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceProduct_sourceType_status_idx" ON "MarketplaceProduct"("sourceType", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceProduct_vendorProfileId_idx" ON "MarketplaceProduct"("vendorProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_orderNumber_key" ON "MarketplaceOrder"("orderNumber");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_buyerAgencyId_status_idx" ON "MarketplaceOrder"("buyerAgencyId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_vendorProfileId_status_idx" ON "MarketplaceOrder"("vendorProfileId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorRating_orderId_key" ON "VendorRating"("orderId");
CREATE INDEX IF NOT EXISTS "VendorRating_vendorProfileId_idx" ON "VendorRating"("vendorProfileId");
`;

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;

    if (line.includes('$$')) {
      const matches = line.match(/\$\$/g);
      if (matches && matches.length % 2 === 1) {
        inDollarQuote = !inDollarQuote;
      }
    }

    current += line + '\n';

    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') {
        statements.push(stmt.replace(/;$/, ''));
      }
      current = '';
    }
  }
  if (current.trim()) {
    statements.push(current.trim().replace(/;$/, ''));
  }
  return statements;
}

export async function applyCompleteSchema() {
  console.log('Applying complete idempotent schema to database...');
  const statements = splitSqlStatements(COMPLETE_SCHEMA_SQL);
  console.log(`Parsed ${statements.length} SQL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (error) {
      console.error(`Failed at statement ${i + 1}:\n${stmt}\nError:`, error.message);
      throw error;
    }
  }
  console.log('✓ Successfully applied all statements.');
}

applyCompleteSchema()
  .catch((err) => {
    console.warn('[SCHEMA_SYNC_WARNING] Database schema sync skipped during build:', err.message);
    // Don't fail the build if database is unreachable during static phase; runtime bootstrap will catch it
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
