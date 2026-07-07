-- CreateEnum
CREATE TYPE "AdminContentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "DashboardSectionType" AS ENUM ('welcome', 'quick_actions', 'summary_cards', 'recent_applications', 'wallet_summary', 'featured_visas', 'featured_services', 'partner_offers', 'referral_program', 'support', 'announcements', 'important_updates');

-- CreateTable
CREATE TABLE "DashboardSection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DashboardSectionType" NOT NULL,
    "status" "AdminContentStatus" NOT NULL DEFAULT 'draft',
    "targetAudience" JSONB NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedByUserId" TEXT,
    "lastPublishedAt" TIMESTAMP(3),
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSectionVersion" (
    "id" TEXT NOT NULL,
    "dashboardSectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AdminContentStatus" NOT NULL DEFAULT 'draft',
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardSectionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardAudienceRule" (
    "id" TEXT NOT NULL,
    "dashboardSectionId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAudienceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusConfig" (
    "id" TEXT NOT NULL,
    "code" "ApplicationStatus" NOT NULL,
    "adminLabel" TEXT NOT NULL,
    "partnerLabel" TEXT NOT NULL,
    "partnerDescription" TEXT,
    "internalDescription" TEXT,
    "icon" TEXT,
    "colorToken" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "progressPercent" INTEGER NOT NULL,
    "isPartnerVisible" BOOLEAN NOT NULL DEFAULT true,
    "isAdminVisible" BOOLEAN NOT NULL DEFAULT true,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "isSuccess" BOOLEAN NOT NULL DEFAULT false,
    "isFailure" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentStatusEffect" TEXT,
    "documentStatusEffect" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationStatusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationMilestone" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "progressPercent" INTEGER NOT NULL,
    "isPartnerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusTransition" (
    "id" TEXT NOT NULL,
    "fromStatusCode" "ApplicationStatus" NOT NULL,
    "toStatusCode" "ApplicationStatus" NOT NULL,
    "requiredRole" TEXT,
    "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
    "requiresDocuments" BOOLEAN NOT NULL DEFAULT false,
    "requiresNotes" BOOLEAN NOT NULL DEFAULT false,
    "partnerNotification" BOOLEAN NOT NULL DEFAULT false,
    "internalNotification" BOOLEAN NOT NULL DEFAULT false,
    "crmSync" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationStatusTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusMapping" (
    "id" TEXT NOT NULL,
    "statusCode" "ApplicationStatus" NOT NULL,
    "milestoneId" TEXT,
    "zohoModule" TEXT,
    "zohoField" TEXT,
    "zohoStatusValue" TEXT,
    "supplierStatus" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'PORTAL_SOURCE_OF_TRUTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationStatusMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationSlaRule" (
    "id" TEXT NOT NULL,
    "statusCode" "ApplicationStatus" NOT NULL,
    "countryCode" TEXT,
    "visaProductId" TEXT,
    "expectedDurationHours" INTEGER NOT NULL,
    "warningAfterHours" INTEGER NOT NULL,
    "overdueAfterHours" INTEGER NOT NULL,
    "escalationRecipient" TEXT,
    "partnerNotification" BOOLEAN NOT NULL DEFAULT false,
    "operationsNotification" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationSlaRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardSection_key_key" ON "DashboardSection"("key");

-- CreateIndex
CREATE INDEX "DashboardSection_status_displayOrder_idx" ON "DashboardSection"("status", "displayOrder");

-- CreateIndex
CREATE INDEX "DashboardSection_type_isVisible_idx" ON "DashboardSection"("type", "isVisible");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardSectionVersion_dashboardSectionId_version_key" ON "DashboardSectionVersion"("dashboardSectionId", "version");

-- CreateIndex
CREATE INDEX "DashboardAudienceRule_dashboardSectionId_ruleType_idx" ON "DashboardAudienceRule"("dashboardSectionId", "ruleType");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationStatusConfig_code_key" ON "ApplicationStatusConfig"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMilestone_key_key" ON "ApplicationMilestone"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationStatusTransition_fromStatusCode_toStatusCode_key" ON "ApplicationStatusTransition"("fromStatusCode", "toStatusCode");

-- CreateIndex
CREATE INDEX "ApplicationStatusMapping_statusCode_idx" ON "ApplicationStatusMapping"("statusCode");

-- CreateIndex
CREATE INDEX "ApplicationSlaRule_statusCode_countryCode_idx" ON "ApplicationSlaRule"("statusCode", "countryCode");

-- AddForeignKey
ALTER TABLE "DashboardSectionVersion" ADD CONSTRAINT "DashboardSectionVersion_dashboardSectionId_fkey" FOREIGN KEY ("dashboardSectionId") REFERENCES "DashboardSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardAudienceRule" ADD CONSTRAINT "DashboardAudienceRule_dashboardSectionId_fkey" FOREIGN KEY ("dashboardSectionId") REFERENCES "DashboardSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusTransition" ADD CONSTRAINT "ApplicationStatusTransition_fromStatusCode_fkey" FOREIGN KEY ("fromStatusCode") REFERENCES "ApplicationStatusConfig"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusTransition" ADD CONSTRAINT "ApplicationStatusTransition_toStatusCode_fkey" FOREIGN KEY ("toStatusCode") REFERENCES "ApplicationStatusConfig"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusMapping" ADD CONSTRAINT "ApplicationStatusMapping_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "ApplicationStatusConfig"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusMapping" ADD CONSTRAINT "ApplicationStatusMapping_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ApplicationMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSlaRule" ADD CONSTRAINT "ApplicationSlaRule_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "ApplicationStatusConfig"("code") ON DELETE CASCADE ON UPDATE CASCADE;

