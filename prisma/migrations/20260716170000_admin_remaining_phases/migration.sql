ALTER TABLE "VisaApplication"
  ADD COLUMN "createdByAdminUid" TEXT,
  ADD COLUMN "submittedByAdminUid" TEXT,
  ADD COLUMN "createdOnBehalfOfUid" TEXT,
  ADD COLUMN "adminSupportSessionId" TEXT,
  ADD COLUMN "adminSubmissionReason" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3);

CREATE TABLE "ApplicationStatusConfigVersion" (
  "id" TEXT NOT NULL,
  "statusConfigId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "AdminContentStatus" NOT NULL DEFAULT 'draft',
  "snapshot" JSONB NOT NULL,
  "createdByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationStatusConfigVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationStatusConfigVersion_statusConfigId_version_key" ON "ApplicationStatusConfigVersion"("statusConfigId", "version");
CREATE INDEX "ApplicationStatusConfigVersion_status_createdAt_idx" ON "ApplicationStatusConfigVersion"("status", "createdAt");
ALTER TABLE "ApplicationStatusConfigVersion" ADD CONSTRAINT "ApplicationStatusConfigVersion_statusConfigId_fkey" FOREIGN KEY ("statusConfigId") REFERENCES "ApplicationStatusConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
