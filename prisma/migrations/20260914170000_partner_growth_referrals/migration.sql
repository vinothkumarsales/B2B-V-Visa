-- AlterEnum
ALTER TYPE "WalletLedgerType" ADD VALUE IF NOT EXISTS 'REFERRAL_REWARD';

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ONBOARDED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReferralRewardStatus" AS ENUM ('ESTIMATED', 'PENDING', 'APPROVED', 'CREDITED', 'REVERSED', 'DISPUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReferralRewardCondition" AS ENUM ('ONBOARDING', 'INITIAL_PAYMENT', 'FULL_PAYMENT', 'SERVICE_SUBMISSION', 'SERVICE_COMPLETION', 'MANUAL_APPROVAL');

-- AlterTable
ALTER TABLE "WalletLedgerEntry" ADD COLUMN IF NOT EXISTS "referralId" TEXT;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referralCode_key" ON "Referral"("referralCode");
CREATE INDEX IF NOT EXISTS "Referral_partnerAgencyId_status_idx" ON "Referral"("partnerAgencyId", "status");
CREATE INDEX IF NOT EXISTS "Referral_partnerUid_idx" ON "Referral"("partnerUid");
CREATE INDEX IF NOT EXISTS "Referral_clientEmail_idx" ON "Referral"("clientEmail");
CREATE INDEX IF NOT EXISTS "Referral_clientMobile_idx" ON "Referral"("clientMobile");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReferralEvent_referralId_createdAt_idx" ON "ReferralEvent"("referralId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE INDEX IF NOT EXISTS "ReferralLink_partnerAgencyId_idx" ON "ReferralLink"("partnerAgencyId");
CREATE INDEX IF NOT EXISTS "ReferralLink_partnerUid_idx" ON "ReferralLink"("partnerUid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_productId_isActive_idx" ON "ReferralRewardRule"("productId", "isActive");
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_productCategory_isActive_idx" ON "ReferralRewardRule"("productCategory", "isActive");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_partnerAgencyId_fkey') THEN
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerAgencyId_fkey" FOREIGN KEY ("partnerAgencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_productId_fkey') THEN
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VisaProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referralLinkId_fkey') THEN
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_rewardRuleId_fkey') THEN
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_rewardRuleId_fkey" FOREIGN KEY ("rewardRuleId") REFERENCES "ReferralRewardRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralEvent_referralId_fkey') THEN
        ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralLink_partnerAgencyId_fkey') THEN
        ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_partnerAgencyId_fkey" FOREIGN KEY ("partnerAgencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralLink_productId_fkey') THEN
        ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VisaProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WalletLedgerEntry_referralId_fkey') THEN
        ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
