-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppMode" AS ENUM ('demo', 'production');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('AGENCY_OWNER', 'AGENCY_ADMIN', 'AGENCY_OPERATOR', 'AGENCY_FINANCE', 'AGENCY_VIEWER', 'ACCOUNT_MANAGER', 'VVISAS_OPERATIONS', 'VVISAS_FINANCE', 'VVISAS_ADMIN');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('DRAFT', 'EMAIL_VERIFICATION_PENDING', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'DOCUMENTS_PENDING', 'READY_FOR_REVIEW', 'UNDER_INTERNAL_REVIEW', 'PAYMENT_PENDING', 'PAID', 'SUBMISSION_PENDING', 'SUBMITTED', 'PROCESSING', 'ADDITIONAL_DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'EXTRACTION_PENDING', 'EXTRACTED', 'EXTRACTION_FAILED', 'MANUAL_REVIEW_REQUIRED', 'VERIFIED', 'OCR_PENDING', 'OCR_COMPLETE', 'USER_CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WalletLedgerType" AS ENUM ('DEPOSIT_PENDING', 'DEPOSIT_CONFIRMED', 'APPLICATION_DEBIT', 'APPLICATION_REVERSAL', 'REFUND_CREDIT', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_COMPLETED', 'WITHDRAWAL_RELEASED', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'PROVIDER_SESSION_CREATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('ZOHO_CRM', 'ZOHO_PAYMENTS', 'DIGIO');

-- CreateEnum
CREATE TYPE "IntegrationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'COMPLETED', 'SYNCED', 'FAILED', 'NEEDS_REVIEW', 'MANUAL_REVIEW_REQUIRED', 'FAILED_TERMINAL');

-- CreateEnum
CREATE TYPE "VisaInterestStatus" AS ENUM ('SEARCHED', 'SELECTED', 'DETAILS_STARTED', 'CHECKLIST_VIEWED', 'PAYMENT_STARTED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'APPLICATION_CREATED', 'CONVERTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CatalogueReviewStatus" AS ENUM ('EXTRACTED', 'NORMALIZED', 'REVIEW_REQUIRED', 'CONFLICT_REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CatalogueChangeType" AS ENUM ('NEW_PRODUCT', 'PRICE_CHANGED', 'DOCUMENTS_CHANGED', 'PROCESSING_TIME_CHANGED', 'COURIER_RULE_CHANGED', 'CITY_ROUTING_CHANGED', 'PRODUCT_REMOVED', 'NO_CHANGE', 'CONTENT_CHANGED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'catalog_admin', 'operations_admin', 'finance_admin', 'support_admin');

-- CreateEnum
CREATE TYPE "AdminImpersonationMode" AS ENUM ('view_only', 'support', 'operations');

-- CreateEnum
CREATE TYPE "AdminSessionStatus" AS ENUM ('active', 'expired', 'revoked', 'ended');

-- CreateEnum
CREATE TYPE "PartnerPriceOverrideStatus" AS ENUM ('draft', 'active', 'expired', 'archived');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "status" "AgencyStatus" NOT NULL DEFAULT 'DRAFT',
    "gstNumber" TEXT,
    "panCard" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "zohoRecordId" TEXT,
    "syncStatus" "IntegrationEventStatus",
    "lastSyncedAt" TIMESTAMP(3),
    "syncErrorCode" TEXT,
    "syncAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyVerification" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "status" "AgencyStatus" NOT NULL DEFAULT 'DOCUMENTS_PENDING',
    "digioRequestId" TEXT,
    "digioVerificationStatus" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaProduct" (
    "id" TEXT NOT NULL,
    "countryId" TEXT,
    "destination" TEXT NOT NULL,
    "destinationCode" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entry" TEXT NOT NULL,
    "entryType" TEXT,
    "visaKind" TEXT,
    "purpose" TEXT,
    "nationalityEligibility" JSONB,
    "validity" TEXT NOT NULL,
    "visaValidityDays" INTEGER,
    "duration" TEXT NOT NULL,
    "maximumStayDays" INTEGER,
    "processingTime" TEXT NOT NULL,
    "processingTimeMinDays" INTEGER,
    "processingTimeMaxDays" INTEGER,
    "processingTimeLabel" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amountMinor" INTEGER NOT NULL,
    "documents" JSONB NOT NULL,
    "minimumPassportValidityMonths" INTEGER,
    "passportValidityRuleCode" TEXT,
    "cutoffTime" TEXT,
    "pricingVersion" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'support_admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminImpersonationSession" (
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

    CONSTRAINT "AdminImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPriceOverride" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaProductVersion" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reviewStatus" "CatalogueReviewStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaProductVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaDocumentRequirement" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "appliesToAdult" BOOLEAN NOT NULL DEFAULT true,
    "appliesToMinor" BOOLEAN NOT NULL DEFAULT true,
    "appliesToStickerVisa" BOOLEAN NOT NULL DEFAULT false,
    "appliesToEVisa" BOOLEAN NOT NULL DEFAULT false,
    "uploadRequired" BOOLEAN NOT NULL DEFAULT true,
    "physicalOriginalRequired" BOOLEAN NOT NULL DEFAULT false,
    "courierRequired" BOOLEAN NOT NULL DEFAULT false,
    "sampleAvailable" BOOLEAN NOT NULL DEFAULT false,
    "requirementStatus" "CatalogueReviewStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "notes" TEXT,

    CONSTRAINT "VisaDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaProcessingOption" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minDays" INTEGER,
    "maxDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VisaProcessingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaPrice" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "visaFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "vvisaServiceFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "courierFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "insuranceFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "convenienceFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "otherFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "gstMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "VisaPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaPriceLine" (
    "id" TEXT NOT NULL,
    "visaPriceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VisaPriceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationPricingSnapshot" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalAmountMinor" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationPricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationPricingLine" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApplicationPricingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StickerVisaRoute" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "originCityCode" TEXT NOT NULL,
    "originCityLabel" TEXT NOT NULL,
    "processingCentreCity" TEXT NOT NULL,
    "processingCentreAddress" TEXT,
    "courierFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "serviceFeeAdjustmentMinor" INTEGER NOT NULL DEFAULT 0,
    "estimatedOutboundDays" INTEGER,
    "estimatedReturnDays" INTEGER,
    "deliveryInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StickerVisaRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaCourierRule" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "physicalSubmissionRequired" BOOLEAN NOT NULL DEFAULT false,
    "courierRequired" BOOLEAN NOT NULL DEFAULT false,
    "courierDirection" TEXT NOT NULL,
    "submissionCentreName" TEXT,
    "submissionAddress" TEXT,
    "submissionCity" TEXT,
    "returnCourierAvailable" BOOLEAN NOT NULL DEFAULT false,
    "returnCourierFeeMinor" INTEGER,
    "outboundCourierFeeMinor" INTEGER,
    "courierInstructions" TEXT,
    "passportCollectionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "passportCollectionCities" JSONB,

    CONSTRAINT "VisaCourierRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaPassportValidityRule" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "minimumPassportValidityMonths" INTEGER NOT NULL,
    "passportValidityRule" TEXT NOT NULL,
    "blocksWhenViolated" BOOLEAN NOT NULL DEFAULT false,
    "manualReviewWhenUnknown" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VisaPassportValidityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductReference" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "sourceCapturedAt" TIMESTAMP(3) NOT NULL,
    "sourceLastCheckedAt" TIMESTAMP(3) NOT NULL,
    "sourceReference" TEXT,
    "normalizedHash" TEXT NOT NULL,
    "reviewStatus" "CatalogueReviewStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierProductReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierImportBatch" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "sourceFile" TEXT,
    "status" "CatalogueReviewStatus" NOT NULL DEFAULT 'EXTRACTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierImportRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "visaProductId" TEXT,
    "supplier" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "normalizedHash" TEXT NOT NULL,
    "changeType" "CatalogueChangeType" NOT NULL,
    "reviewStatus" "CatalogueReviewStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "normalizedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueReviewDecision" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "recordId" TEXT,
    "decision" "CatalogueReviewStatus" NOT NULL,
    "reason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogueReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaApplication" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "internalId" TEXT,
    "destination" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "pricingSnapshot" JSONB NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "zohoRecordId" TEXT,
    "syncStatus" "IntegrationEventStatus",
    "lastSyncedAt" TIMESTAMP(3),
    "syncErrorCode" TEXT,
    "syncAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Indian',
    "sex" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "placeOfIssue" TEXT,
    "maritalStatus" TEXT,
    "dateOfIssue" TIMESTAMP(3),
    "dateOfExpiry" TIMESTAMP(3),
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "visaProductId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "applicationId" TEXT,
    "applicantId" TEXT,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrExtraction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'DIGIO',
    "providerRequestId" TEXT,
    "rawExtraction" JSONB NOT NULL,
    "normalizedExtraction" JSONB NOT NULL,
    "confidence" TEXT,
    "userCorrections" JSONB,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "previousStatus" "ApplicationStatus",
    "nextStatus" "ApplicationStatus" NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "applicationId" TEXT,
    "paymentOrderId" TEXT,
    "type" "WalletLedgerType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "applicationId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'ZOHO_PAYMENTS',
    "providerOrderId" TEXT,
    "providerSessionUrl" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'ZOHO_PAYMENTS',
    "providerPaymentId" TEXT,
    "webhookEventId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "rawWebhook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "aggregateId" TEXT,
    "correlationId" TEXT,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadHash" TEXT,
    "payload" JSONB NOT NULL,
    "status" "IntegrationEventStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorCategory" TEXT,
    "providerRecordId" TEXT,
    "completedAt" TIMESTAMP(3),
    "externalRecordId" TEXT,
    "syncErrorCode" TEXT,
    "syncAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmEntityMapping" (
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

    CONSTRAINT "CrmEntityMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaInterest" (
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

    CONSTRAINT "VisaInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCrmAttachment" (
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

    CONSTRAINT "DocumentCrmAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_email_key" ON "Agency"("email");

-- CreateIndex
CREATE INDEX "AgencyMembership_agencyId_role_idx" ON "AgencyMembership"("agencyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_userId_agencyId_key" ON "AgencyMembership"("userId", "agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyVerification_agencyId_key" ON "AgencyVerification"("agencyId");

-- CreateIndex
CREATE INDEX "VisaProduct_destination_isActive_idx" ON "VisaProduct"("destination", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE INDEX "AdminImpersonationSession_actorAdminUid_status_idx" ON "AdminImpersonationSession"("actorAdminUid", "status");

-- CreateIndex
CREATE INDEX "AdminImpersonationSession_subjectAgencyId_status_idx" ON "AdminImpersonationSession"("subjectAgencyId", "status");

-- CreateIndex
CREATE INDEX "PartnerPriceOverride_partnerUid_status_idx" ON "PartnerPriceOverride"("partnerUid", "status");

-- CreateIndex
CREATE INDEX "PartnerPriceOverride_productId_status_idx" ON "PartnerPriceOverride"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VisaProductVersion_visaProductId_version_key" ON "VisaProductVersion"("visaProductId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationPricingSnapshot_applicationId_key" ON "ApplicationPricingSnapshot"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProductReference_supplier_supplierProductId_key" ON "SupplierProductReference"("supplier", "supplierProductId");

-- CreateIndex
CREATE INDEX "VisaApplication_agencyId_status_idx" ON "VisaApplication"("agencyId", "status");

-- CreateIndex
CREATE INDEX "ApplicationDocument_agencyId_applicationId_idx" ON "ApplicationDocument"("agencyId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_agencyId_currency_key" ON "Wallet"("agencyId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_idempotencyKey_key" ON "PaymentOrder"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_webhookEventId_key" ON "PaymentTransaction"("webhookEventId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_idempotencyKey_key" ON "IntegrationEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IntegrationEvent_status_nextAttemptAt_idx" ON "IntegrationEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "IntegrationEvent_entityType_entityId_idx" ON "IntegrationEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_aggregateId_idx" ON "IntegrationEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "CrmEntityMapping_zohoModule_zohoRecordId_idx" ON "CrmEntityMapping"("zohoModule", "zohoRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmEntityMapping_portalEntityType_portalEntityId_zohoModule_key" ON "CrmEntityMapping"("portalEntityType", "portalEntityId", "zohoModule");

-- CreateIndex
CREATE INDEX "VisaInterest_agencyId_status_idx" ON "VisaInterest"("agencyId", "status");

-- CreateIndex
CREATE INDEX "VisaInterest_agencyId_searchSessionId_countryName_visaTypeI_idx" ON "VisaInterest"("agencyId", "searchSessionId", "countryName", "visaTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCrmAttachment_portalDocumentId_crmModule_crmRecordI_key" ON "DocumentCrmAttachment"("portalDocumentId", "crmModule", "crmRecordId", "checksum");

-- CreateIndex
CREATE INDEX "AuditLog_agencyId_resourceType_resourceId_idx" ON "AuditLog"("agencyId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyVerification" ADD CONSTRAINT "AgencyVerification_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaProduct" ADD CONSTRAINT "VisaProduct_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminImpersonationSession" ADD CONSTRAINT "AdminImpersonationSession_subjectAgencyId_fkey" FOREIGN KEY ("subjectAgencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPriceOverride" ADD CONSTRAINT "PartnerPriceOverride_partnerUid_fkey" FOREIGN KEY ("partnerUid") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPriceOverride" ADD CONSTRAINT "PartnerPriceOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaProductVersion" ADD CONSTRAINT "VisaProductVersion_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaDocumentRequirement" ADD CONSTRAINT "VisaDocumentRequirement_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaProcessingOption" ADD CONSTRAINT "VisaProcessingOption_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaPrice" ADD CONSTRAINT "VisaPrice_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaPriceLine" ADD CONSTRAINT "VisaPriceLine_visaPriceId_fkey" FOREIGN KEY ("visaPriceId") REFERENCES "VisaPrice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPricingSnapshot" ADD CONSTRAINT "ApplicationPricingSnapshot_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPricingLine" ADD CONSTRAINT "ApplicationPricingLine_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ApplicationPricingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerVisaRoute" ADD CONSTRAINT "StickerVisaRoute_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaCourierRule" ADD CONSTRAINT "VisaCourierRule_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaPassportValidityRule" ADD CONSTRAINT "VisaPassportValidityRule_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductReference" ADD CONSTRAINT "SupplierProductReference_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierImportRecord" ADD CONSTRAINT "SupplierImportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SupplierImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierImportRecord" ADD CONSTRAINT "SupplierImportRecord_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueReviewDecision" ADD CONSTRAINT "CatalogueReviewDecision_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SupplierImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_visaProductId_fkey" FOREIGN KEY ("visaProductId") REFERENCES "VisaProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtraction" ADD CONSTRAINT "OcrExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEntityMapping" ADD CONSTRAINT "CrmEntityMapping_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaInterest" ADD CONSTRAINT "VisaInterest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaInterest" ADD CONSTRAINT "VisaInterest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCrmAttachment" ADD CONSTRAINT "DocumentCrmAttachment_portalDocumentId_fkey" FOREIGN KEY ("portalDocumentId") REFERENCES "ApplicationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

