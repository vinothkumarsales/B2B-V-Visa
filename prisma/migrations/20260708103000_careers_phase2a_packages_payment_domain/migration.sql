-- Careers Phase 2A: persisted package catalogue and payment/subscription domain only.
CREATE TYPE "CareerPackageStatus" AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE "CareerPaymentIntentStatus" AS ENUM (
  'draft',
  'awaiting_checkout',
  'checkout_created',
  'payment_pending',
  'paid',
  'failed',
  'cancelled',
  'expired'
);

CREATE TYPE "CareerSubscriptionStatus" AS ENUM (
  'draft',
  'pending_payment',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

CREATE TABLE "CareerServicePackage" (
  "id" TEXT NOT NULL,
  "code" "CareerServicePackageCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "CareerPackageStatus" NOT NULL DEFAULT 'draft',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "features" JSONB NOT NULL,
  "quotas" JSONB NOT NULL,
  "supportedRegions" JSONB NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerServicePackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerPackagePrice" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "billingMode" TEXT NOT NULL DEFAULT 'one_time',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerPackagePrice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CareerServiceRequest" ADD COLUMN "packageId" TEXT;

CREATE TABLE "CareerPricingSnapshot" (
  "id" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "packageCode" "CareerServicePackageCode" NOT NULL,
  "packageName" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "billingMode" TEXT NOT NULL,
  "features" JSONB NOT NULL,
  "quotas" JSONB NOT NULL,
  "sourcePriceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerPricingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerPaymentIntent" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "status" "CareerPaymentIntentStatus" NOT NULL DEFAULT 'draft',
  "provider" TEXT NOT NULL DEFAULT 'configuration_only',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "pricingSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerPaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerSubscription" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "status" "CareerSubscriptionStatus" NOT NULL DEFAULT 'draft',
  "packageCode" "CareerServicePackageCode" NOT NULL,
  "currency" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerServicePackage_code_key" ON "CareerServicePackage"("code");
CREATE UNIQUE INDEX "CareerPaymentIntent_idempotencyKey_key" ON "CareerPaymentIntent"("idempotencyKey");
CREATE INDEX "CareerServicePackage_status_displayOrder_idx" ON "CareerServicePackage"("status", "displayOrder");
CREATE INDEX "CareerServicePackage_isPublic_status_idx" ON "CareerServicePackage"("isPublic", "status");
CREATE INDEX "CareerPackagePrice_packageId_currency_isActive_idx" ON "CareerPackagePrice"("packageId", "currency", "isActive");
CREATE INDEX "CareerServiceRequest_packageId_idx" ON "CareerServiceRequest"("packageId");
CREATE INDEX "CareerServiceRequest_paymentStatus_activationStatus_idx" ON "CareerServiceRequest"("paymentStatus", "activationStatus");
CREATE INDEX "CareerPricingSnapshot_serviceRequestId_createdAt_idx" ON "CareerPricingSnapshot"("serviceRequestId", "createdAt");
CREATE INDEX "CareerPaymentIntent_candidateId_status_idx" ON "CareerPaymentIntent"("candidateId", "status");
CREATE INDEX "CareerPaymentIntent_serviceRequestId_status_idx" ON "CareerPaymentIntent"("serviceRequestId", "status");
CREATE INDEX "CareerSubscription_candidateId_status_idx" ON "CareerSubscription"("candidateId", "status");
CREATE INDEX "CareerSubscription_serviceRequestId_status_idx" ON "CareerSubscription"("serviceRequestId", "status");

ALTER TABLE "CareerPackagePrice" ADD CONSTRAINT "CareerPackagePrice_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CareerServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerServiceRequest" ADD CONSTRAINT "CareerServiceRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CareerServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerPricingSnapshot" ADD CONSTRAINT "CareerPricingSnapshot_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "CareerServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerPaymentIntent" ADD CONSTRAINT "CareerPaymentIntent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerPaymentIntent" ADD CONSTRAINT "CareerPaymentIntent_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "CareerServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerSubscription" ADD CONSTRAINT "CareerSubscription_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerSubscription" ADD CONSTRAINT "CareerSubscription_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "CareerServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CareerServicePackage" ("id", "code", "name", "description", "status", "displayOrder", "features", "quotas", "supportedRegions", "isPublic", "updatedAt")
VALUES
  (
    'career_pkg_europe_assist',
    'EUROPE_JOB_SEARCH_ASSIST',
    'Europe Job Search Assist',
    'Resume intake, role targeting, progress dashboard, and managed internal review.',
    'active',
    10,
    '["Resume intake","Role and country targeting","Progress dashboard","Internal review"]'::jsonb,
    '{"targetRoles":5,"targetCountries":5,"monthlyOpportunityReviews":25}'::jsonb,
    '["Europe"]'::jsonb,
    true,
    CURRENT_TIMESTAMP
  ),
  (
    'career_pkg_europe_pro',
    'EUROPE_JOB_SEARCH_PRO',
    'Europe Job Search Pro',
    'Deeper opportunity review, recruiter-draft preparation, and consultant workflow.',
    'active',
    20,
    '["Resume intake","Role and country targeting","Progress dashboard","Opportunity review","Recruiter draft preparation"]'::jsonb,
    '{"targetRoles":10,"targetCountries":10,"monthlyOpportunityReviews":60}'::jsonb,
    '["Europe"]'::jsonb,
    true,
    CURRENT_TIMESTAMP
  ),
  (
    'career_pkg_europe_premium',
    'EUROPE_JOB_SEARCH_PREMIUM',
    'Europe Job Search Premium',
    'Priority consultant handling and expanded employer-response support in later phases.',
    'active',
    30,
    '["Resume intake","Role and country targeting","Progress dashboard","Opportunity review","Recruiter draft preparation","Priority consultant handling"]'::jsonb,
    '{"targetRoles":15,"targetCountries":15,"monthlyOpportunityReviews":120}'::jsonb,
    '["Europe"]'::jsonb,
    true,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "CareerPackagePrice" ("id", "packageId", "currency", "amountMinor", "billingMode")
VALUES
  ('career_price_assist_inr', 'career_pkg_europe_assist', 'INR', 1499900, 'one_time'),
  ('career_price_assist_eur', 'career_pkg_europe_assist', 'EUR', 16900, 'one_time'),
  ('career_price_assist_usd', 'career_pkg_europe_assist', 'USD', 18900, 'one_time'),
  ('career_price_pro_inr', 'career_pkg_europe_pro', 'INR', 2999900, 'one_time'),
  ('career_price_pro_eur', 'career_pkg_europe_pro', 'EUR', 33900, 'one_time'),
  ('career_price_pro_usd', 'career_pkg_europe_pro', 'USD', 37900, 'one_time'),
  ('career_price_premium_inr', 'career_pkg_europe_premium', 'INR', 4999900, 'one_time'),
  ('career_price_premium_eur', 'career_pkg_europe_premium', 'EUR', 56900, 'one_time'),
  ('career_price_premium_usd', 'career_pkg_europe_premium', 'USD', 62900, 'one_time');

UPDATE "CareerServiceRequest"
SET "packageId" = CASE "packageCode"
  WHEN 'EUROPE_JOB_SEARCH_ASSIST' THEN 'career_pkg_europe_assist'
  WHEN 'EUROPE_JOB_SEARCH_PRO' THEN 'career_pkg_europe_pro'
  WHEN 'EUROPE_JOB_SEARCH_PREMIUM' THEN 'career_pkg_europe_premium'
END
WHERE "packageId" IS NULL;
