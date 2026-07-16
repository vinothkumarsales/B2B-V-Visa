ALTER TABLE "Agency"
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "partnerTier" TEXT,
  ADD COLUMN "pricingPlan" TEXT,
  ADD COLUMN "accountManager" TEXT;

CREATE TABLE "PartnerAdminNote" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "authorUid" TEXT NOT NULL,
  "authorEmail" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerAdminNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnerAdminNote_agencyId_createdAt_idx" ON "PartnerAdminNote"("agencyId", "createdAt");
ALTER TABLE "PartnerAdminNote" ADD CONSTRAINT "PartnerAdminNote_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
