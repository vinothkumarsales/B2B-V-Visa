-- Add production integration readiness state.
ALTER TYPE "IntegrationEventStatus" ADD VALUE IF NOT EXISTS 'RETRY';
ALTER TYPE "IntegrationEventStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "IntegrationEventStatus" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW_REQUIRED';
ALTER TYPE "IntegrationEventStatus" ADD VALUE IF NOT EXISTS 'FAILED_TERMINAL';

ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'EXTRACTION_PENDING';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'EXTRACTED';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'EXTRACTION_FAILED';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW_REQUIRED';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';

DO $$
BEGIN
  CREATE TYPE "VisaInterestStatus" AS ENUM (
    'SEARCHED',
    'SELECTED',
    'DETAILS_STARTED',
    'CHECKLIST_VIEWED',
    'PAYMENT_STARTED',
    'PAYMENT_PENDING',
    'PAYMENT_FAILED',
    'PAID',
    'APPLICATION_CREATED',
    'CONVERTED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "IntegrationEvent"
  ADD COLUMN IF NOT EXISTS "entityType" TEXT,
  ADD COLUMN IF NOT EXISTS "entityId" TEXT,
  ADD COLUMN IF NOT EXISTS "aggregateId" TEXT,
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT,
  ADD COLUMN IF NOT EXISTS "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "payloadHash" TEXT,
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "lastErrorCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "providerRecordId" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "IntegrationEvent_status_nextAttemptAt_idx"
  ON "IntegrationEvent"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "IntegrationEvent_entityType_entityId_idx"
  ON "IntegrationEvent"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "IntegrationEvent_aggregateId_idx"
  ON "IntegrationEvent"("aggregateId");

CREATE TABLE IF NOT EXISTS "CrmEntityMapping" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "portalEntityType" TEXT NOT NULL,
  "portalEntityId" TEXT NOT NULL,
  "zohoModule" TEXT NOT NULL,
  "zohoRecordId" TEXT NOT NULL,
  "syncStatus" "IntegrationEventStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncedAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "lastSuccessfulPayloadHash" TEXT,
  "lastProviderResponseCode" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmEntityMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmEntityMapping_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CrmEntityMapping_portalEntityType_portalEntityId_zohoModule_key"
  ON "CrmEntityMapping"("portalEntityType", "portalEntityId", "zohoModule");
CREATE INDEX IF NOT EXISTS "CrmEntityMapping_zohoModule_zohoRecordId_idx"
  ON "CrmEntityMapping"("zohoModule", "zohoRecordId");

CREATE TABLE IF NOT EXISTS "VisaInterest" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "userId" TEXT,
  "countryCode" TEXT,
  "countryName" TEXT NOT NULL,
  "visaTypeId" TEXT,
  "visaTypeName" TEXT,
  "category" TEXT,
  "citizenship" TEXT,
  "travelDate" TIMESTAMP(3),
  "numberOfTravellers" INTEGER,
  "applicantName" TEXT,
  "applicantMobile" TEXT,
  "applicantEmail" TEXT,
  "sourceRoute" TEXT,
  "searchSessionId" TEXT NOT NULL,
  "status" "VisaInterestStatus" NOT NULL DEFAULT 'SEARCHED',
  "paymentOrderId" TEXT,
  "applicationId" TEXT,
  "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leadEligibleAt" TIMESTAMP(3),
  "crmLeadId" TEXT,
  "crmSyncStatus" "IntegrationEventStatus",
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VisaInterest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VisaInterest_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VisaInterest_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "VisaInterest_agencyId_status_idx"
  ON "VisaInterest"("agencyId", "status");
CREATE INDEX IF NOT EXISTS "VisaInterest_agencyId_searchSessionId_countryName_visaTypeId_idx"
  ON "VisaInterest"("agencyId", "searchSessionId", "countryName", "visaTypeId");

CREATE TABLE IF NOT EXISTS "DocumentCrmAttachment" (
  "id" TEXT NOT NULL,
  "portalDocumentId" TEXT NOT NULL,
  "crmModule" TEXT NOT NULL,
  "crmRecordId" TEXT NOT NULL,
  "crmAttachmentId" TEXT,
  "checksum" TEXT NOT NULL,
  "syncStatus" "IntegrationEventStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentCrmAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentCrmAttachment_portalDocumentId_fkey"
    FOREIGN KEY ("portalDocumentId") REFERENCES "ApplicationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentCrmAttachment_portalDocumentId_crmModule_crmRecordId_checksum_key"
  ON "DocumentCrmAttachment"("portalDocumentId", "crmModule", "crmRecordId", "checksum");
