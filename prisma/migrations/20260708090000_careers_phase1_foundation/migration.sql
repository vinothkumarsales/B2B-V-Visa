-- Careers Phase 1 foundation: standalone SaaS shell and local persisted domain model.
CREATE TYPE "CareerCandidateStatus" AS ENUM (
  'onboarding_started',
  'profile_processing',
  'profile_needs_information',
  'profile_ready',
  'payment_pending',
  'subscription_active',
  'blocked',
  'closed'
);

CREATE TYPE "CareerResumeStatus" AS ENUM (
  'uploaded',
  'approved_for_processing',
  'rejected'
);

CREATE TYPE "CareerServicePackageCode" AS ENUM (
  'EUROPE_JOB_SEARCH_ASSIST',
  'EUROPE_JOB_SEARCH_PRO',
  'EUROPE_JOB_SEARCH_PREMIUM'
);

CREATE TABLE "CareerCandidate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "CareerCandidateStatus" NOT NULL DEFAULT 'onboarding_started',
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "currentCountry" TEXT,
  "nationality" TEXT,
  "currentTitle" TEXT,
  "experienceYears" INTEGER,
  "assignedConsultantName" TEXT,
  "assignedConsultantEmail" TEXT,
  "profileCompletionPercent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerSearchPreference" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "targetRegion" TEXT,
  "targetCountries" JSONB NOT NULL,
  "targetRoles" JSONB NOT NULL,
  "excludedRoles" JSONB NOT NULL,
  "workModes" JSONB NOT NULL,
  "salaryExpectation" TEXT,
  "sponsorshipRequired" BOOLEAN,
  "relocationRequired" BOOLEAN,
  "minimumFitScore" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
  "portalPreferences" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerSearchPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerResume" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" "CareerResumeStatus" NOT NULL DEFAULT 'uploaded',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerResume_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerServiceRequest" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "packageCode" "CareerServicePackageCode" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "paymentStatus" TEXT NOT NULL DEFAULT 'not_started',
  "activationStatus" TEXT NOT NULL DEFAULT 'not_started',
  "dashboardStatus" TEXT NOT NULL DEFAULT 'Payment pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerStatusEvent" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "status" "CareerCandidateStatus" NOT NULL,
  "label" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerSearchPreference_candidateId_key" ON "CareerSearchPreference"("candidateId");
CREATE UNIQUE INDEX "CareerResume_candidateId_version_key" ON "CareerResume"("candidateId", "version");
CREATE INDEX "CareerCandidate_userId_status_idx" ON "CareerCandidate"("userId", "status");
CREATE INDEX "CareerCandidate_email_idx" ON "CareerCandidate"("email");
CREATE INDEX "CareerResume_candidateId_status_idx" ON "CareerResume"("candidateId", "status");
CREATE INDEX "CareerServiceRequest_candidateId_status_idx" ON "CareerServiceRequest"("candidateId", "status");
CREATE INDEX "CareerStatusEvent_candidateId_createdAt_idx" ON "CareerStatusEvent"("candidateId", "createdAt");

ALTER TABLE "CareerCandidate" ADD CONSTRAINT "CareerCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerSearchPreference" ADD CONSTRAINT "CareerSearchPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerResume" ADD CONSTRAINT "CareerResume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerServiceRequest" ADD CONSTRAINT "CareerServiceRequest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerStatusEvent" ADD CONSTRAINT "CareerStatusEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
